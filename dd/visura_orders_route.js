const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { notifyDiscord, notifyEmail } = require('../services/notify');
const cloudinary = require('../lib/cloudinary');

// ── POST /api/orders — Submit order + payment proof ──────────
router.post('/', async (req, res) => {
  try {
    const { name, email, product, amount, upiRef, proofBase64, proofMime, type, itemId } = req.body;
    if (!name || !email || !product || !amount || !upiRef)
      return res.status(400).json({ error: 'Missing required fields' });

    // Upload proof image to Cloudinary
    let proofUrl = null;
    if (proofBase64) {
      const upload = await cloudinary.uploader.upload(
        `data:${proofMime};base64,${proofBase64}`,
        { folder: 'visura/proofs', resource_type: 'image' }
      );
      proofUrl = upload.secure_url;
    }

    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_id: orderId, name, email, product, amount,
        upi_ref: upiRef, proof_url: proofUrl,
        type, item_id: itemId, status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Notify admin via Discord + Email
    await notifyDiscord({
      title: `🛒 New Payment — ${orderId}`,
      color: 0xf59e0b,
      fields: [
        { name: 'Customer', value: name, inline: true },
        { name: 'Email', value: email, inline: true },
        { name: 'Product', value: product, inline: true },
        { name: 'Amount', value: `₹${amount}`, inline: true },
        { name: 'UPI Ref', value: upiRef, inline: true },
        { name: 'Proof', value: proofUrl ? `[View Image](${proofUrl})` : 'No image', inline: true }
      ]
    });

    await notifyEmail({
      subject: `New Order — ${orderId}`,
      html: `<h2>New payment from ${name}</h2>
             <p><b>Product:</b> ${product}<br>
             <b>Amount:</b> ₹${amount}<br>
             <b>UPI Ref:</b> ${upiRef}<br>
             ${proofUrl ? `<b>Proof:</b> <a href="${proofUrl}">View Screenshot</a>` : ''}</p>`
    });

    res.json({ success: true, orderId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Order submission failed' });
  }
});

// ── GET /api/orders — Admin: list all orders ─────────────────
router.get('/', auth(['admin']), async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch orders' });
  res.json(data);
});

// ── PATCH /api/orders/:id — Admin: approve/reject ────────────
router.patch('/:id', auth(['admin']), async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const { data: order } = await supabase.from('orders').select('*').eq('order_id', req.params.id).single();
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await supabase.from('orders').update({ status, admin_note: note, actioned_at: new Date() }).eq('order_id', req.params.id);

    // Activate subscription if approved
    if (status === 'approved' && order.type === 'subscription') {
      const { data: user } = await supabase.from('users').select('id').eq('email', order.email).single();
      if (user) {
        const expires = new Date();
        expires.setMonth(expires.getMonth() + 1);
        await supabase.from('subscriptions').upsert({
          user_id: user.id, status: 'active',
          plan: 'monthly', expires_at: expires.toISOString()
        });
      }
    }

    // Notify customer via Discord
    await notifyDiscord({
      title: status === 'approved' ? `✅ Order Approved — ${order.order_id}` : `❌ Order Rejected — ${order.order_id}`,
      color: status === 'approved' ? 0x22c55e : 0xef4444,
      fields: [
        { name: 'Customer', value: order.name, inline: true },
        { name: 'Product', value: order.product, inline: true },
        { name: 'Note', value: note || '—', inline: false }
      ]
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── GET /api/orders/my — Client: check own order status ──────
router.get('/my', auth(['client']), async (req, res) => {
  const { data } = await supabase.from('orders').select('order_id,product,amount,status,created_at').eq('email', req.user.email).order('created_at', { ascending: false });
  res.json(data || []);
});

module.exports = router;

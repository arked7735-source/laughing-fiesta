// ── admin.js ─────────────────────────────────────────────────
const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const bcrypt = require('bcryptjs');

// List all clients
router.get('/clients', auth(['admin']), async (req, res) => {
  const { data } = await supabase.from('users').select('id,name,email,role,created_at').eq('role','client').order('created_at',{ascending:false});
  res.json(data||[]);
});

// Delete client
router.delete('/clients/:id', auth(['admin']), async (req, res) => {
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// Change admin password
router.post('/change-password', auth(['admin']), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });
  const hash = await bcrypt.hash(newPassword, 12);
  await supabase.from('users').update({ password_hash: hash }).eq('id', req.user.id);
  res.json({ success: true });
});

// Dashboard stats
router.get('/stats', auth(['admin']), async (req, res) => {
  const [clients, orders, projects] = await Promise.all([
    supabase.from('users').select('id',{count:'exact'}).eq('role','client'),
    supabase.from('orders').select('status,amount'),
    supabase.from('projects').select('id',{count:'exact'})
  ]);
  const revenue = (orders.data||[]).filter(o=>o.status==='approved').reduce((a,o)=>a+Number(o.amount),0);
  const pending = (orders.data||[]).filter(o=>o.status==='pending').length;
  res.json({
    totalClients: clients.count||0,
    totalProjects: projects.count||0,
    totalRevenue: revenue,
    pendingOrders: pending
  });
});

module.exports = router;

// ── store.js ─────────────────────────────────────────────────
// Save to: server/routes/store.js
const storeRouter = require('express').Router();
const storeAuth = require('../middleware/auth');
const storeDb = require('../lib/supabase');

storeRouter.get('/', async (req, res) => {
  const { data } = await storeDb.from('store_items').select('*').order('featured',{ascending:false}).order('created_at',{ascending:false});
  res.json(data||[]);
});
storeRouter.post('/', storeAuth(['admin']), async (req, res) => {
  const { name, category, price, imageUrl, emoji, rating, featured } = req.body;
  const { data, error } = await storeDb.from('store_items').insert({ name, category, price, image_url: imageUrl, emoji, rating: rating||5, featured: featured||false }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
storeRouter.patch('/:id', storeAuth(['admin']), async (req, res) => {
  const { data } = await storeDb.from('store_items').update(req.body).eq('id', req.params.id).select().single();
  res.json(data);
});
storeRouter.delete('/:id', storeAuth(['admin']), async (req, res) => {
  await storeDb.from('store_items').delete().eq('id', req.params.id);
  res.json({ success: true });
});
// Export storeRouter separately — in index.js: app.use('/api/store', require('./routes/store'))

// ── portfolio.js ──────────────────────────────────────────────
// Save to: server/routes/portfolio.js
const portRouter = require('express').Router();
const portAuth = require('../middleware/auth');
const portDb = require('../lib/supabase');

portRouter.get('/', async (req, res) => {
  const { data } = await portDb.from('portfolio_items').select('*').order('sort_order').order('created_at',{ascending:false});
  res.json(data||[]);
});
portRouter.post('/', portAuth(['admin']), async (req, res) => {
  const { title, category, videoUrl, thumbnailUrl, description } = req.body;
  const { data, error } = await portDb.from('portfolio_items').insert({ title, category, video_url: videoUrl, thumbnail_url: thumbnailUrl, description }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
portRouter.delete('/:id', portAuth(['admin']), async (req, res) => {
  await portDb.from('portfolio_items').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// ── site.js ───────────────────────────────────────────────────
// Save to: server/routes/site.js
const siteRouter = require('express').Router();
const siteAuth = require('../middleware/auth');
const siteDb = require('../lib/supabase');

siteRouter.get('/config', async (req, res) => {
  const { data } = await siteDb.from('site_config').select('*').eq('id', 1).single();
  res.json(data?.config || {});
});
siteRouter.post('/config', siteAuth(['admin']), async (req, res) => {
  const { data, error } = await siteDb.from('site_config').upsert({ id: 1, config: req.body, updated_at: new Date() }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

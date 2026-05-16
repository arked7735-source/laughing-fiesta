const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = sign({ id: user.id, email: user.email, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/register (admin-only, creates clients) ────
router.post('/register', require('../middleware/auth')(['admin']), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email: email.toLowerCase().trim(), password_hash: hash, role: 'client' })
      .select('id, name, email, role')
      .single();

    if (error) return res.status(400).json({ error: 'User already exists or DB error' });
    res.json({ user: data });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/change-password ──────────────────────────
router.post('/change-password', require('../middleware/auth')(['admin', 'client']), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single();
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash: hash }).eq('id', req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', require('../middleware/auth')(['admin', 'client']), async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');

// ── GET /api/projects/mine — Client: get own projects ────────
router.get('/mine', auth(['client']), async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, markers(*), chat_messages(*)')
    .eq('client_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to load projects' });
  res.json(data);
});

// ── GET /api/projects — Admin: all projects ──────────────────
router.get('/', auth(['admin']), async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, users(name,email), markers(*), chat_messages(*)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to load projects' });
  res.json(data);
});

// ── POST /api/projects — Admin: create project ───────────────
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { clientEmail, name, description, status, videoLink, allowDownload } = req.body;
    const { data: client } = await supabase.from('users').select('id').eq('email', clientEmail).single();
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { data, error } = await supabase
      .from('projects')
      .insert({ client_id: client.id, name, description, status, video_link: videoLink, allow_download: allowDownload })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ── PATCH /api/projects/:id — Admin: update project ──────────
router.patch('/:id', auth(['admin']), async (req, res) => {
  const { name, description, status, videoLink, allowDownload } = req.body;
  const { data, error } = await supabase
    .from('projects')
    .update({ name, description, status, video_link: videoLink, allow_download: allowDownload, updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Update failed' });
  res.json(data);
});

// ── DELETE /api/projects/:id — Admin ─────────────────────────
router.delete('/:id', auth(['admin']), async (req, res) => {
  await supabase.from('projects').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// ─── MARKERS ────────────────────────────────────────────────

// GET /api/projects/:id/markers
router.get('/:id/markers', auth(['admin', 'client']), async (req, res) => {
  const { data } = await supabase.from('markers').select('*').eq('project_id', req.params.id).order('time_seconds');
  res.json(data || []);
});

// POST /api/projects/:id/markers
router.post('/:id/markers', auth(['admin', 'client']), async (req, res) => {
  const { timeSeconds, text, color } = req.body;
  const { data, error } = await supabase.from('markers').insert({
    project_id: req.params.id,
    time_seconds: timeSeconds,
    text, color,
    author_name: req.user.name,
    author_id: req.user.id
  }).select().single();
  if (error) return res.status(500).json({ error: 'Failed to add marker' });
  res.json(data);
});

// DELETE /api/projects/:id/markers/:markerId
router.delete('/:id/markers/:markerId', auth(['admin', 'client']), async (req, res) => {
  await supabase.from('markers').delete().eq('id', req.params.markerId);
  res.json({ success: true });
});

// ─── CHAT ────────────────────────────────────────────────────

// GET /api/projects/:id/chat
router.get('/:id/chat', auth(['admin', 'client']), async (req, res) => {
  const { data } = await supabase.from('chat_messages').select('*').eq('project_id', req.params.id).order('created_at');
  res.json(data || []);
});

// POST /api/projects/:id/chat
router.post('/:id/chat', auth(['admin', 'client']), async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Empty message' });
  const { data, error } = await supabase.from('chat_messages').insert({
    project_id: req.params.id,
    author_id: req.user.id,
    author_name: req.user.name,
    author_role: req.user.role,
    message: message.trim()
  }).select().single();
  if (error) return res.status(500).json({ error: 'Failed to send' });
  res.json(data);
});

module.exports = router;

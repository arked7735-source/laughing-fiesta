// AI API keys NEVER reach the browser — all calls go through here
const router = require('express').Router();
const auth = require('../middleware/auth');

const TOOL_PROMPTS = {
  photo_upscale: 'You are an AI photo upscaling assistant. In 2-3 sentences describe what happens during upscaling: sharpened edges, recovered texture detail, enhanced micro-contrast, reduced aliasing. Be specific and technical.',
  video_upscale: 'You are an AI video upscaling assistant. In 2-3 sentences describe frame-by-frame reconstruction, temporal consistency, and motion handling during upscaling.',
  bg_remove: 'You are an AI background removal assistant. In 2-3 sentences describe the segmentation process: edge detection, hair/fur refinement, transparency mapping.',
  lut_preview: 'You are a color grading assistant. In 2-3 sentences describe what a selected cinematic LUT does: tonal shifts, shadow lift, highlight roll-off, color cast.',
  format_convert: 'You are a video format conversion assistant. In 2-3 sentences describe codec transcoding and quality trade-offs for different containers.',
  noise_reduce: 'You are an AI noise reduction assistant. In 2-3 sentences describe the denoising process: luminance noise, chrominance noise, texture preservation trade-offs.',
};

// Requires active subscription to use tools
router.post('/tool', auth(['admin', 'client']), async (req, res) => {
  try {
    const { toolType } = req.body;
    if (!TOOL_PROMPTS[toolType]) return res.status(400).json({ error: 'Unknown tool type' });

    // Check subscription (skip for admin)
    if (req.user.role !== 'admin') {
      const supabase = require('../lib/supabase');
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .single();
      if (!sub) return res.status(403).json({ error: 'Active subscription required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: TOOL_PROMPTS[toolType] }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || 'Processing complete.';
    res.json({ result: text });
  } catch (e) {
    res.status(500).json({ error: 'AI request failed' });
  }
});

// Chat AI reply for client portal
router.post('/chat-reply', auth(['admin', 'client']), async (req, res) => {
  try {
    const { message, projectName } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.json({ reply: 'The production team will respond shortly.' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are a helpful video production assistant for the project "${projectName}". Be concise, professional, and supportive. Keep replies under 2 sentences.`,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Thanks for your message! The production team will review and respond shortly.';
    res.json({ reply });
  } catch (e) {
    res.json({ reply: 'Thanks for your message! We\'ll get back to you shortly.' });
  }
});

module.exports = router;

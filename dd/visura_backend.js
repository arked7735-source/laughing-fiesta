// ============================================================
// VISURA — Production Backend
// Node.js + Express + Supabase
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ── Security middleware ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: 'AI rate limit exceeded' } });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);
app.use('/api/ai/', aiLimiter);

// ── Serve static frontend ────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/ai',      require('./routes/ai'));
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/projects',require('./routes/projects'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/store',   require('./routes/store'));
app.use('/api/portfolio',require('./routes/portfolio'));
app.use('/api/site',    require('./routes/site'));
app.use('/api/upload',  require('./routes/upload'));

// ── Catch-all → serve frontend ───────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VISURA running on port ${PORT}`));

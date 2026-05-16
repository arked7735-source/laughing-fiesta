# ============================================================
# VISURA — Environment Variables
# Copy this file to .env and fill in your values
# NEVER commit .env to GitHub
# ============================================================

# ── Server ───────────────────────────────────────────────────
PORT=3000
FRONTEND_URL=https://yourdomain.com

# ── JWT (generate a long random string) ──────────────────────
# Run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_here_64_chars_minimum

# ── Supabase ─────────────────────────────────────────────────
# From: supabase.com → Project Settings → API
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Anthropic AI ─────────────────────────────────────────────
# From: console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── Cloudinary (for payment proof + media uploads) ───────────
# From: cloudinary.com → Dashboard
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_cloudinary_secret

# ── Gmail (for email notifications) ─────────────────────────
# Use an App Password, NOT your main Gmail password
# Google Account → Security → 2-Step → App Passwords
GMAIL_USER=yourname@gmail.com
GMAIL_PASS=abcd efgh ijkl mnop

# ── Discord (for payment alerts) ─────────────────────────────
# Discord → Server → Channel Settings → Integrations → Webhooks
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy

# ── Admin email (where notifications go) ─────────────────────
ADMIN_EMAIL=admin@yourstudio.com

-- ============================================================
-- VISURA — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  status         TEXT DEFAULT 'progress' CHECK (status IN ('progress','review','done')),
  video_link     TEXT,
  allow_download BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Markers (timestamped feedback) ───────────────────────────
CREATE TABLE IF NOT EXISTS markers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES users(id),
  author_name  TEXT,
  time_seconds REAL NOT NULL,
  text         TEXT NOT NULL,
  color        TEXT DEFAULT '#e24b4a',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chat messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES users(id),
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Orders / Payment proofs ───────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  product     TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  upi_ref     TEXT NOT NULL,
  proof_url   TEXT,
  type        TEXT, -- 'store' | 'subscription' | 'cart'
  item_id     TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note  TEXT,
  actioned_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  plan       TEXT DEFAULT 'monthly',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── Store items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  category  TEXT,
  price     NUMERIC NOT NULL,
  image_url TEXT,
  emoji     TEXT DEFAULT '📦',
  rating    INTEGER DEFAULT 5,
  featured  BOOLEAN DEFAULT FALSE,
  reviews   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Portfolio items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  category      TEXT,
  video_url     TEXT,
  thumbnail_url TEXT,
  description   TEXT,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Site config (key-value) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS site_config (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  config     JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed default admin ────────────────────────────────────────
-- Password: admin123 (change immediately after first login!)
-- bcrypt hash of 'admin123' with 12 rounds:
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin',
  'admin@visura.studio',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewj5p5YjpHO4WrXi',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- ── Seed default store items ──────────────────────────────────
INSERT INTO store_items (name, category, price, emoji, rating, featured, reviews) VALUES
('Cinematic LUT Pack', 'Color Grading', 1299, '🎨', 5, TRUE, 12),
('Drone Footage Pack', 'Stock Video', 2499, '🚁', 4, FALSE, 7),
('Premiere Templates', 'Video Templates', 1799, '🎞', 5, FALSE, 9),
('Ambient SFX Bundle', 'Sound Design', 999, '🎧', 4, FALSE, 5)
ON CONFLICT DO NOTHING;

-- ── Seed site config ──────────────────────────────────────────
INSERT INTO site_config (id, config) VALUES (1, '{
  "name": "VISURA",
  "upi": "visura@upi",
  "hero1": "Crafting stories",
  "heroSub": "Award-winning video production for brands, agencies & creators.",
  "reelLabel": "Watch Showreel 2025",
  "stat1n": "120+", "stat1l": "Projects Delivered",
  "stat2n": "8yr", "stat2l": "Experience",
  "stat3n": "40+", "stat3l": "Happy Clients",
  "email": "hello@visura.studio",
  "location": "Mumbai, India — Global",
  "social": "Instagram · LinkedIn",
  "footer": "© 2025 VISURA Studio. All rights reserved.",
  "aboutTitle": "Hi, I tell stories through film.",
  "aboutBio": "8+ years in commercial video production.",
  "services": "Brand Films,Commercials,Motion Design,Color Grading,Documentary,Social Content",
  "subPrice": 100,
  "subTitle": "Full Toolkit Access",
  "subDesc": "All AI tools — unlimited use per month",
  "hiddenSections": []
}') ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

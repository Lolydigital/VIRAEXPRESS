-- Migration: Create admin tables for VIRAEXPRESS
-- Run this in Supabase SQL Editor

-- 1. Create plan_config table
CREATE TABLE IF NOT EXISTS public.plan_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name TEXT UNIQUE NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_quota INTEGER NOT NULL DEFAULT 0,
  checkout_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plan_config (plan_name, price, image_quota, checkout_url) VALUES
  ('Free', 0, 4, NULL),
  ('Basic', 29, 30, 'https://pay.hotmart.com/YOUR_BASIC_LINK'),
  ('Professional', 79, 100, 'https://pay.hotmart.com/YOUR_PRO_LINK')
ON CONFLICT (plan_name) DO NOTHING;

-- 2. Create app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert WhatsApp config
INSERT INTO app_config (key, value) VALUES
  ('whatsapp', '{"number": "5511999999999", "message": "Olá! Preciso de ajuda com o ViraExpress"}')
ON CONFLICT (key) DO NOTHING;

-- 3. Create image_transactions table (for cost tracking)
CREATE TABLE IF NOT EXISTS public.image_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  idea_id TEXT,
  object_id TEXT,
  image_url TEXT,
  cost_estimate NUMERIC(10,4) DEFAULT 0.22,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_transactions_user ON image_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_image_transactions_created ON image_transactions(created_at);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for admin access
CREATE POLICY "Admin full access to plan_config" ON plan_config
  FOR ALL USING (true);

CREATE POLICY "Admin full access to app_config" ON app_config
  FOR ALL USING (true);

CREATE POLICY "Admin full access to image_transactions" ON image_transactions
  FOR ALL USING (true);

-- 6. Grant permissions
GRANT ALL ON plan_config TO authenticated;
GRANT ALL ON app_config TO authenticated;
GRANT ALL ON image_transactions TO authenticated;

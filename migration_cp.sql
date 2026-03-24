-- Campaign Planner: localStorage → Supabase migration
-- Run this in Supabase SQL Editor

-- 1. Add slug column to users for frontend mapping ('felix'/'arpi' → UUID)
ALTER TABLE users ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
UPDATE users SET slug = 'felix' WHERE display_name = 'Félix';
UPDATE users SET slug = 'arpi' WHERE display_name = 'Árpi';
ALTER TABLE users ALTER COLUMN slug SET NOT NULL;

-- 2. Email accounts table
CREATE TABLE IF NOT EXISTS cp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    daily_limit INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campaigns table
CREATE TABLE IF NOT EXISTS cp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    leads INTEGER NOT NULL DEFAULT 0,
    daily_max_emails INTEGER NOT NULL DEFAULT 0,
    sequences INTEGER NOT NULL DEFAULT 1,
    send_days TEXT[] NOT NULL DEFAULT '{"Mon","Tue","Wed","Thu","Fri"}',
    next_message_days INTEGER NOT NULL DEFAULT 1,
    bounces INTEGER NOT NULL DEFAULT 0,
    replies INTEGER NOT NULL DEFAULT 0,
    email_account_ids UUID[] NOT NULL DEFAULT '{}',
    start_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS with permissive policies (no auth needed)
ALTER TABLE cp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_cp_accounts" ON cp_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_cp_campaigns" ON cp_campaigns FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE cp_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE cp_campaigns;

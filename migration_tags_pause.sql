-- Migration: account tags + weekly campaign pause
-- Run this in Supabase SQL Editor (after migration_cp.sql)

-- 1. Tags table (per user)
CREATE TABLE IF NOT EXISTS cp_account_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'primary',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 2. Add tag_ids array to accounts
ALTER TABLE cp_accounts
    ADD COLUMN IF NOT EXISTS tag_ids UUID[] NOT NULL DEFAULT '{}';

-- 3. Add paused_weeks (Monday ISO dates) to campaigns
ALTER TABLE cp_campaigns
    ADD COLUMN IF NOT EXISTS paused_weeks DATE[] NOT NULL DEFAULT '{}';

-- 4. RLS
ALTER TABLE cp_account_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_cp_account_tags" ON cp_account_tags;
CREATE POLICY "anon_all_cp_account_tags" ON cp_account_tags FOR ALL USING (true) WITH CHECK (true);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cp_account_tags;

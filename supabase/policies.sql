-- =============================================================================
-- RLS diagnostic queries
-- Run these in the Supabase SQL editor to see the current state of policies.
-- =============================================================================

-- Which tables have RLS enabled?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- What policies exist?
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- Proposed policies (apply manually after review)
-- =============================================================================

-- mailing_list: allow anonymous inserts (email capture).
-- Block reads and updates from the browser — only service role reads this table.

ALTER TABLE mailing_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mailing_list: anon insert only"
  ON mailing_list
  FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- user_subscriptions: authenticated users may only read their own row.
-- Writes come exclusively from the stripe-webhook serverless function
-- (service role, bypasses RLS).

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions: select own row"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- Rollback statements (run to undo the policies above)
-- =============================================================================

-- DROP POLICY IF EXISTS "mailing_list: anon insert only" ON mailing_list;
-- ALTER TABLE mailing_list DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "user_subscriptions: select own row" ON user_subscriptions;
-- ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

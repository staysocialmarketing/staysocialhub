-- Fix Phase 4 realtime subscription for agent_status.
--
-- Two problems:
-- 1. agent_status was not in the supabase_realtime publication → no events ever fired.
-- 2. The only SELECT policy required auth.uid() in user_roles — anon (dev preview
--    unauthenticated route) and the realtime server both got silently blocked.

-- ── 1. Add to realtime publication ──────────────────────────────────────────
alter publication supabase_realtime add table agent_status;

-- ── 2. Allow anon + authenticated reads ─────────────────────────────────────
-- agent_status is not sensitive (idle/active/processing labels only).
-- The authenticated route is already gated by isSSRole in the React layer.
-- The dev preview route needs anon read to work during development.
create policy "public read agent_status"
  on agent_status for select
  using (true);

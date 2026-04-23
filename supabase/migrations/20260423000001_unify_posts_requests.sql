-- ============================================================
-- Phase 2: Unify posts + requests data model
--
-- 1. Add source + agent metadata columns to posts
-- 2. Add revision_count for revision badge UI
-- 3. Migrate requests → posts (source = 'client_request')
-- 4. Rename requests → requests_archive (keep as fallback)
-- ============================================================

-- ── 1. New columns on posts ───────────────────────────────────────────────────

ALTER TABLE posts
  -- origin tracking
  ADD COLUMN IF NOT EXISTS source              TEXT    NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS priority            TEXT,

  -- request metadata (maps from requests table)
  ADD COLUMN IF NOT EXISTS request_notes       TEXT,
  ADD COLUMN IF NOT EXISTS preferred_publish_window TEXT,

  -- agent / AI capture metadata
  ADD COLUMN IF NOT EXISTS source_type         TEXT,
  ADD COLUMN IF NOT EXISTS raw_input_text      TEXT,
  ADD COLUMN IF NOT EXISTS raw_attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS voice_transcript    TEXT,
  ADD COLUMN IF NOT EXISTS agent_status        TEXT,
  ADD COLUMN IF NOT EXISTS agent_confidence    NUMERIC,
  ADD COLUMN IF NOT EXISTS ai_summary          TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_assignee      TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_client        TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_content_type  TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_next_action   TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_priority      TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_project       TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_subproject    TEXT,
  ADD COLUMN IF NOT EXISTS strategy_brief      JSONB,

  -- revision tracking
  ADD COLUMN IF NOT EXISTS revision_count      INTEGER NOT NULL DEFAULT 0;

-- ── 2. Migrate requests → posts ──────────────────────────────────────────────
--
-- Status mapping:
--   open        → idea        (new request, not yet started)
--   in_progress → in_progress (work has begun)
--   completed   → published   (delivered)
--   cancelled   → complete    (closed out — no 'cancelled' in post_status)
--
-- Content type mapping (request_type → post content_type):
--   social_post     → social_post
--   email_campaign  → email_campaign
--   design          → graphic_design
--   video           → video
--   automation      → general_task
--   strategy        → general_task
--   general         → general_task

INSERT INTO posts (
  id,
  client_id,
  title,
  content_type,
  status_column,
  created_by_user_id,
  created_at,
  source,
  priority,
  request_notes,
  preferred_publish_window,
  source_type,
  raw_input_text,
  raw_attachment_url,
  voice_transcript,
  agent_status,
  agent_confidence,
  ai_summary,
  ai_suggested_assignee,
  ai_suggested_client,
  ai_suggested_content_type,
  ai_suggested_next_action,
  ai_suggested_priority,
  ai_suggested_project,
  ai_suggested_subproject,
  strategy_brief,
  creative_url,
  request_id
)
SELECT
  r.id,
  r.client_id,
  r.topic                                                AS title,

  CASE r.type
    WHEN 'social_post'    THEN 'social_post'
    WHEN 'email_campaign' THEN 'email_campaign'
    WHEN 'design'         THEN 'graphic_design'
    WHEN 'video'          THEN 'video'
    ELSE                       'general_task'
  END                                                    AS content_type,

  CASE r.status
    WHEN 'open'        THEN 'idea'::post_status
    WHEN 'in_progress' THEN 'in_progress'::post_status
    WHEN 'completed'   THEN 'published'::post_status
    ELSE                    'complete'::post_status
  END                                                    AS status_column,

  r.created_by_user_id,
  r.created_at,
  'client_request'                                       AS source,
  r.priority,
  r.notes                                                AS request_notes,
  r.preferred_publish_window,
  r.source_type,
  r.raw_input_text,
  r.raw_attachment_url,
  r.voice_transcript,
  r.agent_status,
  r.agent_confidence,
  r.ai_summary,
  r.ai_suggested_assignee,
  r.ai_suggested_client,
  r.ai_suggested_content_type,
  r.ai_suggested_next_action,
  r.ai_suggested_priority,
  r.ai_suggested_project,
  r.ai_suggested_subproject,
  r.strategy_brief,
  r.attachments_url                                      AS creative_url,
  r.id                                                   AS request_id
FROM requests r
-- Skip any request that was already linked to an existing post
-- (request_id FK already on posts — those were already converted upstream)
WHERE NOT EXISTS (
  SELECT 1 FROM posts p WHERE p.request_id = r.id
);

-- ── 3. Archive the requests table ────────────────────────────────────────────
-- Rename rather than drop — keeps data as fallback.
-- The posts_request_id_fkey FK on posts continues to work after rename
-- (Postgres tracks by OID, not name).

ALTER TABLE requests RENAME TO requests_archive;

-- Migration: create meeting_notes table for automated pipeline
-- Branch: feat/meeting-notes-automation
-- 2026-04-21

create table if not exists public.meeting_notes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  participants    text[] not null default '{}',
  recorded_at     timestamptz,
  summary         text,
  decisions       jsonb not null default '[]',
  action_items    jsonb not null default '[]',
  raw_transcript  text,
  routed_to       text,           -- agent name: Lev | Quill | Forge
  source_filename text,           -- original Google Drive / Meet filename
  created_at      timestamptz not null default now()
);

-- Index for chronological queries
create index if not exists meeting_notes_recorded_at_idx
  on public.meeting_notes (recorded_at desc);

-- Index for routing-based queries
create index if not exists meeting_notes_routed_to_idx
  on public.meeting_notes (routed_to);

-- Enable Row-Level Security
alter table public.meeting_notes enable row level security;

-- SS team can read all notes
create policy "ss_team_read_meeting_notes"
  on public.meeting_notes
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('ss_admin', 'ss_producer', 'ss_ops', 'ss_team')
    )
  );

-- SS admin can insert/update/delete
create policy "ss_admin_write_meeting_notes"
  on public.meeting_notes
  for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'ss_admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'ss_admin'
    )
  );

-- Service role (used by edge functions) bypasses RLS automatically.
-- No additional policy needed for service role inserts.

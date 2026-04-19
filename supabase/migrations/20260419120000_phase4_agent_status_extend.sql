-- Phase 4 — Agent Office v2 status lighting
-- Extends agent_status, adds agents metadata table, seeds all 9 team members.

-- ── Extend agent_status ─────────────────────────────────────────────────────
alter table agent_status add column if not exists task_tags text[];

-- ── Agents metadata table ────────────────────────────────────────────────────
create table if not exists agents (
  id                   text primary key,
  name                 text not null,
  role                 text,
  member_type          text check (member_type in ('ai', 'human')) default 'ai',
  is_placeholder       boolean default false,
  activation_criteria  text
);

alter table agents enable row level security;

create policy "ss_roles can read agents"
  on agents for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('ss_admin', 'ss_team', 'ss_producer', 'ss_ops')
    )
  );

-- ── Seed agents metadata ─────────────────────────────────────────────────────
insert into agents (id, name, role, member_type, is_placeholder, activation_criteria)
values
  ('corey',   'Corey',   'Founder',                 'human', false, null),
  ('lev',     'Lev',     'Chief of Staff',           'ai',    false, null),
  ('scout',   'Scout',   'Research',                 'ai',    false, null),
  ('quill',   'Quill',   'Social Media Strategist',  'ai',    false, null),
  ('ember',   'Ember',   'Email Strategist',         'ai',    false, null),
  ('forge',   'Forge',   'Lead Developer',           'ai',    true,  'when built as NanoClaw agent'),
  ('pixel',   'Pixel',   'Ads Strategist',           'ai',    true,  'when built as NanoClaw agent'),
  ('gavin',   'Gavin',   'Creative Director',        'human', false, null),
  ('tristan', 'Tristan', 'Sales Director',           'human', false, null)
on conflict (id) do update set
  name               = excluded.name,
  role               = excluded.role,
  member_type        = excluded.member_type,
  is_placeholder     = excluded.is_placeholder,
  activation_criteria = excluded.activation_criteria;

-- ── Seed / upsert agent_status initial states ────────────────────────────────
insert into agent_status (id, name, role, status)
values
  ('corey',   'Corey',   'Founder',                'active'),
  ('lev',     'Lev',     'Chief of Staff',         'active'),
  ('scout',   'Scout',   'Research',               'idle'),
  ('quill',   'Quill',   'Social Media Strategist','idle'),
  ('ember',   'Ember',   'Email Strategist',       'idle'),
  ('forge',   'Forge',   'Lead Developer',         'offline'),
  ('pixel',   'Pixel',   'Ads Strategist',         'offline'),
  ('gavin',   'Gavin',   'Creative Director',      'idle'),
  ('tristan', 'Tristan', 'Sales Director',         'idle')
on conflict (id) do update set
  name   = excluded.name,
  role   = excluded.role,
  status = excluded.status;

-- Agent status table — written by NanoClaw via push-agent-status edge function,
-- read by the Agent Office UI. One row per agent, upserted on each push.

create table if not exists agent_status (
  id          text        primary key,          -- agent key e.g. "lev", "scout"
  name        text        not null,
  role        text,
  status      text        not null default 'offline',
  task        text,
  updated_at  timestamptz not null default now()
);

-- All authenticated SS-role users can read
alter table agent_status enable row level security;

create policy "ss_roles can read agent_status"
  on agent_status for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('ss_admin', 'ss_team', 'ss_producer', 'ss_ops')
    )
  );

-- Writes only via service role (edge function) — no direct client writes

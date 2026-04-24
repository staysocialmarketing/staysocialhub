-- agent_docs: one row per key — written by Lev after each session, read by Corey in /workspace
-- keys: 'memory' | 'tasks' | 'clients' | 'decisions' | 'think-tank'
create table if not exists agent_docs (
  key text primary key,
  title text not null,
  content text not null,
  updated_at timestamptz default now(),
  updated_by text default 'lev'
);

alter table agent_docs enable row level security;

create policy "agent_docs_authenticated_read" on agent_docs
  for select using (auth.role() = 'authenticated');

create policy "agent_docs_service_role_write" on agent_docs
  for all using (auth.role() = 'service_role');

-- Seed placeholder rows so the page has something to show immediately
insert into agent_docs (key, title, content, updated_by) values
  ('memory', 'Memory', E'# Memory\n\n_This file is updated by Lev at the end of each session._\n\n## Active Projects\n\n- Stay Social HUB — hub.staysocial.ca\n- Premiere Web AI Agent — monitoring and automation\n- staysocial.ca — agency website\n- BrokerDesk — in planning\n\n## Current Priorities\n\n_Nothing recorded yet._\n\n## Open Items\n\n_Nothing recorded yet._', 'lev'),
  ('tasks', 'Tasks', E'# Tasks\n\n_This file is updated by Lev at the end of each session._\n\n## In Progress\n\n_Nothing recorded yet._\n\n## Upcoming\n\n_Nothing recorded yet._\n\n## Completed Recently\n\n_Nothing recorded yet._', 'lev'),
  ('clients', 'Clients', E'# Clients\n\n_This file is updated by Lev at the end of each session._\n\n## Craig Spicer\n\n- **Type:** Mortgage broker, Halifax\n- **Platforms:** Instagram, Facebook, LinkedIn, Google\n- **Notes:** _Nothing recorded yet._', 'lev'),
  ('decisions', 'Decisions', E'# Decisions\n\n_This file is updated by Lev at the end of each session._\n\n_No decisions logged yet._', 'lev'),
  ('think-tank', 'Think Tank', E'# Think Tank\n\n_This file is updated by Lev at the end of each session._\n\n## Ideas & Experiments\n\n_Nothing recorded yet._', 'lev')
on conflict (key) do nothing;

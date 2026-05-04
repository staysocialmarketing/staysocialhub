-- workspace_docs: Lev writes these via agent-bridge; Corey reads them in the HUB
create table if not exists workspace_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general', -- 'memory' | 'client' | 'decision' | 'agent' | 'general'
  content text not null,
  updated_at timestamptz default now(),
  updated_by text default 'lev'
);

alter table workspace_docs enable row level security;
drop policy if exists "workspace_docs_read" on workspace_docs;
create policy "workspace_docs_read" on workspace_docs
  for select using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role in ('ss_admin', 'ss_manager')
    )
  );
drop policy if exists "workspace_docs_write" on workspace_docs;
create policy "workspace_docs_write" on workspace_docs
  for all using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role = 'ss_admin'
    )
  );

-- open_items: manually tracked action items
create table if not exists open_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text default 'medium', -- 'high' | 'medium' | 'low'
  status text default 'open', -- 'open' | 'in_progress' | 'resolved'
  assigned_to text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table open_items enable row level security;
drop policy if exists "open_items_admin" on open_items;
create policy "open_items_admin" on open_items
  for all using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role in ('ss_admin', 'ss_manager')
    )
  );

-- team_wins: running log of wins to celebrate
create table if not exists team_wins (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text default 'general', -- 'client' | 'product' | 'team' | 'revenue' | 'general'
  agent text,
  created_at timestamptz default now()
);

alter table team_wins enable row level security;
drop policy if exists "team_wins_read" on team_wins;
create policy "team_wins_read" on team_wins
  for select using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role in ('ss_admin', 'ss_manager')
    )
  );
drop policy if exists "team_wins_write" on team_wins;
create policy "team_wins_write" on team_wins
  for insert with check (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role = 'ss_admin'
    )
  );

-- agent_updates: what each agent has been working on
create table if not exists agent_updates (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null, -- 'lev' | 'scout' | 'quill' | 'ember' | 'forge' | 'pixel'
  task_summary text not null,
  output_location text,
  status text default 'completed', -- 'in_progress' | 'completed' | 'blocked'
  created_at timestamptz default now()
);

alter table agent_updates enable row level security;
drop policy if exists "agent_updates_admin" on agent_updates;
create policy "agent_updates_admin" on agent_updates
  for all using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role in ('ss_admin', 'ss_manager'))
  );

-- agent_morale: weekly check-ins per agent
create table if not exists agent_morale (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  week_of date not null,
  most_engaging text,
  least_engaging text,
  missing_context text,
  suggestions text,
  lev_summary text,
  created_at timestamptz default now()
);

alter table agent_morale enable row level security;
drop policy if exists "agent_morale_admin" on agent_morale;
create policy "agent_morale_admin" on agent_morale
  for all using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role in ('ss_admin', 'ss_manager'))
  );

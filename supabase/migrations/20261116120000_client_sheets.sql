-- Client sheet (Corey, Nov 16 2026): one private sheet per client for Corey and Tristan to decide who needs
-- what and what happens next. Not a CRM: contacts, messages, pipeline and billing stay in GoHighLevel.
-- ss_admin only. Clients and the rest of the team can never read these tables.

create table public.client_sheets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid unique references public.clients(id) on delete set null,  -- null: a client with no HUB workspace
  name        text not null,
  kind        text,
  stage       text not null default 'steady' check (stage in ('onboarding', 'steady', 'grow', 'risk', 'hold')),
  has         jsonb not null default '{}'::jsonb,   -- {"Site": "Custom", "Studio": "One", "HUB": "Yes"}
  next_offer  text check (next_offer is null or next_offer in ('Site', 'Studio', 'HUB', 'Front Desk', 'Reviews')),
  offer_what  text,
  offer_why   text,
  offer_open  text,
  next_move   text,
  next_owner  text check (next_owner is null or next_owner in ('corey', 'tristan')),
  next_due    date,
  know        jsonb not null default '[]'::jsonb,   -- ["short fact", ...]
  loops       jsonb not null default '[]'::jsonb,   -- [{"side": "us" | "them", "text": "...", "since": "2026-11-10"}]
  ghl_url     text,
  confirmed   boolean not null default false,       -- false: a first fill nobody has checked yet
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users(id) on delete set null
);

create table public.client_sheet_log (
  id          uuid primary key default gen_random_uuid(),
  sheet_id    uuid not null references public.client_sheets(id) on delete cascade,
  at          date not null default current_date,
  text        text not null,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index client_sheet_log_sheet_idx on public.client_sheet_log (sheet_id, at desc, created_at desc);

alter table public.client_sheets enable row level security;
alter table public.client_sheet_log enable row level security;

create policy "client_sheets: ss_admin only" on public.client_sheets
  for all to authenticated
  using (public.has_role(auth.uid(), 'ss_admin'))
  with check (public.has_role(auth.uid(), 'ss_admin'));

create policy "client_sheet_log: ss_admin only" on public.client_sheet_log
  for all to authenticated
  using (public.has_role(auth.uid(), 'ss_admin'))
  with check (public.has_role(auth.uid(), 'ss_admin'));

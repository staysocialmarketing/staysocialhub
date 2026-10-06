-- Every Stay Social product as a plan, with its price, so Admin > Clients can record what each
-- client has. Source of truth for names and prices: staysocial.ca lib/products.ts and
-- ~/rook/memory/reference_corp_structure.md (Corey, Oct 6 2026).
--
-- clients.plan_id stays the PRIMARY plan (the Studio tier drives included credits).
-- client_services holds every other product a client has (HUB, AI Front Desk, Reviews, Sites).

alter table public.plans add column if not exists kind text not null default 'service';
alter table public.plans add column if not exists monthly_price_cents integer;
alter table public.plans add column if not exists one_time_price_cents integer;
alter table public.plans add column if not exists annual_price_cents integer;
alter table public.plans add column if not exists sort integer not null default 100;

-- Studio tiers (already seeded with credits) get prices and order.
update public.plans set kind = 'studio', monthly_price_cents = 49900,  sort = 10 where name = 'Studio One';
update public.plans set kind = 'studio', monthly_price_cents = 99900,  sort = 11 where name = 'Studio Team';
update public.plans set kind = 'studio', monthly_price_cents = 149900, sort = 12 where name = 'Studio Brand';

insert into public.plans (name, kind, includes_json, monthly_price_cents, one_time_price_cents, annual_price_cents, sort)
select v.name, v.kind, v.includes::jsonb, v.monthly, v.one_time, v.annual, v.sort
  from (values
    ('Sites Lite', 'sites',
     '["Live in 48 hours, built from your listing","Click-to-call, missed-call text-back, review requests","Online booking that texts you","Email that arrives (we handle DNS)","Two changes a month by text","Monthly numbers text","Cancel hosting any time; you keep domain and content"]',
     7900, 50000, null, 20),
    ('Custom site', 'sites',
     '["Brokerage and multi-location sites","Anything that needs more than a template","Built on the same system, so the phone tools carry over"]',
     null, null, null, 21),
    ('HUB', 'hub',
     '["Brand voice profile","Content generator and calendar","Reviews, conversations, bookings in one login","Cancel any time"]',
     9900, null, 98500, 30),
    ('AI Front Desk', 'service',
     '["An AI receptionist on your number: answers calls and texts, day and night","Books the job into your calendar, sends the reminders","Hands off to you the moment someone is ready","Sounds like your business, set up from your brand card","Every call transcribed into the contact"]',
     14900, null, null, 40),
    ('Reviews & Reputation', 'service',
     '["Review requests after every job, automatically","Replies to reviews in your voice","Monitoring across Google and Facebook","A monthly text with your numbers"]',
     9900, null, null, 41),
    ('Brokerage Command', 'brokers',
     '["A dedicated agent team the brokerage owns at month 24","Sold by Corey, never self-serve"]',
     149900, null, null, 50)
  ) as v(name, kind, includes, monthly, one_time, annual, sort)
 where not exists (select 1 from public.plans p where p.name = v.name);

create table if not exists public.client_services (
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id   uuid not null references public.plans(id) on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (client_id, plan_id)
);
alter table public.client_services enable row level security;
create policy "Read own services" on public.client_services for select to authenticated
  using (public.is_ss_role() or public.can_access_client(client_id));
create policy "SS manages services" on public.client_services for all to authenticated
  using (public.is_ss_role()) with check (public.is_ss_role());

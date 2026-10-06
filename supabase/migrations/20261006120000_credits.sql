-- Video credits (Corey's numbers, Oct 6 2026; see ~/rook/memory/reference_corp_structure.md).
--
-- Images and the standard design styles never use credits. Video styles cost credits per use
-- (design_styles.credits). Each Studio plan includes monthly credits (plans.monthly_credits):
-- they are granted on first use each month, spent first and do not roll over. Purchased credits
-- (packs) never expire. Every movement is a credit_ledger row. Rook spends through the agent
-- bridge (spend_credits); staysocial.ca's Stripe webhook grants purchases through the bridge.

-- 1. Plans carry the monthly allowance. Seed the three Studio plans if they do not exist.
alter table public.plans add column if not exists monthly_credits integer not null default 0;
insert into public.plans (name, includes_json, monthly_credits)
select v.name, v.includes::jsonb, v.credits
  from (values
    ('Studio One',   '["One platform, 12 posts a month","Brand card and voice profile","Custom graphics","Approve from your phone","About 2 videos a month included (100 credits)","HUB included"]', 100),
    ('Studio Team',  '["Every platform, 20 posts a month","Monthly email to your list","Review replies and seasonal reminder","A strategist who calls when a number moves","About 5 videos a month included (250 credits)","HUB included"]', 250),
    ('Studio Brand', '["Brokerage or multi-location scope","Video every month","Dedicated strategist, quarterly plan","About 10 videos a month included (500 credits)","HUB included"]', 500)
  ) as v(name, includes, credits)
 where not exists (select 1 from public.plans p where p.name = v.name);
update public.plans set monthly_credits = 100 where name = 'Studio One'   and monthly_credits = 0;
update public.plans set monthly_credits = 250 where name = 'Studio Team'  and monthly_credits = 0;
update public.plans set monthly_credits = 500 where name = 'Studio Brand' and monthly_credits = 0;

-- 2. Per-use costs on the catalogue. Character build is free, so it is a note, not a row.
update public.design_styles set credits = 15 where key = 'motion';
update public.design_styles set credits = 25 where key = 'agent';
update public.design_styles set credits = 40 where key = 'pixar';
update public.design_styles set credits = 60 where key = 'puppet';
update public.design_styles set needs = 'A character sheet, made once and included, and a voice note or a script per video.' where key = 'pixar';
update public.design_styles set needs = 'A character sheet, made once and included.' where key = 'puppet';

-- 3. Packs. payment_link_url is filled in by Corey once the Stripe payment links exist.
create table if not exists public.credit_packs (
  key              text primary key,
  name             text not null,
  credits          integer not null,
  price_cents      integer not null,
  currency         text not null default 'CAD',
  payment_link_url text,
  sort             integer not null default 100,
  active           boolean not null default true
);
alter table public.credit_packs enable row level security;
create policy "Anyone signed in can read packs" on public.credit_packs for select to authenticated using (true);
create policy "SS manages packs" on public.credit_packs for all to authenticated using (public.is_ss_role()) with check (public.is_ss_role());
insert into public.credit_packs (key, name, credits, price_cents, sort) values
  ('starter',  'Starter',  50,  5900,  10),
  ('standard', 'Standard', 150, 14900, 20),
  ('studio',   'Studio',   400, 34900, 30)
on conflict (key) do nothing;

-- 4. The ledger.
create table if not exists public.credit_ledger (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  delta             integer not null,
  kind              text not null check (kind in ('plan_grant', 'purchase', 'spend', 'adjustment')),
  period            date not null default date_trunc('month', now())::date,
  style_key         text references public.design_styles(key) on delete set null,
  post_id           uuid references public.posts(id) on delete set null,
  note              text,
  stripe_session_id text unique,
  created_by        uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists credit_ledger_client_idx on public.credit_ledger (client_id, created_at desc);
create unique index if not exists credit_ledger_one_grant_per_month on public.credit_ledger (client_id, period) where kind = 'plan_grant';
alter table public.credit_ledger enable row level security;
create policy "Read own ledger" on public.credit_ledger for select to authenticated
  using (public.is_ss_role() or public.can_access_client(client_id));
create policy "SS writes ledger" on public.credit_ledger for insert to authenticated with check (public.is_ss_role());

create table if not exists public.client_credit_settings (
  client_id               uuid primary key references public.clients(id) on delete cascade,
  auto_topup              boolean not null default false,
  low_balance_notified_at timestamptz,
  updated_at              timestamptz not null default now()
);
alter table public.client_credit_settings enable row level security;
create policy "Read own credit settings" on public.client_credit_settings for select to authenticated
  using (public.is_ss_role() or public.can_access_client(client_id));
create policy "Write own credit settings" on public.client_credit_settings for insert to authenticated
  with check (public.is_ss_role() or public.can_access_client(client_id));
create policy "Update own credit settings" on public.client_credit_settings for update to authenticated
  using (public.is_ss_role() or public.can_access_client(client_id))
  with check (public.is_ss_role() or public.can_access_client(client_id));

-- 5. Grant this month's included credits once, lazily.
create or replace function public.ensure_monthly_grant(p_client uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_credits integer; v_plan text;
begin
  select p.monthly_credits, p.name into v_credits, v_plan
    from public.clients c join public.plans p on p.id = c.plan_id where c.id = p_client;
  if coalesce(v_credits, 0) <= 0 then return; end if;
  insert into public.credit_ledger (client_id, delta, kind, period, note)
  values (p_client, v_credits, 'plan_grant', date_trunc('month', now())::date, v_plan || ' monthly credits')
  on conflict do nothing;
end $$;

-- 6. Balance. Included credits are spent first within their month; what a month spends beyond
--    its grant comes out of purchased credits, which never expire.
create or replace function public.credit_summary(p_client uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_included integer; v_spent_month integer; v_purchased integer; v_overflow integer;
  v_plan text; v_monthly integer; v_settings record;
begin
  perform public.ensure_monthly_grant(p_client);
  select coalesce(sum(delta), 0) into v_included from public.credit_ledger where client_id = p_client and kind = 'plan_grant' and period = v_month;
  select coalesce(-sum(delta), 0) into v_spent_month from public.credit_ledger where client_id = p_client and kind = 'spend' and period = v_month;
  select coalesce(sum(delta), 0) into v_purchased from public.credit_ledger where client_id = p_client and kind in ('purchase', 'adjustment');
  select coalesce(sum(greatest(0, m.spent - m.granted)), 0) into v_overflow
    from (select period,
                 coalesce(sum(case when kind = 'spend' then -delta end), 0) as spent,
                 coalesce(sum(case when kind = 'plan_grant' then delta end), 0) as granted
            from public.credit_ledger where client_id = p_client group by period) m;
  select p.name, p.monthly_credits into v_plan, v_monthly
    from public.clients c left join public.plans p on p.id = c.plan_id where c.id = p_client;
  select * into v_settings from public.client_credit_settings where client_id = p_client;
  return jsonb_build_object(
    'plan_name', v_plan,
    'monthly_credits', coalesce(v_monthly, 0),
    'included', v_included,
    'spent_this_month', v_spent_month,
    'included_left', greatest(0, v_included - v_spent_month),
    'purchased_left', v_purchased - v_overflow,
    'balance', greatest(0, v_included - v_spent_month) + (v_purchased - v_overflow),
    'resets_on', (v_month + interval '1 month')::date,
    'auto_topup', coalesce(v_settings.auto_topup, false)
  );
end $$;

-- 7. Spend. Refuses when the balance cannot cover the style's cost.
create or replace function public.spend_credits(p_client uuid, p_style_key text, p_post_id uuid, p_note text, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cost integer; v_summary jsonb; v_balance integer; v_style text; v_client text;
begin
  select credits, name into v_cost, v_style from public.design_styles where key = p_style_key;
  if v_cost is null then raise exception 'unknown_style:%', p_style_key; end if;
  if v_cost = 0 then return public.credit_summary(p_client); end if;
  v_summary := public.credit_summary(p_client);
  v_balance := (v_summary->>'balance')::integer;
  if v_balance < v_cost then raise exception 'insufficient_credits: balance % cost %', v_balance, v_cost; end if;
  insert into public.credit_ledger (client_id, delta, kind, style_key, post_id, note, created_by)
  values (p_client, -v_cost, 'spend', p_style_key, p_post_id, coalesce(p_note, v_style), p_actor);
  v_summary := public.credit_summary(p_client);
  v_balance := (v_summary->>'balance')::integer;

  -- Low balance: tell the client's people and the admins, at most once a week.
  if v_balance < 20 then
    select name into v_client from public.clients where id = p_client;
    insert into public.client_credit_settings (client_id) values (p_client) on conflict do nothing;
    if not exists (select 1 from public.client_credit_settings s where s.client_id = p_client and s.low_balance_notified_at > now() - interval '7 days') then
      insert into public.notifications (user_id, title, body, link)
      select u.id, 'Credits are running low', 'You have ' || v_balance || ' credits left. Top up any time from the Credits page.', '/client/credits'
        from public.users u where u.client_id = p_client;
      insert into public.notifications (user_id, title, body, link)
      select ur.user_id, coalesce(v_client, 'A client') || ' is low on credits (' || v_balance || ' left)',
             case when (v_summary->>'auto_topup')::boolean then 'Auto top-up is ON: add the Standard pack and send the receipt.' else 'Auto top-up is off. Mention a pack on the next call.' end,
             '/admin/clients'
        from public.user_roles ur where ur.role = 'ss_admin';
      update public.client_credit_settings set low_balance_notified_at = now(), updated_at = now() where client_id = p_client;
    end if;
  end if;
  return v_summary;
end $$;

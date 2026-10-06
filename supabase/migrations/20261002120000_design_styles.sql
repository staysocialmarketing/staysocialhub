-- Design styles: the looks Stay Social can use for a client's posts.
--
-- design_styles is the catalogue (one row per look, with the copy the client sees and a
-- small preview spec). client_design_styles holds a client's overrides; no row means the
-- catalogue default applies. A change inserts a HUB task for Corey and a notification for the
-- admins, so Rook's rotation for that client gets updated.

create table if not exists public.design_styles (
  key              text primary key,
  name             text not null,
  tag              text not null,
  description      text not null,
  long_description text not null default '',
  needs            text not null default '',
  is_addon         boolean not null default false,
  credits          integer not null default 0,
  default_on       boolean not null default true,
  sort             integer not null default 100,
  active           boolean not null default true,
  preview          jsonb not null default '{}'::jsonb
);
alter table public.design_styles enable row level security;
create policy "Anyone signed in can read styles" on public.design_styles
  for select to authenticated using (true);
create policy "SS manages styles" on public.design_styles
  for all to authenticated using (public.is_ss_role()) with check (public.is_ss_role());

create table if not exists public.client_design_styles (
  client_id  uuid not null references public.clients(id) on delete cascade,
  style_key  text not null references public.design_styles(key) on delete cascade,
  enabled    boolean not null,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (client_id, style_key)
);
create index if not exists client_design_styles_style_idx on public.client_design_styles (style_key);
alter table public.client_design_styles enable row level security;
create policy "Read own client styles" on public.client_design_styles
  for select to authenticated using (public.is_ss_role() or public.can_access_client(client_id));
create policy "Write own client styles" on public.client_design_styles
  for insert to authenticated with check (public.is_ss_role() or public.can_access_client(client_id));
create policy "Update own client styles" on public.client_design_styles
  for update to authenticated using (public.is_ss_role() or public.can_access_client(client_id))
  with check (public.is_ss_role() or public.can_access_client(client_id));

-- Tell the team when a client flips a style.
create or replace function public.handle_design_style_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_name text;
  v_style_name  text;
  v_actor       text;
  v_corey       uuid := '6cd3d0da-0cbc-4bd5-b428-9f997218f5c2';
  v_title       text;
begin
  if tg_op = 'UPDATE' and new.enabled = old.enabled then
    return new;
  end if;
  select name into v_client_name from public.clients where id = new.client_id;
  select name into v_style_name from public.design_styles where key = new.style_key;
  select coalesce(u.name, u.email) into v_actor from public.users u where u.id = new.updated_by;

  v_title := coalesce(v_client_name, 'A client') || ' turned ' || case when new.enabled then 'on' else 'off' end
             || ' ' || coalesce(v_style_name, new.style_key);

  insert into public.notifications (user_id, title, body, link)
  select ur.user_id, v_title,
         'Changed by ' || coalesce(v_actor, 'the client') || '. Update the rotation for this client.',
         '/admin/clients'
    from public.user_roles ur
   where ur.role = 'ss_admin';

  insert into public.tasks (title, description, client_id, assigned_to_user_id, created_by_user_id, status, priority)
  values (v_title,
          'Design styles changed in the HUB by ' || coalesce(v_actor, 'the client') || '. '
          || 'Add or remove this style in the rotation for ' || coalesce(v_client_name, 'this client') || '.',
          new.client_id, v_corey, coalesce(new.updated_by, v_corey), 'todo', 'normal');
  return new;
end;
$$;

drop trigger if exists on_client_design_style_change on public.client_design_styles;
create trigger on_client_design_style_change
  after insert or update on public.client_design_styles
  for each row execute function public.handle_design_style_change();

-- The catalogue. Copy is client-facing; preview drives the little tile on the page.
insert into public.design_styles (key, name, tag, description, long_description, needs, is_addon, credits, default_on, sort, preview) values
('brand', 'Brand template', 'Template',
 'Your logo, your colours, clean layout. The workhorse.',
 'A templated card in your brand: logo placed properly, your palette, one clear headline. Fast to make, always on brand, the backbone of most weeks.',
 'Nothing. Logo and colours come from your brand profile.',
 false, 0, true, 10,
 '{"bg":"#1a2733","wash":"linear-gradient(160deg, rgba(201,138,27,0.35), transparent 60%)","ink":"#f2ebdd","font":"sans","sample":"Rates held. Here is what it means for you.","sub":"Your name here"}'),
('quote', 'Quote card', 'Typographic',
 'One line of yours, set big. No photo, all type.',
 'A single sentence in your voice, set large in the display face on paper or teal. Reads as a considered thought, not an ad.',
 'Lines only you would say. We pull them from your calls and posts.',
 false, 0, true, 20,
 '{"bg":"#f2ebdd","wash":"none","ink":"#1a2733","font":"serif","sample":"The apology is never necessary.","sub":"You"}'),
('testimonial', 'Testimonial card', 'Typographic',
 'A real review, stars and the first name.',
 'One client review, quoted in full, with the rating and first name. Set on paper so the words carry it.',
 'Your Google reviews, which we already pull.',
 false, 0, true, 30,
 '{"bg":"#ffffff","wash":"linear-gradient(180deg, transparent, rgba(201,138,27,0.18))","ink":"#1a2733","font":"serif","sample":"“Made it painless.”","sub":"★★★★★  Priya"}'),
('hero', 'Hero object', 'AI scene',
 'One signature prop, lit like a product shot.',
 'A brass ruler, a stack of documents, a set of keys: one object standing in for the idea, photographed in your palette.',
 'Nothing. Your signature prop list is in the brand profile.',
 false, 0, true, 40,
 '{"bg":"#22343a","wash":"radial-gradient(circle at 70% 30%, rgba(201,138,27,0.55), transparent 55%)","ink":"#f2ebdd","font":"serif","sample":"Locked in at the peak?","sub":"Brass ruler, window light"}'),
('agent', 'Agent in frame', 'AI scene',
 'You, in the scene, from your headshot. Likeness, not a lookalike.',
 'You appear in the picture, built from your approved headshot reference. Used for the posts where a face sells it: welcome, milestones, the personal ones.',
 'One approved headshot. Turn it on and we send a sample before using it.',
 false, 0, false, 50,
 '{"bg":"#2a4a50","wash":"linear-gradient(200deg, rgba(0,0,0,0.35), transparent)","ink":"#f2ebdd","font":"sans","sample":"Five things people who close smoothly do.","sub":"You, at the desk","figure":true}'),
('places', 'Real locations', 'Real photo',
 'Real streets and rooms from your area. No AI, ever.',
 'Photographs of real places: your neighbourhoods, real streets, real interiors. Text is added over them. Nothing generated.',
 'Your own photos help. Send them by text and they land in your library.',
 false, 0, true, 60,
 '{"bg":"#5c6f78","wash":"linear-gradient(180deg, rgba(26,39,51,0.1), rgba(26,39,51,0.7))","ink":"#f2ebdd","font":"sans","sample":"Renewal season, close to home.","sub":"Photo, your waterfront"}'),
('stock', 'Stock photography', 'Real photo',
 'Licensed real photos only, chosen to your palette.',
 'Licensed photography, picked to sit inside your colours. Real people, real homes, no generated pixels.',
 'Nothing.',
 false, 0, true, 70,
 '{"bg":"#8a7a62","wash":"linear-gradient(180deg, transparent, rgba(26,39,51,0.75))","ink":"#f2ebdd","font":"sans","sample":"First home, first winter.","sub":"Licensed photo"}'),
('editorial', 'Text-led editorial', 'Typographic',
 'The headline is the design. Magazine feel.',
 'Big type, a rule, a small caps line. The kind of card that reads as a headline in a good magazine, so the words are always crisp.',
 'Nothing.',
 false, 0, true, 80,
 '{"bg":"#f2ebdd","wash":"none","ink":"#1a2733","font":"serif","sample":"WHAT THE BANK WON’T SAY","sub":"Five pillars, no. 3","caps":true}'),
('carousel', 'Carousel explainer', 'Typographic',
 'Five to seven slides that teach one thing.',
 'A swipe-through: cover, four or five steps, a closing slide with the call. Great for pillar posts and anything with a list.',
 'Nothing.',
 false, 0, true, 90,
 '{"bg":"#1a2733","wash":"linear-gradient(90deg, transparent 70%, rgba(242,235,221,0.15))","ink":"#f2ebdd","font":"sans","sample":"1 / 6  The condition-free trap","sub":"Swipe"}'),
('motion', 'Animated explainer', 'Video',
 'A still that moves: 8 to 15 seconds, captioned.',
 'Your approved still, brought to life: a slow push-in, a moving element, captions. For the posts that want a stop-the-scroll moment without a face.',
 'Nothing. We render from an approved still.',
 false, 0, true, 100,
 '{"bg":"#22343a","wash":"radial-gradient(circle at 30% 70%, rgba(63,179,174,0.4), transparent 60%)","ink":"#f2ebdd","font":"sans","sample":"How a rate hold works","sub":"12 s, captions","play":true}'),
('pixar', 'Character, Pixar style', 'Video',
 'An animated you explains it in 30 seconds.',
 'A stylised animated version of you, built once and reused, explaining one idea per video with your voice notes as the script.',
 'A character sheet, made once, and a voice note or a script per video.',
 true, 40, false, 110,
 '{"bg":"#3a5a7a","wash":"radial-gradient(circle at 60% 40%, rgba(255,255,255,0.25), transparent 50%)","ink":"#ffffff","font":"sans","sample":"“Let me explain the stress test”","sub":"30 s, voiced","figure":true,"play":true}'),
('puppet', 'Character, puppet', 'Video',
 'A felt puppet version of you, filmed on a set in your colours.',
 'A puppet character built from your look, filmed on a set in your colours. Funny, memorable, and clients remember the name.',
 'A character sheet, made once.',
 true, 60, false, 120,
 '{"bg":"#6b3f2e","wash":"radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 55%)","ink":"#f2ebdd","font":"sans","sample":"“Rates? Let me check my notes.”","sub":"20 s, puppet","figure":true,"play":true}')
on conflict (key) do nothing;

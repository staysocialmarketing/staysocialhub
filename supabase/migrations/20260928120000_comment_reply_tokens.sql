-- Reply-by-email for HUB comments.
--
-- Every comment email carries a unique reply-to address, reply+<token>@<reply domain>.
-- A reply to it reaches Resend, which calls the inbound-comment-reply edge function; the
-- token says which post and which person the reply belongs to. Tokens are read and written
-- by the service role only. inbound_email_log keeps one row per received email so a webhook
-- retry can never post the same reply twice.

create table if not exists public.comment_reply_tokens (
  token        text primary key,
  post_id      uuid not null references public.posts(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  comment_id   uuid references public.comments(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '60 days',
  used_count   integer not null default 0,
  last_used_at timestamptz
);
create index if not exists comment_reply_tokens_post_user_idx on public.comment_reply_tokens (post_id, user_id);
create index if not exists comment_reply_tokens_comment_idx on public.comment_reply_tokens (comment_id);
alter table public.comment_reply_tokens enable row level security;
-- No policies on purpose: only the service role (edge functions) touches this table.

create table if not exists public.inbound_email_log (
  id               uuid primary key default gen_random_uuid(),
  resend_email_id  text not null unique,
  from_email       text,
  to_email         text,
  subject          text,
  outcome          text not null default 'received',
  detail           text,
  comment_id       uuid references public.comments(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists inbound_email_log_created_idx on public.inbound_email_log (created_at desc);
alter table public.inbound_email_log enable row level security;

-- Where a comment came from: 'hub' (default) or 'email'.
alter table public.comments add column if not exists source text not null default 'hub';

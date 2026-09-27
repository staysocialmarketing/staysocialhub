-- Comment emails are dispatched by the send-comment-email edge function, called from the app
-- right after a comment is inserted. email_sent_at is the idempotency claim: the function
-- sets it before sending, so a second call (or the legacy pg_net path in the notification
-- trigger, which only fires if a service key setting is ever configured) cannot send twice.
alter table public.comments
  add column if not exists email_sent_at timestamptz;

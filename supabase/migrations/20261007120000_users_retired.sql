-- Removing a user who has history (comments, approvals) cannot delete their rows, so the
-- admin-users function retires them instead: auth banned, roles removed, client unlinked,
-- retired_at set. Lists hide retired users; their history keeps its author.
alter table public.users add column if not exists retired_at timestamptz;
create index if not exists users_retired_idx on public.users (retired_at) where retired_at is not null;

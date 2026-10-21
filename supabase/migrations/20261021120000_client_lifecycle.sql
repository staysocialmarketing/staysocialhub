-- Client lifecycle: active | on_hold | archived, and a delete that takes the client's data with it.
-- Oct 21 2026 (Corey: Lesley must be removable; Rico is on hold).

update public.clients set status = 'on_hold'  where status = 'paused';
update public.clients set status = 'archived' where status = 'inactive';
update public.clients set status = 'active'   where status is null or status not in ('active', 'on_hold', 'archived');
alter table public.clients alter column status set default 'active';
alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients add constraint clients_status_check check (status in ('active', 'on_hold', 'archived'));

-- Deleting a client removes its content and work; people keep their accounts (client_id goes null).
alter table public.posts
  drop constraint posts_client_id_fkey,
  add constraint posts_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade;
alter table public.tasks
  drop constraint tasks_client_id_fkey,
  add constraint tasks_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade;
alter table public.requests_archive
  drop constraint requests_client_id_fkey,
  add constraint requests_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade;
alter table public.nanoclaw_queue
  drop constraint nanoclaw_queue_client_id_fkey,
  add constraint nanoclaw_queue_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade;
alter table public.profile_update_requests
  drop constraint profile_update_requests_client_id_fkey,
  add constraint profile_update_requests_client_id_fkey foreign key (client_id) references public.clients(id) on delete cascade;
alter table public.users
  drop constraint users_client_id_fkey,
  add constraint users_client_id_fkey foreign key (client_id) references public.clients(id) on delete set null;

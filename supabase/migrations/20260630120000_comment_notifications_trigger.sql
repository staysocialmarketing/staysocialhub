-- Comment notification trigger
-- Inserts in-app notifications for relevant users when a comment is added to a post.
-- Also invokes the send-comment-email edge function for email notifications via pg_net.

-- Ensure pg_net is enabled (already available on Supabase hosted)
create extension if not exists pg_net with schema extensions;

create or replace function public.handle_comment_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_post_id uuid;
  v_post_title text;
  v_post_client_id uuid;
  v_post_assigned uuid;
  v_post_reviewer uuid;
  v_commenter_name text;
  v_comment_body text;
  v_recipient_ids uuid[];
  v_link text;
  v_service_key text;
begin
  -- Only handle post comments (not task or request comments)
  if NEW.post_id is null then
    return NEW;
  end if;

  v_post_id := NEW.post_id;
  v_comment_body := NEW.body;

  -- Get post details
  select p.title, p.client_id, p.assigned_to_user_id, p.reviewer_user_id
    into v_post_title, v_post_client_id, v_post_assigned, v_post_reviewer
    from public.posts p
   where p.id = v_post_id;

  if v_post_title is null then
    v_post_title := 'Untitled Post';
  end if;

  -- Get commenter name
  select coalesce(u.name, u.email) into v_commenter_name
    from public.users u
   where u.id = NEW.user_id;

  if v_commenter_name is null then
    v_commenter_name := 'Someone';
  end if;

  -- Build notification link — pipeline route is accessible to all users
  v_link := '/pipeline/' || v_post_id::text;

  -- Collect recipient user IDs (excluding the comment author)
  v_recipient_ids := array[]::uuid[];

  -- 1. All ss_admin role users
  select coalesce(array_agg(ur.user_id), array[]::uuid[]) into v_recipient_ids
    from public.user_roles ur
   where ur.role = 'ss_admin'
     and ur.user_id != NEW.user_id;

  -- 2. Post assigned_to_user_id
  if v_post_assigned is not null and v_post_assigned != NEW.user_id
     and not (v_post_assigned = any(v_recipient_ids)) then
    v_recipient_ids := v_recipient_ids || v_post_assigned;
  end if;

  -- 3. Post reviewer_user_id
  if v_post_reviewer is not null and v_post_reviewer != NEW.user_id
     and not (v_post_reviewer = any(v_recipient_ids)) then
    v_recipient_ids := v_recipient_ids || v_post_reviewer;
  end if;

  -- 4. Thread participants (other users who commented on same post)
  v_recipient_ids := v_recipient_ids || coalesce(
    (select array_agg(distinct c.user_id)
       from public.comments c
      where c.post_id = v_post_id
        and c.user_id != NEW.user_id
        and c.id != NEW.id
        and not (c.user_id = any(v_recipient_ids))),
    array[]::uuid[]
  );

  -- 5. Client user(s) who own the post
  if v_post_client_id is not null then
    v_recipient_ids := v_recipient_ids || coalesce(
      (select array_agg(u.id)
         from public.users u
        where u.client_id = v_post_client_id
          and u.id != NEW.user_id
          and not (u.id = any(v_recipient_ids))),
      array[]::uuid[]
    );
  end if;

  -- Deduplicate and remove nulls
  select coalesce(array_agg(distinct x), array[]::uuid[]) into v_recipient_ids
    from unnest(v_recipient_ids) x
   where x is not null;

  if array_length(v_recipient_ids, 1) is null or array_length(v_recipient_ids, 1) = 0 then
    return NEW;
  end if;

  -- Insert in-app notifications for each recipient
  -- (respects in_app_enabled preference — defaults to true if no prefs row)
  insert into public.notifications (user_id, title, body, link)
  select
    rid,
    'New comment on "' || left(v_post_title, 50) || '"',
    v_commenter_name || ': ' || left(v_comment_body, 200),
    v_link
  from unnest(v_recipient_ids) as rid
  where not exists (
    select 1 from public.notification_preferences np
     where np.user_id = rid and np.in_app_enabled = false
  );

  -- Invoke send-comment-email edge function via pg_net for email notifications
  begin
    v_service_key := coalesce(
      current_setting('supabase.service_role_key', true),
      current_setting('app.settings.service_role_key', true)
    );

    if v_service_key is not null then
      perform net.http_post(
        url := 'https://ktyjtbivycjkklkrcudb.supabase.co/functions/v1/send-comment-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'comment_id', NEW.id,
          'post_id', v_post_id,
          'post_title', v_post_title,
          'commenter_name', v_commenter_name,
          'comment_body', v_comment_body,
          'recipient_ids', to_jsonb(v_recipient_ids)
        )
      );
    end if;
  exception when others then
    -- Never fail the comment insert if email dispatch fails
    raise warning 'send-comment-email call failed: %', SQLERRM;
  end;

  return NEW;
end;
$$;

-- Create the trigger
drop trigger if exists on_comment_insert_notify on public.comments;
create trigger on_comment_insert_notify
  after insert on public.comments
  for each row
  execute function public.handle_comment_notification();

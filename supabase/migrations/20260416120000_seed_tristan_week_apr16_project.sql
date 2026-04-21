-- Seed: Tristan — Week of Apr 16 Tasks
-- Creates project + 6 tasks assigned to Tristan, created by Corey.
-- Tags (internal · team-training) embedded in each task description.

DO $$
DECLARE
  v_project_id   UUID;
  v_tristan_id   UUID;
  v_corey_id     UUID;
BEGIN

  -- Resolve user IDs by email / name
  SELECT id INTO v_corey_id
    FROM public.users
    WHERE email ILIKE '%corey%staysocial%'
    LIMIT 1;

  SELECT id INTO v_tristan_id
    FROM public.users
    WHERE name ILIKE '%tristan%'
    LIMIT 1;

  IF v_corey_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve Corey user ID — check email in public.users';
  END IF;

  IF v_tristan_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve Tristan user ID — check name in public.users';
  END IF;

  -- Create project
  INSERT INTO public.projects (name, description, status, created_by_user_id)
  VALUES (
    'Tristan — Week of Apr 16 Tasks',
    $desc$Tags: internal · team-training

Weekly task package for Tristan covering client email campaigns, HUB transition outreach, onboarding prep, internal templates, GHL workflow builds, and CRM mastery.$desc$,
    'active',
    v_corey_id
  )
  RETURNING id INTO v_project_id;

  -- Task 1 — Client Email Campaigns (URGENT)
  INSERT INTO public.tasks (title, description, status, priority, assigned_to_user_id, assigned_to_team, due_at, project_id, created_by_user_id)
  VALUES (
    'Client Email Campaigns',
    $desc$Tags: internal · team-training

Context: Multiple clients need email campaigns built/sent in their GHL accounts. Lev assists with content drafting per brand voice. Campaigns send from the client's brand, not Stay Social.

Objective: Update, build, and send client email campaigns in their respective GHL accounts.

Deliverable:
• Scott Pattinson — multiple campaigns for clients + partners
• Lesley Tenaglia — bi-weekly
• Francine Casault — bi-weekly
• AG Mortgage Team — bi-weekly
• Danielle Gibson — bi-weekly (Canadian English + holidays, include contact details)

Deadline: Apr 16–17

Notes: Lev drafts content, Tristan reviews + updates in GHL. Reference brand voice profiles in HUB. Send test to Corey before final blast on any unfamiliar campaign.$desc$,
    'todo', 'urgent', v_tristan_id, false, '2026-04-17 23:59:00+00', v_project_id, v_corey_id
  );

  -- Task 2 — HUB Transition Email
  INSERT INTO public.tasks (title, description, status, priority, assigned_to_user_id, assigned_to_team, due_at, project_id, created_by_user_id)
  VALUES (
    'HUB Transition Email',
    $desc$Tags: internal · team-training

Context: Email comes from Corey with Tristan CC'd. Individually personalized to each client (no BCC blast). Positioning: upgrade, not apology. No discount offered.

Objective: Re-introduce Tristan to each client and book them into a HUB onboarding call.

Deliverable: Personal email sent from Corey (CC Tristan) to each client with Tristan's booking link. All onboarding calls booked by end of next week.

Deadline: Emails out by Apr 18 | All calls booked by Apr 24

Dependencies:
• Tristan's GHL calendar link (Corey to build)
• Email template approved by Corey$desc$,
    'todo', 'high', v_tristan_id, false, '2026-04-18 23:59:00+00', v_project_id, v_corey_id
  );

  -- Task 3 — HUB Walkthrough Talking Points Doc
  INSERT INTO public.tasks (title, description, status, priority, assigned_to_user_id, assigned_to_team, due_at, project_id, created_by_user_id)
  VALUES (
    'HUB Walkthrough Talking Points Doc',
    $desc$Tags: internal · team-training

Context: Every onboarding call should hit the same core points so the HUB experience is consistent across the client roster.

Objective: Build a 1-page talking points doc Tristan uses on every onboarding call.

Deliverable: Covers login, navigation, approval flow, assets, support path, common questions, and call structure (0–20 min breakdown).

Deadline: Draft by Apr 17 | Corey reviews before Monday Apr 20 (first onboarding call)

Notes: Living doc — update as HUB evolves.$desc$,
    'todo', 'high', v_tristan_id, false, '2026-04-17 23:59:00+00', v_project_id, v_corey_id
  );

  -- Task 4 — Stay Social Internal Email Templates
  INSERT INTO public.tasks (title, description, status, priority, assigned_to_user_id, assigned_to_team, due_at, project_id, created_by_user_id)
  VALUES (
    'Stay Social Internal Email Templates',
    $desc$Tags: internal · team-training

Context: Stay Social will start using email marketing ourselves. Need reusable branded templates built first.

Objective: Build a starter template set for internal Stay Social email marketing.

Deliverable:
• Welcome / onboarding sequence
• Monthly newsletter
• Service announcement
• Promotional
• Re-engagement

Voice: Canadian English. Stay Social brand voice — professional, personable, value-first, modern, non-salesy.
Structure: header, sub-header, subject line, preview text, contact info above hashtags.

Deadline: First drafts within 2 weeks — starts after Task 1 (Client Email Campaigns) ships.$desc$,
    'backlog', 'normal', v_tristan_id, false, '2026-04-30 23:59:00+00', v_project_id, v_corey_id
  );

  -- Task 5 — GHL Workflow Builds
  INSERT INTO public.tasks (title, description, status, priority, assigned_to_user_id, assigned_to_team, due_at, project_id, created_by_user_id)
  VALUES (
    'GHL Workflow Builds',
    $desc$Tags: internal · team-training

Context: Automate recurring tasks across client accounts and internal Stay Social ops.

Objective: Identify + build GHL automations that save recurring manual work.

Deliverable: Running list of workflow opportunities flagged during Task 1 (Client Email Campaigns), built + tested once Corey prioritizes.

Deadline: Ongoing — start flagging during Task 1.$desc$,
    'backlog', 'normal', v_tristan_id, false, NULL, v_project_id, v_corey_id
  );

  -- Task 6 — Internal CRM Mastery
  INSERT INTO public.tasks (title, description, status, priority, assigned_to_user_id, assigned_to_team, due_at, project_id, created_by_user_id)
  VALUES (
    'Internal CRM Mastery (Stay Social)',
    $desc$Tags: internal · team-training

Context: Tristan becomes internal CRM expert so it's not a Corey bottleneck. Scope TBD.

Objective: Define CRM scope with Corey (pipelines, tags, automations, reporting), then master it.

Deliverable:
• 30-min scoping call with Corey
• Documented CRM playbook

Deadline: Ongoing — scope after Tasks 1–3 are clear.$desc$,
    'backlog', 'normal', v_tristan_id, false, NULL, v_project_id, v_corey_id
  );

  RAISE NOTICE 'Project created: % (id: %)', 'Tristan — Week of Apr 16 Tasks', v_project_id;
  RAISE NOTICE 'Corey ID: % | Tristan ID: %', v_corey_id, v_tristan_id;

END $$;

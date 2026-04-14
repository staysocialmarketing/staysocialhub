-- Seed: Craig Spicer (internal testing only — no auth user created)
-- Creates client record, brand_twin profile, and one ai_draft test post.

DO $$
DECLARE
  v_client_id UUID;
BEGIN

  -- 1. Client record
  INSERT INTO public.clients (name, status, assistants_can_approve)
  VALUES ('Craig Spicer', 'active', false)
  RETURNING id INTO v_client_id;

  -- 2. Brand Twin profile
  -- Platforms: Instagram, Facebook, LinkedIn, Google
  INSERT INTO public.brand_twin (
    client_id,
    brand_basics_json,
    social_direction_json,
    brand_voice_json,
    audience_json
  )
  VALUES (
    v_client_id,
    jsonb_build_object(
      'business_name',  'Craig Spicer',
      'industry',       'Mortgage Broker',
      'tagline',        '',
      'location',       '',
      'website',        ''
    ),
    jsonb_build_object(
      'active_platforms', jsonb_build_array('Instagram', 'Facebook', 'LinkedIn', 'Google'),
      'content_focus',    'Mortgage tips, market updates, home buyer education, client success stories',
      'posting_frequency','Regular'
    ),
    jsonb_build_object(
      'tone',       'Trustworthy, approachable, professional',
      'style',      'Informative with a personal touch',
      'keywords',   jsonb_build_array('mortgage', 'home loan', 'first home buyer', 'refinance', 'interest rates')
    ),
    jsonb_build_object(
      'primary_audience', 'First home buyers, refinancers, property investors',
      'age_range',        '28–55',
      'pain_points',      jsonb_build_array('confusing loan options', 'unclear rates', 'complex application process')
    )
  );

  -- 3. Test post — ai_draft status for approval workflow testing
  INSERT INTO public.posts (
    client_id,
    title,
    platform,
    caption,
    status_column
  )
  VALUES (
    v_client_id,
    '[TEST] Craig Spicer — Instagram Mortgage Tip',
    'Instagram',
    'Thinking about buying your first home? Let''s cut through the confusion. As a mortgage broker, I compare dozens of lenders to find the right fit for YOU — not the bank. DM me to get started. 🏡 #MortgageBroker #FirstHomeBuyer #HomeLoan',
    'ai_draft'
  );

  RAISE NOTICE 'Craig Spicer created with client_id = %', v_client_id;

END $$;

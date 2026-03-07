
-- Platform versions table
CREATE TABLE public.platform_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  major_version integer NOT NULL DEFAULT 1,
  minor_version integer NOT NULL DEFAULT 0,
  title text,
  notes text,
  published_by_user_id uuid REFERENCES public.users(id),
  published_at timestamptz DEFAULT now(),
  visible_to_clients boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage platform versions"
  ON public.platform_versions FOR ALL
  USING (is_ss_role()) WITH CHECK (is_ss_role());

CREATE POLICY "Authenticated can view platform versions"
  ON public.platform_versions FOR SELECT
  USING (true);

-- Universal inbox table
CREATE TABLE public.universal_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text,
  title text,
  raw_input_text text,
  attachment_url text,
  voice_transcript text,
  suggested_client text,
  suggested_item_type text,
  suggested_content_type text,
  suggested_priority text,
  suggested_assignee text,
  suggested_project text,
  suggested_subproject text,
  agent_confidence numeric,
  status text NOT NULL DEFAULT 'new',
  converted_to_type text,
  converted_to_id uuid,
  created_by_user_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.universal_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can manage universal inbox"
  ON public.universal_inbox FOR ALL
  USING (is_ss_role()) WITH CHECK (is_ss_role());

-- Seed initial V1.0 version
INSERT INTO public.platform_versions (major_version, minor_version, title, notes, visible_to_clients)
VALUES (1, 0, 'V1.0 Launch', 'Initial production release of Stay Social HUB.', true);

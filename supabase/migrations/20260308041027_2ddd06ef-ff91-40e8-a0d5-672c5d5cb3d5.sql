
-- Team settings (single-row config)
CREATE TABLE public.team_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_revenue numeric NOT NULL DEFAULT 0,
  next_milestone numeric NOT NULL DEFAULT 0,
  bonus_pool numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can view team settings" ON public.team_settings FOR SELECT USING (public.is_ss_role());
CREATE POLICY "SS admin can insert team settings" ON public.team_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ss_admin'));
CREATE POLICY "SS admin can update team settings" ON public.team_settings FOR UPDATE USING (public.has_role(auth.uid(), 'ss_admin'));

-- Team roles config
CREATE TABLE public.team_roles_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  title text,
  responsibilities jsonb DEFAULT '[]'::jsonb,
  mission text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_roles_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can view team roles config" ON public.team_roles_config FOR SELECT USING (public.is_ss_role());
CREATE POLICY "SS admin can manage team roles config" ON public.team_roles_config FOR ALL USING (public.has_role(auth.uid(), 'ss_admin')) WITH CHECK (public.has_role(auth.uid(), 'ss_admin'));

-- Team growth tracks
CREATE TABLE public.team_growth_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  track_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_growth_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can view team growth tracks" ON public.team_growth_tracks FOR SELECT USING (public.is_ss_role());
CREATE POLICY "SS admin can manage team growth tracks" ON public.team_growth_tracks FOR ALL USING (public.has_role(auth.uid(), 'ss_admin')) WITH CHECK (public.has_role(auth.uid(), 'ss_admin'));

-- Team wins
CREATE TABLE public.team_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid NOT NULL
);
ALTER TABLE public.team_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SS can view team wins" ON public.team_wins FOR SELECT USING (public.is_ss_role());
CREATE POLICY "SS admin can insert team wins" ON public.team_wins FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ss_admin'));
CREATE POLICY "SS admin can delete team wins" ON public.team_wins FOR DELETE USING (public.has_role(auth.uid(), 'ss_admin'));

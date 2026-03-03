
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('client_admin', 'client_assistant', 'ss_admin', 'ss_producer', 'ss_ops');

-- Enum for post status columns
CREATE TYPE public.post_status AS ENUM (
  'new_requests',
  'content_process',
  'design_process',
  'request_changes',
  'content_for_approval',
  'approved',
  'in_the_queue',
  'published'
);

-- Enum for approval types
CREATE TYPE public.approval_type AS ENUM ('approve', 'approve_with_notes', 'request_changes');

-- Enum for request types
CREATE TYPE public.request_type AS ENUM ('social_post', 'email_campaign');

-- Enum for request status
CREATE TYPE public.request_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- Enum for profile update request status
CREATE TYPE public.profile_update_status AS ENUM ('pending', 'approved', 'changes_requested', 'rejected');

-- Plans table
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  includes_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plan_id UUID REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  assistants_can_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Users table (app-level user profile, linked to auth.users)
CREATE TABLE public.users (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  client_id UUID REFERENCES public.clients(id),
  parent_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from users)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  title TEXT NOT NULL,
  platform TEXT,
  scheduled_at TIMESTAMPTZ,
  caption TEXT,
  hashtags TEXT,
  creative_url TEXT,
  status_column post_status NOT NULL DEFAULT 'new_requests',
  created_by_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Post versions table
CREATE TABLE public.post_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  creative_url TEXT,
  caption TEXT,
  hashtags TEXT,
  created_by_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_versions ENABLE ROW LEVEL SECURITY;

-- Comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  request_id UUID,
  user_id UUID NOT NULL REFERENCES public.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Approvals table
CREATE TABLE public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  type approval_type NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- Requests table
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  type request_type NOT NULL,
  topic TEXT NOT NULL,
  notes TEXT,
  attachments_url TEXT,
  preferred_publish_window TEXT,
  priority TEXT DEFAULT 'normal',
  status request_status NOT NULL DEFAULT 'open',
  created_by_user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
-- Add FK from comments to requests
ALTER TABLE public.comments ADD CONSTRAINT comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;

-- Client profile table
CREATE TABLE public.client_profile (
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE PRIMARY KEY,
  business_info_json JSONB DEFAULT '{}'::jsonb,
  brand_voice_json JSONB DEFAULT '{}'::jsonb,
  offers_json JSONB DEFAULT '{}'::jsonb,
  content_prefs_json JSONB DEFAULT '{}'::jsonb,
  assets_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_profile ENABLE ROW LEVEL SECURITY;

-- Profile update requests table
CREATE TABLE public.profile_update_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  submitted_by_user_id UUID NOT NULL REFERENCES public.users(id),
  proposed_profile_json JSONB NOT NULL,
  status profile_update_status NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_by_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;

-- ===== SECURITY DEFINER HELPER FUNCTIONS =====

-- Check if current user has any SS role
CREATE OR REPLACE FUNCTION public.is_ss_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('ss_admin', 'ss_producer', 'ss_ops')
  )
$$;

-- Check if current user belongs to a specific client
CREATE OR REPLACE FUNCTION public.is_client_member(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND client_id = _client_id
  )
$$;

-- Check if current user can access a client's data (SS or member)
CREATE OR REPLACE FUNCTION public.can_access_client(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_ss_role() OR public.is_client_member(_client_id)
$$;

-- Check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get current user's client_id
CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.users WHERE id = auth.uid()
$$;

-- ===== RLS POLICIES =====

-- Plans: everyone authenticated can read, SS can manage
CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "SS can manage plans" ON public.plans FOR ALL TO authenticated USING (public.is_ss_role()) WITH CHECK (public.is_ss_role());

-- Clients: SS sees all, client members see their own
CREATE POLICY "View own client or SS sees all" ON public.clients FOR SELECT TO authenticated
  USING (public.is_ss_role() OR public.is_client_member(id));
CREATE POLICY "SS can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_ss_role());
CREATE POLICY "SS can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_ss_role()) WITH CHECK (public.is_ss_role());
CREATE POLICY "SS can delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- Users: SS sees all, client members see own client's users
CREATE POLICY "View users" ON public.users FOR SELECT TO authenticated
  USING (public.is_ss_role() OR public.is_client_member(client_id));
CREATE POLICY "SS can insert users" ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.is_ss_role() OR (auth.uid() = id));
CREATE POLICY "Update own user or SS" ON public.users FOR UPDATE TO authenticated
  USING (public.is_ss_role() OR id = auth.uid());
CREATE POLICY "SS can delete users" ON public.users FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- User roles: SS sees all, client members see own client's roles
CREATE POLICY "View user roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_ss_role() OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_roles.user_id AND public.is_client_member(u.client_id)
  ));
CREATE POLICY "SS can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_ss_role()) WITH CHECK (public.is_ss_role());

-- Posts: SS sees all, client members see own client's posts
CREATE POLICY "View posts" ON public.posts FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));
CREATE POLICY "SS can insert posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (public.is_ss_role());
CREATE POLICY "Update posts" ON public.posts FOR UPDATE TO authenticated
  USING (public.can_access_client(client_id));
CREATE POLICY "SS can delete posts" ON public.posts FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- Post versions
CREATE POLICY "View post versions" ON public.post_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_access_client(p.client_id)));
CREATE POLICY "SS can insert post versions" ON public.post_versions FOR INSERT TO authenticated
  WITH CHECK (public.is_ss_role());
CREATE POLICY "SS can update post versions" ON public.post_versions FOR UPDATE TO authenticated
  USING (public.is_ss_role());
CREATE POLICY "SS can delete post versions" ON public.post_versions FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- Comments: accessible if you can access the post's/request's client
CREATE POLICY "View comments" ON public.comments FOR SELECT TO authenticated
  USING (
    public.is_ss_role()
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_access_client(p.client_id))
    OR EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND public.can_access_client(r.client_id))
  );
CREATE POLICY "Insert comments" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      public.is_ss_role()
      OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_access_client(p.client_id))
      OR EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND public.can_access_client(r.client_id))
    )
  );
CREATE POLICY "SS can delete comments" ON public.comments FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- Approvals
CREATE POLICY "View approvals" ON public.approvals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_access_client(p.client_id)));
CREATE POLICY "Insert approvals" ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.can_access_client(p.client_id)));
CREATE POLICY "SS can delete approvals" ON public.approvals FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- Requests
CREATE POLICY "View requests" ON public.requests FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));
CREATE POLICY "Insert requests" ON public.requests FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid() AND public.can_access_client(client_id));
CREATE POLICY "Update requests" ON public.requests FOR UPDATE TO authenticated
  USING (public.can_access_client(client_id));
CREATE POLICY "SS can delete requests" ON public.requests FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- Client profile
CREATE POLICY "View client profile" ON public.client_profile FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));
CREATE POLICY "SS can insert client profile" ON public.client_profile FOR INSERT TO authenticated
  WITH CHECK (public.is_ss_role());
CREATE POLICY "Update client profile" ON public.client_profile FOR UPDATE TO authenticated
  USING (public.is_ss_role());
CREATE POLICY "SS can delete client profile" ON public.client_profile FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- Profile update requests
CREATE POLICY "View profile update requests" ON public.profile_update_requests FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));
CREATE POLICY "Insert profile update requests" ON public.profile_update_requests FOR INSERT TO authenticated
  WITH CHECK (submitted_by_user_id = auth.uid() AND public.can_access_client(client_id));
CREATE POLICY "Update profile update requests" ON public.profile_update_requests FOR UPDATE TO authenticated
  USING (public.is_ss_role());
CREATE POLICY "SS can delete profile update requests" ON public.profile_update_requests FOR DELETE TO authenticated
  USING (public.is_ss_role());

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public) VALUES ('creative-assets', 'creative-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('request-attachments', 'request-attachments', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-assets', 'profile-assets', true);

-- Storage policies for creative-assets (public read, authenticated upload by client path)
CREATE POLICY "Public read creative assets" ON storage.objects FOR SELECT USING (bucket_id = 'creative-assets');
CREATE POLICY "Authenticated upload creative assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'creative-assets');
CREATE POLICY "Authenticated update creative assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'creative-assets');
CREATE POLICY "SS delete creative assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'creative-assets' AND public.is_ss_role());

-- Storage policies for request-attachments
CREATE POLICY "Auth read request attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'request-attachments');
CREATE POLICY "Auth upload request attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-attachments');
CREATE POLICY "SS delete request attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'request-attachments' AND public.is_ss_role());

-- Storage policies for profile-assets
CREATE POLICY "Public read profile assets" ON storage.objects FOR SELECT USING (bucket_id = 'profile-assets');
CREATE POLICY "Auth upload profile assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-assets');
CREATE POLICY "Auth update profile assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-assets');
CREATE POLICY "SS delete profile assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-assets' AND public.is_ss_role());

-- ===== TRIGGER: Auto-create user record on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===== INDEXES =====
CREATE INDEX idx_posts_client_id ON public.posts(client_id);
CREATE INDEX idx_posts_status ON public.posts(status_column);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_request_id ON public.comments(request_id);
CREATE INDEX idx_approvals_post_id ON public.approvals(post_id);
CREATE INDEX idx_requests_client_id ON public.requests(client_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_users_client_id ON public.users(client_id);

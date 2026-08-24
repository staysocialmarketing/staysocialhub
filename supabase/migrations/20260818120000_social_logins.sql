-- Social Logins Portal — Aug 18 2026
-- Secure client credential storage with pgcrypto encryption

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Main table
CREATE TABLE IF NOT EXISTS public.client_social_logins (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'google', 'tiktok', 'other')),
  username        TEXT        NOT NULL DEFAULT '',
  encrypted_password TEXT     NOT NULL DEFAULT '',
  notes           TEXT        DEFAULT '',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_client_social_logins_client ON public.client_social_logins(client_id);
CREATE INDEX IF NOT EXISTS idx_client_social_logins_platform ON public.client_social_logins(platform);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_social_login_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_social_login_updated_at
  BEFORE UPDATE ON public.client_social_logins
  FOR EACH ROW EXECUTE FUNCTION public.set_social_login_updated_at();

-- RLS
ALTER TABLE public.client_social_logins ENABLE ROW LEVEL SECURITY;

-- Clients can read their own rows (via users.client_id)
CREATE POLICY "clients_select_own" ON public.client_social_logins
  FOR SELECT
  USING (
    client_id = (
      SELECT u.client_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Clients can insert their own rows
CREATE POLICY "clients_insert_own" ON public.client_social_logins
  FOR INSERT
  WITH CHECK (
    client_id = (
      SELECT u.client_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Clients can update their own rows
CREATE POLICY "clients_update_own" ON public.client_social_logins
  FOR UPDATE
  USING (
    client_id = (
      SELECT u.client_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    client_id = (
      SELECT u.client_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- SS admin/team can read all rows
CREATE POLICY "ss_team_select_all" ON public.client_social_logins
  FOR SELECT
  USING (public.is_ss_role());

-- SS admin can delete (clients cannot)
CREATE POLICY "ss_admin_delete" ON public.client_social_logins
  FOR DELETE
  USING (public.is_ss_role());

-- ---------------------------------------------------------------------------
-- pgcrypto helper functions — called by edge function with server-side key
-- SECURITY DEFINER so they run with elevated privileges
-- The encryption key is passed as a parameter FROM the edge function only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_text(plaintext TEXT, key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(pgp_sym_encrypt(plaintext, key)::bytea, 'base64');
$$;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_text(ciphertext TEXT, key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT pgp_sym_decrypt(decode(ciphertext, 'base64')::bytea, key)::text;
$$;

-- Restrict RPC execution to authenticated users only (edge function uses service role so this is always satisfied)
REVOKE ALL ON FUNCTION public.pgp_sym_encrypt_text(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pgp_sym_decrypt_text(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pgp_sym_encrypt_text(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.pgp_sym_decrypt_text(TEXT, TEXT) TO service_role;

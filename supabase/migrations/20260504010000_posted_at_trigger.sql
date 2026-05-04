-- Set posted_at automatically via DB trigger
-- When a post's status_column changes to 'published' or 'sent', record the timestamp.
-- This is more reliable than setting it from the app layer (avoids PostgREST schema cache issues).

CREATE OR REPLACE FUNCTION public.fn_set_posted_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status_column IN ('published', 'sent')
     AND OLD.status_column IS DISTINCT FROM NEW.status_column THEN
    NEW.posted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_posted_at ON public.posts;
CREATE TRIGGER trg_set_posted_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_posted_at();

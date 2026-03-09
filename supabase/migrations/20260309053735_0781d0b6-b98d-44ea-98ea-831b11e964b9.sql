-- Create a private voice-notes bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Allow SS roles to upload voice notes
CREATE POLICY "SS can upload voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes' AND public.is_ss_role()
);

-- Allow SS roles and client members to upload voice notes to their client folder
CREATE POLICY "Clients can upload own voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes' AND
  (storage.foldername(name))[1] = (public.get_my_client_id())::text
);

-- Allow authenticated users to read voice notes they have access to (SS or own client)
CREATE POLICY "Read voice notes with access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-notes' AND (
    public.is_ss_role() OR
    (storage.foldername(name))[1] = (public.get_my_client_id())::text
  )
);

-- Allow SS to delete voice notes
CREATE POLICY "SS can delete voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes' AND public.is_ss_role()
);
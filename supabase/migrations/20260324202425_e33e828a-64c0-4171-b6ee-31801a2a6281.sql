-- Ensure users can always read their own profile row
ALTER POLICY "View users"
ON public.users
USING (
  id = auth.uid()
  OR is_ss_role()
  OR is_client_member(client_id)
);

-- Ensure users can always read their own role rows
ALTER POLICY "View user roles"
ON public.user_roles
USING (
  user_id = auth.uid()
  OR is_ss_role()
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = user_roles.user_id
      AND is_client_member(u.client_id)
  )
);
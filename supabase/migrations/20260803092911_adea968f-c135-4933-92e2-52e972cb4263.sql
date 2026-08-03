-- 1) Restrict profile reads to self, admins and super admins
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2) Remove direct executability of SECURITY DEFINER helper functions.
-- has_role keeps EXECUTE because RLS policies evaluate it as the querying role.
REVOKE ALL ON FUNCTION public.current_role_label(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.sync_profile_from_employee() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.current_role_label(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_from_employee() TO service_role;
GRANT EXECUTE ON FUNCTION public.tg_set_updated_at() TO service_role;
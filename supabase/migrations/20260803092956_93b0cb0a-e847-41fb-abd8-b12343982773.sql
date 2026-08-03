CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate every policy that used public.has_role
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "user_roles_select_self_or_super" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_super"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select"
ON public.employees FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
  OR employee_id = (SELECT p.employee_id FROM public.profiles p WHERE p.id = auth.uid())
);

DROP POLICY IF EXISTS "employees_write_super" ON public.employees;
CREATE POLICY "employees_write_super"
ON public.employees FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "perf_select" ON public.monthly_performance;
CREATE POLICY "perf_select"
ON public.monthly_performance FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
  OR employee_id = (SELECT p.employee_id FROM public.profiles p WHERE p.id = auth.uid())
);

DROP POLICY IF EXISTS "perf_write_admin" ON public.monthly_performance;
CREATE POLICY "perf_write_admin"
ON public.monthly_performance FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Internal helpers now use the private version and are no longer API-callable
CREATE OR REPLACE FUNCTION public.current_role_label(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'user' THEN 3
    WHEN 'no_access' THEN 4
  END LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_role_label(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.current_role_label(uuid) TO service_role;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
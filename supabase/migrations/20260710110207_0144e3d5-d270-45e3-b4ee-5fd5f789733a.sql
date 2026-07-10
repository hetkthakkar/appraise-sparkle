
CREATE OR REPLACE FUNCTION public.sync_profile_from_employee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
    SET employee_id = NEW.employee_id, location = COALESCE(location, NEW.location)
    WHERE lower(email) = lower(NEW.email);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_profile_from_emp
AFTER INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_employee();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_to_assign public.app_role := 'no_access';
  is_first BOOLEAN;
  emp RECORD;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN role_to_assign := 'super_admin'; END IF;

  SELECT employee_id, location INTO emp FROM public.employees WHERE lower(email) = lower(NEW.email) LIMIT 1;

  INSERT INTO public.profiles (id, email, name, avatar_url, employee_id, location)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    emp.employee_id,
    emp.location
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, role_to_assign);
  RETURN NEW;
END; $$;

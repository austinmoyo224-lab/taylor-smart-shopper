CREATE OR REPLACE FUNCTION public.prevent_profile_account_type_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    IF current_user IN ('service_role','postgres','supabase_admin') THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Account type can only be changed by an administrator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_account_type_self_update ON public.profiles;
CREATE TRIGGER prevent_profile_account_type_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_account_type_self_update();
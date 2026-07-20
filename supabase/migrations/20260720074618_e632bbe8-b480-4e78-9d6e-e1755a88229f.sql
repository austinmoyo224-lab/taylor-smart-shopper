CREATE OR REPLACE FUNCTION private.guard_store_onboarding_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Allow service_role (server-side admin client) and internal/superuser contexts
  IF v_role = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.organisation_id IS DISTINCT FROM OLD.organisation_id
     OR NEW.store_id IS DISTINCT FROM OLD.store_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify admin-managed fields on onboarding request';
  END IF;

  RETURN NEW;
END;
$function$;
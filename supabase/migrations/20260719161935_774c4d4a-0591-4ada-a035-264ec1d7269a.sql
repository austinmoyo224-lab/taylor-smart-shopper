
CREATE OR REPLACE FUNCTION private.guard_store_onboarding_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Non-admin applicants: freeze admin-managed columns
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
$$;

DROP TRIGGER IF EXISTS trg_guard_store_onboarding_update ON public.store_onboarding_requests;
CREATE TRIGGER trg_guard_store_onboarding_update
BEFORE UPDATE ON public.store_onboarding_requests
FOR EACH ROW EXECUTE FUNCTION private.guard_store_onboarding_update();

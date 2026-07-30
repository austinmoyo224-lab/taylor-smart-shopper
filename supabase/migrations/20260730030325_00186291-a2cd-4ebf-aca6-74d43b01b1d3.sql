CREATE OR REPLACE FUNCTION public.prevent_rider_verification_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Trusted server-side (service_role) writes bypass this guard; the
  -- application verifies super_admin before performing them.
  IF auth.role() = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.is_verified      IS DISTINCT FROM OLD.is_verified
  OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
  OR NEW.verified_at      IS DISTINCT FROM OLD.verified_at
  OR NEW.verified_by      IS DISTINCT FROM OLD.verified_by
  OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
  OR NEW.rating           IS DISTINCT FROM OLD.rating THEN
    RAISE EXCEPTION 'Only super admins can modify verification or rating fields';
  END IF;

  RETURN NEW;
END;
$$;
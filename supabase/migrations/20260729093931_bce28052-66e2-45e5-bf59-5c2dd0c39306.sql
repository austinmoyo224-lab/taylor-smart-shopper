
-- Replace the overly-broad self-management policy with per-command policies
-- that block riders from editing verification/trust fields.
DROP POLICY IF EXISTS "Riders manage their own profile" ON public.delivery_riders;

CREATE POLICY "Riders view their own profile"
  ON public.delivery_riders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Riders insert their own profile"
  ON public.delivery_riders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Riders delete their own profile"
  ON public.delivery_riders
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Riders update their own profile"
  ON public.delivery_riders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger blocks non-super-admin writes to verification/trust columns.
CREATE OR REPLACE FUNCTION public.prevent_rider_verification_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
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

DROP TRIGGER IF EXISTS trg_prevent_rider_verification_self_update ON public.delivery_riders;
CREATE TRIGGER trg_prevent_rider_verification_self_update
  BEFORE UPDATE ON public.delivery_riders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_rider_verification_self_update();

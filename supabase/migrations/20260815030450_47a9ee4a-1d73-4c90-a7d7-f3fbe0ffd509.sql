-- Re-assert column-level UPDATE grants: riders may only write safe fields
REVOKE UPDATE ON public.delivery_riders FROM authenticated;
REVOKE UPDATE ON public.delivery_riders FROM anon;
REVOKE ALL ON public.delivery_riders FROM anon;
GRANT UPDATE (full_name, phone_e164, vehicle_type, vehicle_registration, id_number, service_city, service_area, bio, is_available, metadata, updated_at)
  ON public.delivery_riders TO authenticated;

-- Replace the permissive self-update policy with one that also revalidates
-- protected verification fields against their stored values.
DROP POLICY IF EXISTS "Riders update their own safe profile fields" ON public.delivery_riders;

CREATE POLICY "Riders update only safe profile fields"
ON public.delivery_riders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.delivery_riders old
    WHERE old.id = delivery_riders.id
      AND old.is_verified IS NOT DISTINCT FROM delivery_riders.is_verified
      AND old.verification_status IS NOT DISTINCT FROM delivery_riders.verification_status
      AND old.verified_at IS NOT DISTINCT FROM delivery_riders.verified_at
      AND old.verified_by IS NOT DISTINCT FROM delivery_riders.verified_by
      AND old.rejection_reason IS NOT DISTINCT FROM delivery_riders.rejection_reason
      AND old.rating IS NOT DISTINCT FROM delivery_riders.rating
      AND old.user_id IS NOT DISTINCT FROM delivery_riders.user_id
  )
);

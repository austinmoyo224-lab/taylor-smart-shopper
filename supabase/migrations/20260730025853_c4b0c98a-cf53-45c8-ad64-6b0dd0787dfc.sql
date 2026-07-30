-- Column-level UPDATE grants: riders may only change safe profile columns.
REVOKE UPDATE ON public.delivery_riders FROM authenticated;

GRANT UPDATE (
  full_name,
  phone_e164,
  vehicle_type,
  vehicle_registration,
  id_number,
  service_city,
  service_area,
  bio,
  is_available,
  updated_at
) ON public.delivery_riders TO authenticated;

GRANT ALL ON public.delivery_riders TO service_role;

-- Keep the self-update RLS policy explicitly scoped to riders' own rows.
DROP POLICY IF EXISTS "Riders update their own profile" ON public.delivery_riders;
CREATE POLICY "Riders update their own safe profile fields"
ON public.delivery_riders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
-- Column-level hardening: riders may only update their own safe profile fields.
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
  metadata,
  updated_at
) ON public.delivery_riders TO authenticated;

GRANT ALL ON public.delivery_riders TO service_role;

COMMENT ON TABLE public.delivery_riders IS
  'Rider profiles. Verification fields (is_verified, verification_status, verified_at, verified_by, rejection_reason) and rating are admin-only: enforced by column-level grants plus the trg_prevent_rider_verification_self_update trigger.';
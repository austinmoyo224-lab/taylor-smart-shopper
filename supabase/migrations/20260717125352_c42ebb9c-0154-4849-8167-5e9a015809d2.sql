
-- 1. Hidden schema for SECURITY DEFINER helpers so PostgREST cannot expose them as RPCs.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.has_role_in_org(uuid, public.app_role, uuid) SET SCHEMA private;
ALTER FUNCTION public.current_user_orgs() SET SCHEMA private;
ALTER FUNCTION public.is_household_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

-- Ensure RLS policies can still invoke these helpers.
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role_in_org(uuid, public.app_role, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_orgs() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_household_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role_in_org(uuid, public.app_role, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_orgs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_household_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.handle_new_user() TO service_role;

-- 2. Household membership: forbid self-join via RLS. Only server-side admin path
--    (redeeming a valid invite) may insert rows into household_members.
DROP POLICY IF EXISTS "User joins household" ON public.household_members;

-- 3. QR codes: drop blanket public read. Lookups happen through server
--    functions using the service-role client and a slug they already possess.
DROP POLICY IF EXISTS "Active QR codes public read by slug" ON public.qr_codes;
REVOKE SELECT ON public.qr_codes FROM anon;

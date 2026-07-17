
-- Revoke default PUBLIC execute (which includes anon) from all SECURITY DEFINER helpers.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role_in_org(uuid, public.app_role, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_orgs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Grant execute only where needed (RLS policies run as `authenticated`).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_org(uuid, public.app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_orgs() TO authenticated;
-- handle_new_user is only invoked by the auth.users trigger — no user role needs execute.

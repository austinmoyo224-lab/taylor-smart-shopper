REVOKE EXECUTE ON FUNCTION public.can_manage_store(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_store(uuid, uuid) TO authenticated, service_role;
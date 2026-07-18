DROP POLICY IF EXISTS "store_assets_org_upload" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_org_read" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_org_update" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_org_delete" ON storage.objects;
DROP POLICY IF EXISTS "store-assets read for org members" ON storage.objects;
DROP POLICY IF EXISTS "store-assets insert for org members" ON storage.objects;
DROP POLICY IF EXISTS "store-assets update for org members" ON storage.objects;
DROP POLICY IF EXISTS "store-assets delete for org members" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_read_for_org_or_store_members" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_insert_for_org_or_store_members" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_update_for_org_or_store_members" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_delete_for_org_or_store_members" ON storage.objects;

CREATE POLICY "store_assets_read_for_org_or_store_members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organisation_id::text = split_part(name, '/', 1)
    )
    OR EXISTS (
      SELECT 1
      FROM public.store_staff ss
      JOIN public.stores s ON s.id = ss.store_id
      WHERE ss.user_id = auth.uid()
        AND ss.is_active = true
        AND s.deleted_at IS NULL
        AND s.organisation_id::text = split_part(name, '/', 1)
        AND s.id::text = split_part(name, '/', 2)
    )
  )
);

CREATE POLICY "store_assets_insert_for_org_or_store_members"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organisation_id::text = split_part(name, '/', 1)
    )
    OR EXISTS (
      SELECT 1
      FROM public.store_staff ss
      JOIN public.stores s ON s.id = ss.store_id
      WHERE ss.user_id = auth.uid()
        AND ss.is_active = true
        AND s.deleted_at IS NULL
        AND s.organisation_id::text = split_part(name, '/', 1)
        AND s.id::text = split_part(name, '/', 2)
    )
  )
);

CREATE POLICY "store_assets_update_for_org_or_store_members"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organisation_id::text = split_part(name, '/', 1)
    )
    OR EXISTS (
      SELECT 1
      FROM public.store_staff ss
      JOIN public.stores s ON s.id = ss.store_id
      WHERE ss.user_id = auth.uid()
        AND ss.is_active = true
        AND s.deleted_at IS NULL
        AND s.organisation_id::text = split_part(name, '/', 1)
        AND s.id::text = split_part(name, '/', 2)
    )
  )
);

CREATE POLICY "store_assets_delete_for_org_or_store_members"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organisation_id::text = split_part(name, '/', 1)
    )
    OR EXISTS (
      SELECT 1
      FROM public.store_staff ss
      JOIN public.stores s ON s.id = ss.store_id
      WHERE ss.user_id = auth.uid()
        AND ss.is_active = true
        AND s.deleted_at IS NULL
        AND s.organisation_id::text = split_part(name, '/', 1)
        AND s.id::text = split_part(name, '/', 2)
    )
  )
);
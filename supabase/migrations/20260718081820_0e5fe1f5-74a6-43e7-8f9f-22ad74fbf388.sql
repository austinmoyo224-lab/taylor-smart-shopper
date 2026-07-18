
DROP POLICY IF EXISTS "store_assets_org_upload" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_org_read" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_org_update" ON storage.objects;
DROP POLICY IF EXISTS "store_assets_org_delete" ON storage.objects;

CREATE POLICY "store_assets_org_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organisation_id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "store_assets_org_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organisation_id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "store_assets_org_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organisation_id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "store_assets_org_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organisation_id::text = split_part(name, '/', 1)
  )
);

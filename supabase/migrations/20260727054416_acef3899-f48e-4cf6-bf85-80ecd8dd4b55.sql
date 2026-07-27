-- Recipe images bucket: scope reads to published/shareable recipes or owner
DROP POLICY IF EXISTS recipe_images_read_authenticated ON storage.objects;
DROP POLICY IF EXISTS recipe_images_read_anon ON storage.objects;

CREATE POLICY recipe_images_read_public
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'recipe-images'
  AND EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.id::text = split_part(objects.name, '/', 1)
      AND (r.is_published = true OR r.is_shareable = true)
  )
);

CREATE POLICY recipe_images_read_owner
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.id::text = split_part(objects.name, '/', 1)
      AND r.user_id = auth.uid()
  )
);

-- Store departments: scope reads to store staff / org retailer admins / super admin
DROP POLICY IF EXISTS "Departments follow store visibility" ON public.store_departments;

CREATE POLICY "Departments visible to store staff and admins"
ON public.store_departments
FOR SELECT
TO authenticated
USING (
  public.can_manage_store(auth.uid(), store_id)
);

-- Path convention: <organisation_id>/<store_id-or-shared>/<filename>
-- Access is granted when the first path segment is an org the user belongs to,
-- or the user is a super_admin.

CREATE POLICY "store-assets read for org members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin')
    OR (
      (storage.foldername(name))[1]::uuid IN (SELECT private.current_user_orgs())
    )
  )
);

CREATE POLICY "store-assets insert for org members"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin')
    OR (
      (storage.foldername(name))[1]::uuid IN (SELECT private.current_user_orgs())
    )
  )
);

CREATE POLICY "store-assets update for org members"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin')
    OR (
      (storage.foldername(name))[1]::uuid IN (SELECT private.current_user_orgs())
    )
  )
);

CREATE POLICY "store-assets delete for org members"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    private.has_role(auth.uid(), 'super_admin')
    OR (
      (storage.foldername(name))[1]::uuid IN (SELECT private.current_user_orgs())
    )
  )
);

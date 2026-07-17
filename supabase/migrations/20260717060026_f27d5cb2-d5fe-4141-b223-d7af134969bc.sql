-- Enable trigram search if not already present (used for matching detected items to products)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast fuzzy-name lookup on products for Taylor Vision matching
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);

-- Vision uploads are private: only the owner can read/write their own objects.
CREATE POLICY "Authenticated users can select own vision uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vision-uploads' AND owner = auth.uid());

CREATE POLICY "Authenticated users can insert own vision uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vision-uploads' AND owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can update own vision uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vision-uploads' AND owner = auth.uid())
WITH CHECK (bucket_id = 'vision-uploads' AND owner = auth.uid());

CREATE POLICY "Authenticated users can delete own vision uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vision-uploads' AND owner = auth.uid());
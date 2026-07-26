
CREATE POLICY "recipe_images_read_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'recipe-images');
CREATE POLICY "recipe_images_read_anon" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'recipe-images');

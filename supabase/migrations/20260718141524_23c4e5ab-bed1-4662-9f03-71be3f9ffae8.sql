
-- Taylor Knowledge Base
CREATE TABLE public.taylor_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taylor_knowledge TO authenticated;
GRANT ALL ON public.taylor_knowledge TO service_role;
ALTER TABLE public.taylor_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manage taylor_knowledge"
  ON public.taylor_knowledge FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

CREATE TRIGGER taylor_knowledge_updated_at
  BEFORE UPDATE ON public.taylor_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.taylor_touch_updated_at();

-- Storage policies for admin-vault (super_admin only)
CREATE POLICY "super_admin read admin-vault"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'admin-vault'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY "super_admin write admin-vault"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'admin-vault'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY "super_admin update admin-vault"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'admin-vault'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY "super_admin delete admin-vault"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'admin-vault'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

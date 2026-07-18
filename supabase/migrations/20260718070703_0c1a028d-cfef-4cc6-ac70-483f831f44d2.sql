
CREATE TABLE public.taylor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Taylor',
  tagline TEXT DEFAULT 'Your AI shopping companion',
  avatar_url TEXT,
  voice TEXT NOT NULL DEFAULT 'shimmer',
  personality_traits TEXT,
  system_prompt_addon TEXT,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taylor_settings TO authenticated;
GRANT ALL ON public.taylor_settings TO service_role;
ALTER TABLE public.taylor_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed reads Taylor settings" ON public.taylor_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage Taylor settings" ON public.taylor_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (private.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.taylor_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  ideal_response TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taylor_training_examples TO authenticated;
GRANT ALL ON public.taylor_training_examples TO service_role;
ALTER TABLE public.taylor_training_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage Taylor training" ON public.taylor_training_examples
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (private.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.taylor_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER taylor_settings_touch BEFORE UPDATE ON public.taylor_settings
  FOR EACH ROW EXECUTE FUNCTION public.taylor_touch_updated_at();
CREATE TRIGGER taylor_training_touch BEFORE UPDATE ON public.taylor_training_examples
  FOR EACH ROW EXECUTE FUNCTION public.taylor_touch_updated_at();

INSERT INTO public.taylor_settings (singleton, display_name, tagline)
VALUES (true, 'Taylor', 'Your AI shopping companion')
ON CONFLICT (singleton) DO NOTHING;

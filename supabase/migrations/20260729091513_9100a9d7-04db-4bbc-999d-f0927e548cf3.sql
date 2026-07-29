-- Extend enums
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'delivery_boy';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_boy';

-- Rider profile table
CREATE TABLE IF NOT EXISTS public.delivery_riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_e164 text,
  vehicle_type text NOT NULL DEFAULT 'motorbike',
  vehicle_registration text,
  id_number text,
  service_city text,
  service_area text,
  bio text,
  is_available boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  rating numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.delivery_riders TO authenticated;
GRANT ALL ON public.delivery_riders TO service_role;

ALTER TABLE public.delivery_riders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders manage their own profile"
  ON public.delivery_riders FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins view all riders"
  ON public.delivery_riders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

CREATE POLICY "Super admins update riders"
  ON public.delivery_riders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'));

CREATE TRIGGER delivery_riders_touch_updated_at
  BEFORE UPDATE ON public.delivery_riders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS delivery_riders_city_idx ON public.delivery_riders (service_city) WHERE is_verified = true;

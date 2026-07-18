-- Profile account type
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('user', 'store_owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_type NOT NULL DEFAULT 'user';

-- Store onboarding requests
CREATE TABLE IF NOT EXISTS public.store_onboarding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Business basics
  business_name TEXT NOT NULL,
  trading_name TEXT,
  business_type TEXT NOT NULL DEFAULT 'independent',
  business_email TEXT,
  contact_phone TEXT,
  proposed_slug TEXT NOT NULL,
  -- Store details
  store_name TEXT NOT NULL,
  store_address TEXT,
  store_city TEXT,
  store_province TEXT,
  trading_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Branding
  logo_url TEXT,
  brand_color TEXT,
  short_description TEXT,
  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sor_user ON public.store_onboarding_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sor_status ON public.store_onboarding_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.store_onboarding_requests TO authenticated;
GRANT ALL ON public.store_onboarding_requests TO service_role;

ALTER TABLE public.store_onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Owner can read own requests
CREATE POLICY "own_read" ON public.store_onboarding_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- Owner can insert own request
CREATE POLICY "own_insert" ON public.store_onboarding_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner can update own pending; super_admin can update any
CREATE POLICY "own_or_admin_update" ON public.store_onboarding_requests
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    (user_id = auth.uid() AND status = 'pending')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE TRIGGER trg_sor_updated
  BEFORE UPDATE ON public.store_onboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
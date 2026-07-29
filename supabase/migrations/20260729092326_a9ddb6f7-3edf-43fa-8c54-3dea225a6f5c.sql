-- 1) Rider verification workflow
DO $$ BEGIN
  CREATE TYPE public.rider_verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.delivery_riders
  ADD COLUMN IF NOT EXISTS verification_status public.rider_verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Backfill: anyone already verified counts as approved
UPDATE public.delivery_riders SET verification_status = 'approved' WHERE is_verified = true AND verification_status = 'pending';

CREATE INDEX IF NOT EXISTS delivery_riders_verification_status_idx
  ON public.delivery_riders (verification_status);

-- 2) Store orders
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending','paid','assigned','out_for_delivery','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_type AS ENUM ('pickup','delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric,
  total numeric,
  currency_code text NOT NULL DEFAULT 'ZAR',
  delivery_type public.delivery_type NOT NULL DEFAULT 'pickup',
  delivery_address text,
  delivery_notes text,
  status public.order_status NOT NULL DEFAULT 'pending',
  assigned_rider_id uuid REFERENCES public.delivery_riders(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  assigned_by uuid REFERENCES auth.users(id),
  paid_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Shoppers: own orders
CREATE POLICY "Shoppers view own orders" ON public.store_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Shoppers create own orders" ON public.store_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Store staff / retailer admins / super admins
CREATE POLICY "Store managers view store orders" ON public.store_orders
  FOR SELECT TO authenticated USING (public.can_manage_store(auth.uid(), store_id));
CREATE POLICY "Store managers update store orders" ON public.store_orders
  FOR UPDATE TO authenticated
  USING (public.can_manage_store(auth.uid(), store_id))
  WITH CHECK (public.can_manage_store(auth.uid(), store_id));

-- Assigned rider can view their orders
CREATE POLICY "Assigned rider views order" ON public.store_orders
  FOR SELECT TO authenticated USING (
    assigned_rider_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.delivery_riders r
      WHERE r.id = assigned_rider_id AND r.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS store_orders_store_status_idx ON public.store_orders (store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS store_orders_rider_idx ON public.store_orders (assigned_rider_id) WHERE assigned_rider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_orders_user_idx ON public.store_orders (user_id, created_at DESC);

CREATE TRIGGER store_orders_touch_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
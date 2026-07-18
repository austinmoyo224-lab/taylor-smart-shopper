
-- 1. taylor_settings: lock reads to super_admin only
DROP POLICY IF EXISTS "Anyone authed reads Taylor settings" ON public.taylor_settings;

CREATE POLICY "Super admins read Taylor settings"
ON public.taylor_settings FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::app_role));

-- 2. product_prices: only expose prices for available, non-deleted products
DROP POLICY IF EXISTS "Prices public read" ON public.product_prices;

CREATE POLICY "Prices public read for active products"
ON public.product_prices FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_prices.product_id
      AND p.is_available = true
      AND p.deleted_at IS NULL
  )
);

-- 3. brands: public sees only global brands; org members see their own; super admins see all
DROP POLICY IF EXISTS "Brands are public read" ON public.brands;

CREATE POLICY "Global brands public read"
ON public.brands FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL AND is_global = true);

CREATE POLICY "Org members read own brands"
ON public.brands FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND organisation_id IS NOT NULL
  AND (
    private.has_role(auth.uid(), 'super_admin'::app_role)
    OR private.has_role_in_org(auth.uid(), 'retailer_admin'::app_role, organisation_id)
    OR private.has_role_in_org(auth.uid(), 'store_manager'::app_role, organisation_id)
    OR private.has_role_in_org(auth.uid(), 'staff'::app_role, organisation_id)
  )
);

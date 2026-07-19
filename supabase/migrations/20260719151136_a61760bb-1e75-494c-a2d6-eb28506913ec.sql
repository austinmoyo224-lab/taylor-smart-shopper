-- 1) Tighten product_prices public read: authenticated only
DROP POLICY IF EXISTS "Prices public read for active products" ON public.product_prices;
CREATE POLICY "Prices read for active products"
  ON public.product_prices
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_prices.product_id
      AND p.is_available = true
      AND p.deleted_at IS NULL
  ));
REVOKE SELECT ON public.product_prices FROM anon;

-- 2) Explicit restrictive guard on user_roles INSERT/UPDATE — only super_admins.
CREATE POLICY "Only super_admins can insert roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super_admins can update roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'super_admin'::app_role));
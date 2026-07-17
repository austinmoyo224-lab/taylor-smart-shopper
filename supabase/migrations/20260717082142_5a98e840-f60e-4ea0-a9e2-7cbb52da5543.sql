DROP POLICY IF EXISTS "Active coupons visible to subscribers" ON public.coupons;
CREATE POLICY "Active coupons visible to subscribers"
ON public.coupons FOR SELECT TO authenticated
USING (
  status = 'active'::coupon_status
  AND deleted_at IS NULL
  AND (ends_at IS NULL OR ends_at > now())
  AND (
    (store_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.subscriber_store_subs s
      WHERE s.user_id = auth.uid()
        AND s.is_active
        AND s.target_type = 'store'::subscription_target
        AND s.target_id = coupons.store_id
    ))
    OR (store_id IS NULL AND EXISTS (
      SELECT 1
      FROM public.subscriber_store_subs s
      JOIN public.stores st ON st.id = s.target_id
      WHERE s.user_id = auth.uid()
        AND s.is_active
        AND s.target_type = 'store'::subscription_target
        AND st.organisation_id = coupons.organisation_id
    ))
  )
);
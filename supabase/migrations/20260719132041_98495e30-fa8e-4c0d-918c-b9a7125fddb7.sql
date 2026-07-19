
DROP POLICY IF EXISTS "Users create own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users create own redemptions"
ON public.coupon_redemptions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.coupons c
    WHERE c.id = coupon_redemptions.coupon_id
      AND c.status = 'active'::coupon_status
      AND c.deleted_at IS NULL
      AND (c.ends_at IS NULL OR c.ends_at > now())
      AND (
        (c.store_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.subscriber_store_subs s
          WHERE s.user_id = auth.uid()
            AND s.is_active
            AND s.target_type = 'store'::subscription_target
            AND s.target_id = c.store_id
        ))
        OR
        (c.store_id IS NULL AND EXISTS (
          SELECT 1 FROM public.subscriber_store_subs s
          JOIN public.stores st ON st.id = s.target_id
          WHERE s.user_id = auth.uid()
            AND s.is_active
            AND s.target_type = 'store'::subscription_target
            AND st.organisation_id = c.organisation_id
        ))
      )
  )
);

DROP POLICY IF EXISTS "Users manage own messages" ON public.messages;
CREATE POLICY "Users manage own messages"
ON public.messages
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
  )
);

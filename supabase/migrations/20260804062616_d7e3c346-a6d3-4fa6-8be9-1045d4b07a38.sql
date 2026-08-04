DROP POLICY "Anyone can log share events" ON public.recipe_share_events;
CREATE POLICY "Anyone can log share events"
ON public.recipe_share_events
FOR INSERT
WITH CHECK (
  event_type = ANY (ARRAY['share_click','share_success','link_copy','open'])
  AND (user_id IS NULL OR user_id = auth.uid())
);
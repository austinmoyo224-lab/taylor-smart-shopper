
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS recipes_shareable_slug_idx ON public.recipes (slug) WHERE is_shareable = true AND deleted_at IS NULL;

DROP POLICY IF EXISTS "Shareable recipes public" ON public.recipes;
CREATE POLICY "Shareable recipes public" ON public.recipes FOR SELECT
  USING (is_shareable = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Recipe ingredients follow shareable recipe" ON public.recipe_ingredients;
CREATE POLICY "Recipe ingredients follow shareable recipe" ON public.recipe_ingredients FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.is_shareable = true AND r.deleted_at IS NULL));

CREATE TABLE IF NOT EXISTS public.recipe_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('share_click','share_success','link_copy','open')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipe_share_events_recipe_idx ON public.recipe_share_events (recipe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recipe_share_events_type_idx ON public.recipe_share_events (event_type, created_at DESC);

GRANT SELECT, INSERT ON public.recipe_share_events TO anon, authenticated;
GRANT ALL ON public.recipe_share_events TO service_role;
ALTER TABLE public.recipe_share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log share events" ON public.recipe_share_events FOR INSERT
  WITH CHECK (event_type IN ('share_click','share_success','link_copy','open'));

CREATE POLICY "Recipe owners view their share events" ON public.recipe_share_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_share_events.recipe_id AND r.user_id = auth.uid()));

CREATE POLICY "Admins view all share events" ON public.recipe_share_events FOR SELECT
  USING (private.has_role(auth.uid(), 'super_admin'::app_role));

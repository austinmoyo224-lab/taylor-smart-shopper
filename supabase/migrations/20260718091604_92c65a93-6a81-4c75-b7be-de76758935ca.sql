
-- Allow users to own personal (Taylor-generated) recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS source text;
CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON public.recipes(user_id);

-- Owner policies on recipes
DROP POLICY IF EXISTS "Users manage own recipes" ON public.recipes;
CREATE POLICY "Users manage own recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- Owner policy on ingredients (mirrors visibility to owner)
DROP POLICY IF EXISTS "Users manage own recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Users manage own recipe ingredients" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid()));

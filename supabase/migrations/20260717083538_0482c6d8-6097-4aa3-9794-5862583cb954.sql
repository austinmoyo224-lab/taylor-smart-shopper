
-- Helper: is a user a member of a given household?
CREATE OR REPLACE FUNCTION public.is_household_member(_user_id uuid, _household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE user_id = _user_id AND household_id = _household_id
  )
$$;

-- Add household_id to shopping_lists and pantry_items
ALTER TABLE public.shopping_lists ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE SET NULL;
ALTER TABLE public.pantry_items ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shopping_lists_household_idx ON public.shopping_lists(household_id);
CREATE INDEX IF NOT EXISTS pantry_items_household_idx ON public.pantry_items(household_id);

-- Invites
CREATE TABLE IF NOT EXISTS public.household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_invites TO authenticated;
GRANT ALL ON public.household_invites TO service_role;

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view household invites" ON public.household_invites
  FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members create household invites" ON public.household_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_household_member(auth.uid(), household_id)
    AND invited_by = auth.uid()
  );

CREATE POLICY "Invited user marks used" ON public.household_invites
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Refresh households policy: any member can view; owner still manages
DROP POLICY IF EXISTS "Owner manages household" ON public.households;
CREATE POLICY "Members view household" ON public.households
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_household_member(auth.uid(), id));
CREATE POLICY "Owner inserts household" ON public.households
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner updates household" ON public.households
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner deletes household" ON public.households
  FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

-- household_members: allow members to view each other; users can insert themselves (via invite acceptance); owners can remove
DROP POLICY IF EXISTS "Household members read household" ON public.household_members;
CREATE POLICY "Members view co-members" ON public.household_members
  FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "User joins household" ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User leaves or owner removes" ON public.household_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_user_id = auth.uid())
  );

-- Shopping lists: personal OR shared with household member
DROP POLICY IF EXISTS "Users manage own lists" ON public.shopping_lists;
CREATE POLICY "Own or shared lists select" ON public.shopping_lists
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id))
  );
CREATE POLICY "Insert own list" ON public.shopping_lists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own or shared list" ON public.shopping_lists
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id))
  );
CREATE POLICY "Delete own list" ON public.shopping_lists
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Shopping list items: follow parent list
DROP POLICY IF EXISTS "Users manage own list items" ON public.shopping_list_items;
CREATE POLICY "Shared list items all" ON public.shopping_list_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists l
      WHERE l.id = shopping_list_items.list_id
        AND (l.user_id = auth.uid()
             OR (l.household_id IS NOT NULL AND public.is_household_member(auth.uid(), l.household_id)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_lists l
      WHERE l.id = shopping_list_items.list_id
        AND (l.user_id = auth.uid()
             OR (l.household_id IS NOT NULL AND public.is_household_member(auth.uid(), l.household_id)))
    )
  );

-- Pantry items: personal OR shared with household
DROP POLICY IF EXISTS "Users manage own pantry" ON public.pantry_items;
CREATE POLICY "Own or shared pantry select" ON public.pantry_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id))
  );
CREATE POLICY "Insert own pantry item" ON public.pantry_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own or shared pantry item" ON public.pantry_items
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id))
  );
CREATE POLICY "Delete own pantry item" ON public.pantry_items
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(auth.uid(), household_id))
  );

CREATE TRIGGER update_household_invites_updated_at
BEFORE UPDATE ON public.household_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

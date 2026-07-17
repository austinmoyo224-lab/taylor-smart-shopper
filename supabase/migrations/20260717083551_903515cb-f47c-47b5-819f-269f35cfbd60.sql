
DROP POLICY IF EXISTS "Invited user marks used" ON public.household_invites;
CREATE POLICY "Members or redeemer update invite" ON public.household_invites
  FOR UPDATE TO authenticated
  USING (
    public.is_household_member(auth.uid(), household_id)
    OR used_by = auth.uid()
  )
  WITH CHECK (
    public.is_household_member(auth.uid(), household_id)
    OR used_by = auth.uid()
  );

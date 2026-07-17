
-- ============ LOYALTY TRANSACTIONS (ledger) ============
CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  points numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  reason text NOT NULL,
  reference_type text,
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX loyalty_tx_user_org_idx ON public.loyalty_transactions (user_id, organisation_id, created_at DESC);
CREATE INDEX loyalty_tx_org_idx ON public.loyalty_transactions (organisation_id, created_at DESC);

GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own loyalty tx" ON public.loyalty_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR private.has_role_in_org(auth.uid(), 'retailer_admin'::app_role, organisation_id)
    OR private.has_role_in_org(auth.uid(), 'store_manager'::app_role, organisation_id));

-- ============ REWARDS CATALOGUE ============
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  points_cost numeric(14,2) NOT NULL CHECK (points_cost > 0),
  image_url text,
  stock integer,
  is_active boolean NOT NULL DEFAULT true,
  terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rewards_org_active_idx ON public.rewards (organisation_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT SELECT ON public.rewards TO anon;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active rewards" ON public.rewards
  FOR SELECT TO anon, authenticated
  USING (is_active = true
    OR private.has_role_in_org(auth.uid(), 'retailer_admin'::app_role, organisation_id)
    OR private.has_role_in_org(auth.uid(), 'store_manager'::app_role, organisation_id));

CREATE POLICY "Retailer admins manage rewards" ON public.rewards
  FOR ALL TO authenticated
  USING (private.has_role_in_org(auth.uid(), 'retailer_admin'::app_role, organisation_id))
  WITH CHECK (private.has_role_in_org(auth.uid(), 'retailer_admin'::app_role, organisation_id));

CREATE TRIGGER rewards_updated_at BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REWARD REDEMPTIONS ============
CREATE TABLE public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  points_spent numeric(14,2) NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'issued',
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reward_red_user_idx ON public.reward_redemptions (user_id, created_at DESC);
CREATE INDEX reward_red_org_idx ON public.reward_redemptions (organisation_id, created_at DESC);

GRANT SELECT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redemptions" ON public.reward_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR private.has_role_in_org(auth.uid(), 'retailer_admin'::app_role, organisation_id)
    OR private.has_role_in_org(auth.uid(), 'store_manager'::app_role, organisation_id));

-- ============ AWARD POINTS FUNCTION ============
CREATE OR REPLACE FUNCTION private.award_loyalty_points(
  _user_id uuid,
  _org_id uuid,
  _points numeric,
  _reason text,
  _ref_type text DEFAULT NULL,
  _ref_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance numeric;
BEGIN
  INSERT INTO public.loyalty_accounts (user_id, organisation_id, points)
    VALUES (_user_id, _org_id, 0)
    ON CONFLICT (user_id, organisation_id) DO NOTHING;

  UPDATE public.loyalty_accounts
    SET points = points + _points, updated_at = now()
    WHERE user_id = _user_id AND organisation_id = _org_id
    RETURNING points INTO _new_balance;

  IF _new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient loyalty points';
  END IF;

  INSERT INTO public.loyalty_transactions
    (user_id, organisation_id, points, balance_after, reason, reference_type, reference_id, metadata)
    VALUES (_user_id, _org_id, _points, _new_balance, _reason, _ref_type, _ref_id, _metadata);

  RETURN _new_balance;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.award_loyalty_points(uuid, uuid, numeric, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

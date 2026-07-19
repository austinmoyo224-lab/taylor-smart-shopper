
CREATE OR REPLACE FUNCTION public.can_manage_store(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.stores s ON s.id = _store_id
    WHERE ur.user_id = _user_id
      AND (ur.role = 'super_admin'
        OR ((ur.role IN ('retailer_admin','store_manager')) AND ur.organisation_id = s.organisation_id))
  ) OR EXISTS (
    SELECT 1 FROM public.store_staff ss
    WHERE ss.user_id = _user_id AND ss.store_id = _store_id AND ss.is_active = true
  );
$$;

-- 1) Tables (no cross-refs in policies yet)
CREATE TABLE public.store_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX ON public.store_broadcasts (store_id, sent_at DESC);

CREATE TABLE public.store_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.store_broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  clicked_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);
CREATE INDEX ON public.store_broadcast_recipients (user_id, delivered_at DESC);
CREATE INDEX ON public.store_broadcast_recipients (broadcast_id);

CREATE TABLE public.store_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_for_store int NOT NULL DEFAULT 0,
  unread_for_user int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
CREATE INDEX ON public.store_conversations (store_id, last_message_at DESC);
CREATE INDEX ON public.store_conversations (user_id, last_message_at DESC);

CREATE TABLE public.store_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.store_conversations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('store','user')),
  sender_user_id uuid NOT NULL,
  body text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  broadcast_id uuid REFERENCES public.store_broadcasts(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.store_conversation_messages (conversation_id, created_at);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_broadcast_recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_conversation_messages TO authenticated;
GRANT ALL ON public.store_broadcasts, public.store_broadcast_recipients,
             public.store_conversations, public.store_conversation_messages TO service_role;

-- 3) RLS
ALTER TABLE public.store_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_conversation_messages ENABLE ROW LEVEL SECURITY;

-- 4) Policies (all tables now exist so cross-refs are fine)
CREATE POLICY "store staff read broadcasts" ON public.store_broadcasts FOR SELECT TO authenticated
  USING (public.can_manage_store(auth.uid(), store_id));
CREATE POLICY "followers read their broadcasts" ON public.store_broadcasts FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.store_broadcast_recipients r
    WHERE r.broadcast_id = store_broadcasts.id AND r.user_id = auth.uid()));
CREATE POLICY "store staff insert broadcasts" ON public.store_broadcasts FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_store(auth.uid(), store_id) AND sender_user_id = auth.uid());
CREATE POLICY "store staff update broadcasts" ON public.store_broadcasts FOR UPDATE TO authenticated
  USING (public.can_manage_store(auth.uid(), store_id))
  WITH CHECK (public.can_manage_store(auth.uid(), store_id));

CREATE POLICY "recipient reads own row" ON public.store_broadcast_recipients FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id));
CREATE POLICY "recipient updates own tracking" ON public.store_broadcast_recipients FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "store staff insert recipients" ON public.store_broadcast_recipients FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_store(auth.uid(), store_id));

CREATE POLICY "conv participants read" ON public.store_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id));
CREATE POLICY "conv participants insert" ON public.store_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id));
CREATE POLICY "conv participants update" ON public.store_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id));

CREATE POLICY "msg participants read" ON public.store_conversation_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id));
CREATE POLICY "msg participants insert" ON public.store_conversation_messages FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid() AND (
    (sender_type = 'user'  AND user_id = auth.uid())
    OR (sender_type = 'store' AND public.can_manage_store(auth.uid(), store_id))));
CREATE POLICY "msg participants update" ON public.store_conversation_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_store(auth.uid(), store_id));

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_broadcast_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_conversation_messages;

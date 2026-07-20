
CREATE TABLE public.taylor_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  timezone text NOT NULL DEFAULT 'Africa/Johannesburg',
  recurrence text NOT NULL DEFAULT 'once',
  byday smallint[] NOT NULL DEFAULT '{}',
  hour smallint,
  minute smallint,
  next_fire_at timestamptz NOT NULL,
  last_fired_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taylor_reminders_recurrence_check CHECK (recurrence IN ('once','daily','weekly','monthly'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taylor_reminders TO authenticated;
GRANT ALL ON public.taylor_reminders TO service_role;

ALTER TABLE public.taylor_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reminders" ON public.taylor_reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reminders" ON public.taylor_reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reminders" ON public.taylor_reminders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reminders" ON public.taylor_reminders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_taylor_reminders_due
  ON public.taylor_reminders (next_fire_at)
  WHERE is_active = true;
CREATE INDEX idx_taylor_reminders_user
  ON public.taylor_reminders (user_id);

CREATE TRIGGER trg_taylor_reminders_updated_at
  BEFORE UPDATE ON public.taylor_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

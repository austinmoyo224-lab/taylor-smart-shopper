
CREATE TABLE public.ai_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  operation TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  audio_seconds NUMERIC(10,3),
  credits NUMERIC(12,6) NOT NULL DEFAULT 0,
  run_id TEXT,
  log_id TEXT,
  route TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

CREATE INDEX ai_usage_events_created_at_idx ON public.ai_usage_events (created_at DESC);
CREATE INDEX ai_usage_events_user_created_idx ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX ai_usage_events_op_created_idx ON public.ai_usage_events (operation, created_at DESC);

GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view AI usage"
  ON public.ai_usage_events
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin'::public.app_role));

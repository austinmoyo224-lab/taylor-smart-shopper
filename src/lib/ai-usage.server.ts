// Server-only helpers to estimate AI Gateway credit cost and log usage events.
// Rates are approximations derived from recent Lovable AI Gateway logs; they
// exist so the admin dashboard has directional numbers, not exact billing.

type OperationKind = "chat" | "stt" | "tts" | "vision";

export interface LogAiUsageInput {
  operation: OperationKind;
  model?: string | null;
  userId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  audioSeconds?: number | null;
  runId?: string | null;
  logId?: string | null;
  route?: string | null;
  success?: boolean;
  errorMessage?: string | null;
}

// Per-1K-token credit prices (very rough — refine from real logs later).
const CHAT_RATES: Record<string, { input: number; output: number }> = {
  "openai/gpt-5.5": { input: 0.02, output: 0.06 },
  "openai/gpt-4o-mini": { input: 0.005, output: 0.015 },
  "google/gemini-2.5-flash": { input: 0.004, output: 0.012 },
};

// Per-second credit prices for audio.
const STT_RATE_PER_SEC = 0.0025; // ~ gpt-4o-transcribe
const TTS_RATE_PER_1K_CHARS = 0.015; // ~ gpt-4o-mini-tts

export function estimateCredits(input: LogAiUsageInput): number {
  const { operation, model } = input;
  if (operation === "chat" || operation === "vision") {
    const rate =
      (model && CHAT_RATES[model]) ||
      CHAT_RATES["openai/gpt-5.5"];
    const inTok = input.inputTokens ?? 0;
    const outTok = input.outputTokens ?? 0;
    const total = input.totalTokens ?? inTok + outTok;
    if (!inTok && !outTok && total) {
      // Assume 70/30 in/out split when only total is known.
      return ((total * 0.7 * rate.input) + (total * 0.3 * rate.output)) / 1000;
    }
    return (inTok * rate.input + outTok * rate.output) / 1000;
  }
  if (operation === "stt") {
    return (input.audioSeconds ?? 0) * STT_RATE_PER_SEC;
  }
  if (operation === "tts") {
    // audioSeconds is repurposed as character count for TTS.
    return ((input.audioSeconds ?? 0) / 1000) * TTS_RATE_PER_1K_CHARS;
  }
  return 0;
}

export async function logAiUsage(input: LogAiUsageInput): Promise<void> {
  try {
    const credits = estimateCredits(input);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_usage_events").insert({
      operation: input.operation,
      model: input.model ?? null,
      user_id: input.userId ?? null,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      total_tokens:
        input.totalTokens ??
        (((input.inputTokens ?? 0) + (input.outputTokens ?? 0)) || null),
      audio_seconds: input.audioSeconds ?? null,
      credits,
      run_id: input.runId ?? null,
      log_id: input.logId ?? null,
      route: input.route ?? null,
      success: input.success ?? true,
      error_message: input.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[ai-usage] failed to log", err);
  }
}
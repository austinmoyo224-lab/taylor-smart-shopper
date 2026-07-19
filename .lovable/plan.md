## Goal

Give super admins a dashboard that shows AI spend broken down by **operation type (Chat, STT, TTS, Vision, Image)**, **per day**, and **per user**, plus totals and top spenders.

The Lovable AI Gateway logs are only available to the Lovable platform tools, not to the app runtime. So we log usage ourselves inside the app the moment each gateway call finishes, then aggregate from our own table.

## 1. New table: `ai_usage_events`

Migration adds one append-only table plus the required GRANTs and RLS.

Columns:
- `id uuid pk`
- `created_at timestamptz default now()`
- `user_id uuid` (nullable — some calls are system, e.g. TTS previews)
- `operation text` — one of `chat | stt | tts | vision | image | embedding`
- `model text` — e.g. `openai/gpt-5.5`
- `input_tokens int`, `output_tokens int`, `total_tokens int` (nullable — audio ops fill duration instead)
- `audio_seconds numeric` (nullable, STT/TTS)
- `credits numeric(12,6)` — estimated Lovable credits consumed
- `run_id text` (nullable) — `X-Lovable-AIG-Run-ID` captured from provider response
- `log_id text` (nullable) — `X-Lovable-AIG-Log-ID` if the gateway returns it
- `route text` — server function name / route for debugging
- `success bool default true`, `error_message text` (nullable)

Indexes: `(created_at desc)`, `(user_id, created_at)`, `(operation, created_at)`.

Policies:
- RLS on.
- `service_role`: full access.
- `authenticated`: no direct SELECT (dashboard reads via admin server fn with `has_role(admin)` check).
- INSERT only via server functions using the admin client (writes happen server-side, never from browser).

## 2. Cost model helper

New file `src/lib/ai-usage.server.ts` exporting `logAiUsage(...)` and a small `estimateCredits({ operation, model, input_tokens, output_tokens, audio_seconds })` that uses the same rates already discussed with the user (chat gpt-5.5 ≈ 0.10-0.16 credits/req scaled by tokens; gpt-4o-mini-tts ≈ ~0.04/req scaled by seconds; gpt-4o-transcribe ≈ ~0.06/req scaled by seconds; vision ≈ chat + image surcharge).

Rates live in a single `AI_COST_TABLE` const so they are easy to tune later. Estimates are labelled as estimates in the UI.

## 3. Instrument existing server calls

Add a `logAiUsage(...)` call at the end of each AI gateway path:
- `src/lib/taylor-engine.server.ts` — chat streaming (log after stream completes with usage returned by AI SDK `onFinish`)
- `src/lib/vision.functions.ts` — vision
- `src/lib/voice-client.ts` server-side counterpart (whichever handler runs STT via `/v1/audio/transcriptions`) — STT with audio_seconds
- TTS handler (voice route) — TTS with audio_seconds from the input text length or returned audio duration

Each call passes `context.userId` from `requireSupabaseAuth`. Failures are logged with `success=false` and never throw (fire-and-forget with try/catch).

## 4. Admin server functions

In `src/lib/admin.functions.ts` add three functions, all gated by `has_role(admin)`:
- `getAiUsageSummary({ from, to })` → totals + breakdown by operation
- `getAiUsageDaily({ from, to })` → array of `{ day, operation, credits, requests }` for the stacked bar chart
- `getAiUsageByUser({ from, to, limit })` → top users with per-op split, joined to `profiles` for name/email

All three use `supabaseAdmin` inside the handler (loaded via `await import`) after the role check on `context.supabase`.

## 5. New admin route: `/admin/ai-usage`

New file `src/routes/admin.ai-usage.tsx` under the existing `admin.tsx` layout. Contents:
- Date range picker (default: last 30 days), quick presets (7d / 30d / 90d)
- 4 KPI cards: **Total credits**, **Requests**, **Active users**, **Avg credits/user/day**
- Stacked bar chart (recharts, already used elsewhere) — credits per day, stacked by operation (Chat / STT / TTS / Vision / Image)
- Table: **By operation** — requests, tokens/seconds, credits, % of total
- Table: **By user (top 50)** — user, requests, credits total, per-op split, last active
- Small note: "Costs are estimates based on published gateway rates; actuals may differ slightly."

Add a nav card to `src/routes/admin.index.tsx` linking to the new route.

## 6. Not in scope

- Real-time streaming of usage (batch reads on page load are fine).
- Editing rates from the UI (rates stay in code for this milestone).
- Refunds / billing reconciliation.

## Technical details

- All gateway response headers with the `X-Lovable-AIG-` prefix are already forwarded through the helpers in `ai-gateway.server.ts`. We just need to read `getRunId()` from the provider and pass it into `logAiUsage`.
- The AI SDK's `streamText` / `generateText` returns a `usage` object (`inputTokens`, `outputTokens`, `totalTokens`). Use it directly instead of re-tokenizing.
- For STT/TTS we do not get token usage; we log `audio_seconds` (STT: measured from the uploaded file; TTS: from the returned audio buffer duration, or fall back to `text.length / 15` as a rough proxy).
- Credits column stays `numeric(12,6)` so small per-request costs aggregate cleanly.

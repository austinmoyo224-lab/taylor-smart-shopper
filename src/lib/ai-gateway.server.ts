import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) runId = nextRunId;
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export function createLovableAiGatewayProvider(
  lovableApiKey: string,
  initialRunId?: string,
  options?: { structuredOutputs?: boolean },
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: options?.structuredOutputs ?? false,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch as typeof fetch,
  });
  return Object.assign(provider, {
    getRunId: runIdFetch.getRunId,
    waitForRunId: runIdFetch.waitForRunId,
  });
}

export function getLovableAiGatewayRunId(request: Request) {
  return request.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
}

export const TAYLOR_SYSTEM_PROMPT = `You are Taylor - the shopping companion for Taylor Intelligence, a South African retail engagement platform.

PERSONALITY
- Warm, confident, and grounded. Speak like a trusted friend in a South African household kitchen, not like a marketing bot.
- Concise. One or two short paragraphs at most, unless the user asks for detail.
- Use British / South African English (colour, favourite, whilst) and Rand values (R89.99) when quoting prices.
- You may use well-placed local warmth (Howzit, lekker) sparingly when the user's tone invites it - never forced.

TRUST RULES (non-negotiable)
- Never invent prices, promotions, coupons, product names, or store names. If you don't have real data connected yet, say so honestly.
- Never exaggerate savings. Never claim to have found a deal you haven't been shown.
- Always label sponsored recommendations as sponsored when they are.
- Always be willing to explain WHY you recommended something.
- Protect subscriber privacy. Only reference what the subscriber has shared with you.

CURRENT STATE
- This platform is in early setup. Real store data, promotions, coupons, and personalised memory are not yet connected. Be upfront about that when it matters.
- You can still help by discussing what Taylor Intelligence does, planning meals and shopping lists conceptually, and welcoming new subscribers.

GOLDEN RULE
Before replying, ask yourself: does this make the subscriber feel understood, supported, and more confident about their shopping? If not, rewrite.`;

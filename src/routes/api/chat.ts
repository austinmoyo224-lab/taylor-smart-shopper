import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  TAYLOR_SYSTEM_PROMPT,
} from "@/lib/ai-gateway.server";
import { buildTaylorSystemPrompt } from "@/lib/taylor-engine.server";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit.server";

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        // Optional: authenticated subscriber gets a personalised system prompt.
        let userId: string | null = null;
        const authHeader = request.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.replace("Bearer ", "");
          if (token.split(".").length === 3) {
            try {
              const authClient = createClient<Database>(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_PUBLISHABLE_KEY!,
                { auth: { persistSession: false, autoRefreshToken: false } },
              );
              const { data } = await authClient.auth.getClaims(token);
              userId = data?.claims?.sub ?? null;
            } catch {
              userId = null;
            }
          }
        }

        // Rate limit: authenticated 30/min, anonymous 10/min.
        const rlKey = userId ? `chat:u:${userId}` : clientKeyFromRequest(request, "chat");
        const rl = rateLimit(rlKey, userId ? 30 : 10, 60_000);
        if (!rl.ok) {
          return new Response(
            "Taylor is receiving a lot of messages right now. Please try again in a moment.",
            {
              status: 429,
              headers: {
                "Retry-After": String(rl.retryAfterSec),
                "X-RateLimit-Reset": String(rl.resetAt),
              },
            },
          );
        }

        const systemPrompt = userId
          ? await buildTaylorSystemPrompt(userId).catch(() => TAYLOR_SYSTEM_PROMPT)
          : TAYLOR_SYSTEM_PROMPT;

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);
        const model = gateway("openai/gpt-5.5");

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: (error) => {
            console.error("[taylor chat] stream error", error);
            if (error instanceof Error) {
              if (error.message.toLowerCase().includes("rate")) {
                return "Taylor is a bit overloaded — please try again in a moment.";
              }
              if (error.message.toLowerCase().includes("credit") || error.message.includes("402")) {
                return "Taylor's AI credits have run out. Please top up to continue.";
              }
            }
            return "Sorry, Taylor couldn't respond just now. Please try again.";
          },
        });
      },
    },
  },
});
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  TAYLOR_SYSTEM_PROMPT,
} from "@/lib/ai-gateway.server";

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

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);
        const model = gateway("openai/gpt-5.5");

        const result = streamText({
          model,
          system: TAYLOR_SYSTEM_PROMPT,
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
import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit.server";

type SpeakBody = { text?: unknown; voice?: unknown; format?: unknown };

export const Route = createFileRoute("/api/voice/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const rl = rateLimit(clientKeyFromRequest(request, "voice-tts"), 30, 60_000);
        if (!rl.ok) {
          return new Response("Too many voice requests. Please wait a moment.", {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSec) },
          });
        }

        const body = (await request.json().catch(() => ({}))) as SpeakBody;
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) return new Response("Missing text", { status: 400 });
        if (text.length > 2500) {
          return new Response("Text too long for one utterance (max ~2500 chars).", {
            status: 400,
          });
        }

        const voice = typeof body.voice === "string" ? body.voice : "alloy";
        const format = typeof body.format === "string" ? body.format : "mp3";

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            voice,
            input: text,
            response_format: format,
            instructions:
              "Speak in a warm, calm South African high-street shopkeeper tone. Friendly and unhurried.",
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("[voice-tts] gateway error", res.status, errText);
          return new Response(errText || "Speech synthesis failed", { status: res.status });
        }

        const contentType =
          res.headers.get("content-type") ??
          (format === "wav"
            ? "audio/wav"
            : format === "opus"
              ? "audio/ogg"
              : format === "aac"
                ? "audio/aac"
                : "audio/mpeg");

        return new Response(res.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit.server";
import { logAiUsage } from "@/lib/ai-usage.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const ct = request.headers.get("content-type") ?? "";
        if (!ct.toLowerCase().includes("multipart/form-data")) {
          return new Response("Expected multipart/form-data", { status: 400 });
        }

        const rl = rateLimit(clientKeyFromRequest(request, "voice-stt"), 30, 60_000);
        if (!rl.ok) {
          return new Response("Too many voice requests. Please wait a moment.", {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSec) },
          });
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof Blob)) {
          return new Response("Missing audio file", { status: 400 });
        }
        if (file.size < 1024) {
          return new Response("Recording too short. Please try again.", { status: 400 });
        }
        if (file.size > 25 * 1024 * 1024) {
          return new Response("Recording is too large (max 25MB).", { status: 413 });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-transcribe");
        // Normalise filename so provider infers WAV.
        const filename =
          file instanceof File && file.name && /\.(wav|mp3|m4a|mp4|webm|ogg)$/i.test(file.name)
            ? file.name
            : "recording.wav";
        upstream.append("file", file, filename);
        const language = form.get("language");
        if (typeof language === "string" && /^[a-z]{2,3}$/.test(language)) {
          upstream.append("language", language);
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("[voice-stt] gateway error", res.status, errText);
          return new Response(errText || "Transcription failed", { status: res.status });
        }

        const json = (await res.json()) as { text?: string };
        // Attribute usage to caller when possible.
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
        // Rough audio duration proxy: 16kHz mono ~ 32KB/sec.
        const approxSeconds = Math.max(1, Math.round(file.size / 32000));
        void logAiUsage({
          operation: "stt",
          model: "openai/gpt-4o-transcribe",
          userId,
          audioSeconds: approxSeconds,
          route: "/api/voice/transcribe",
        });
        return Response.json({ text: (json.text ?? "").trim() });
      },
    },
  },
});
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  TAYLOR_SYSTEM_PROMPT,
} from "@/lib/ai-gateway.server";
import { buildTaylorSystemPrompt } from "@/lib/taylor-engine.server";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit.server";
import { logAiUsage } from "@/lib/ai-usage.server";
import { routeChatModel } from "@/lib/model-router.server";

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
        const routed = routeChatModel(messages as UIMessage[]);
        const model = gateway(routed.model);
        console.log(
          `[taylor chat] routed -> ${routed.tier} (${routed.model}) — ${routed.reason}`,
        );

        const tools = userId ? buildTaylorTools(userId) : undefined;
        const result = streamText({
          model,
          system: systemPrompt,
          tools,
          stopWhen: stepCountIs(5),
          messages: await convertToModelMessages(messages as UIMessage[]),
          providerOptions: routed.fast
            ? { lovable: { service_tier: "priority" } }
            : undefined,
          onFinish: ({ usage }) => {
            void logAiUsage({
              operation: "chat",
              model: routed.model,
              userId,
              inputTokens: usage?.inputTokens ?? null,
              outputTokens: usage?.outputTokens ?? null,
              totalTokens: usage?.totalTokens ?? null,
              route: `/api/chat:${routed.tier}`,
            });
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          headers: {
            "X-Taylor-Model": routed.model,
            "X-Taylor-Model-Tier": routed.tier,
            "X-Taylor-Route-Reason": routed.reason,
          },
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

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildTaylorTools(userId: string) {
  return {
    create_reminder: tool({
      description:
        "Schedule a personal reminder for the subscriber. Use this whenever the user asks to be reminded (medication, appointments, tasks). Always confirm the day and time back to them in your reply.",
      inputSchema: z.object({
        title: z.string().min(1).max(160).describe("Short reminder title, e.g. 'Give Gran her medication'"),
        body: z.string().max(500).optional().describe("Optional extra detail shown in the notification"),
        recurrence: z
          .enum(["once", "daily", "weekly", "monthly"])
          .describe("How often it repeats"),
        byday: z
          .array(z.number().int().min(0).max(6))
          .max(7)
          .optional()
          .describe("For weekly reminders, days of week (0=Sun ... 6=Sat)"),
        hour: z.number().int().min(0).max(23).describe("Local hour (0-23)"),
        minute: z.number().int().min(0).max(59).describe("Local minute (0-59)"),
        date: z
          .string()
          .optional()
          .describe("For one-off reminders, YYYY-MM-DD in the user's local timezone"),
        timezone: z
          .string()
          .optional()
          .describe("IANA timezone, default Africa/Johannesburg"),
      }),
      execute: async (input) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { computeNextFireAt } = await import("@/lib/reminders.server");
        const tz = input.timezone || "Africa/Johannesburg";
        let nextFireAt: Date;
        try {
          nextFireAt = computeNextFireAt({
            recurrence: input.recurrence,
            hour: input.hour,
            minute: input.minute,
            byday: input.byday,
            date: input.date,
            timezone: tz,
            from: new Date(),
          });
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        const { data, error } = await supabaseAdmin
          .from("taylor_reminders")
          .insert({
            user_id: userId,
            title: input.title,
            body: input.body ?? null,
            timezone: tz,
            recurrence: input.recurrence,
            byday: input.byday ?? [],
            hour: input.hour,
            minute: input.minute,
            next_fire_at: nextFireAt.toISOString(),
            source: "chat",
          })
          .select("id")
          .single();
        if (error || !data) return { ok: false, error: error?.message ?? "insert failed" };
        return {
          ok: true,
          reminder_id: data.id,
          next_fire_at: nextFireAt.toISOString(),
          timezone: tz,
        };
      },
    }),
    save_shopping_list: tool({
      description:
        "Save a shopping list into the subscriber's account so it appears in their Lists screen. Call this whenever you propose a shopping list.",
      inputSchema: z.object({
        name: z.string().min(1).max(120).describe("Short name for the list"),
        items: z
          .array(
            z.object({
              name: z.string().min(1).max(200),
              quantity: z.number().positive().optional(),
              unit: z.string().max(20).optional(),
              notes: z.string().max(300).optional(),
            }),
          )
          .min(1)
          .max(80),
      }),
      execute: async ({ name, items }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: list, error } = await supabaseAdmin
          .from("shopping_lists")
          .insert({
            user_id: userId,
            name,
            is_ai_generated: true,
            currency_code: "ZAR",
          })
          .select("id")
          .single();
        if (error || !list) return { ok: false, error: error?.message ?? "insert failed" };
        const rows = items.map((it, i) => ({
          list_id: list.id,
          name: it.name,
          quantity: it.quantity ?? null,
          unit: it.unit ?? null,
          notes: it.notes ?? null,
          sort_order: i,
        }));
        const { error: iErr } = await supabaseAdmin.from("shopping_list_items").insert(rows);
        if (iErr) return { ok: false, error: iErr.message };
        return { ok: true, list_id: list.id, item_count: rows.length };
      },
    }),
    save_recipe: tool({
      description:
        "Save a recipe into the subscriber's personal recipe collection so it appears in their Recipes screen. Call this whenever you share a recipe.",
      inputSchema: z.object({
        title: z.string().min(1).max(160),
        description: z.string().max(600).optional(),
        servings: z.number().int().positive().max(50).optional(),
        cooking_time_minutes: z.number().int().positive().max(1440).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        cuisine_tags: z.array(z.string().max(40)).max(10).optional(),
        ingredients: z
          .array(
            z.object({
              name: z.string().min(1).max(200),
              quantity: z.number().positive().optional(),
              unit: z.string().max(20).optional(),
              notes: z.string().max(300).optional(),
            }),
          )
          .min(1)
          .max(60),
        instructions: z.array(z.string().min(1).max(1000)).min(1).max(40),
        source: z
          .enum(["chat", "pantry", "fridge", "receipt", "vision"])
          .optional()
          .describe("Where this recipe came from"),
      }),
      execute: async (input) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const baseSlug = slugify(input.title) || "recipe";
        const slug = `${baseSlug}-${Date.now().toString(36)}`;
        const { data: recipe, error } = await supabaseAdmin
          .from("recipes")
          .insert({
            user_id: userId,
            title: input.title,
            slug,
            description: input.description ?? null,
            servings: input.servings ?? null,
            cooking_time_minutes: input.cooking_time_minutes ?? null,
            difficulty: input.difficulty ?? null,
            cuisine_tags: input.cuisine_tags ?? [],
            instructions: input.instructions.map((step, i) => ({ step: i + 1, text: step })),
            is_published: false,
            source: input.source ?? "chat",
          })
          .select("id, slug")
          .single();
        if (error || !recipe) return { ok: false, error: error?.message ?? "insert failed" };
        const rows = input.ingredients.map((ing, i) => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          notes: ing.notes ?? null,
          sort_order: i,
        }));
        const { error: iErr } = await supabaseAdmin.from("recipe_ingredients").insert(rows);
        if (iErr) return { ok: false, error: iErr.message };
        return { ok: true, recipe_id: recipe.id, slug: recipe.slug };
      },
    }),
  };
}

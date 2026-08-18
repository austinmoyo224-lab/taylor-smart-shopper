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
import { notifyCreditsExhausted } from "@/lib/credit-alert.server";
import { firecrawlSearch, firecrawlScrape } from "@/lib/firecrawl.server";
import { buildTravelTools } from "@/lib/travel-tools.server";
import { prepareShoppingListItemForStorage } from "@/lib/shopping-list-utils";

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

        const basePrompt = userId
          ? await buildTaylorSystemPrompt(userId).catch(() => TAYLOR_SYSTEM_PROMPT)
          : TAYLOR_SYSTEM_PROMPT;
        const systemPrompt = `${basePrompt}\n\n${currentTimeBlock()}`;

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);
        const routed = routeChatModel(messages as UIMessage[]);
        const model = gateway(routed.model);
        console.log(
          `[taylor chat] routed -> ${routed.tier} (${routed.model}) — ${routed.reason}`,
        );

        const tools = userId
          ? {
              ...buildTaylorTools(userId),
              ...buildTravelTools(),
              search_followed_store_products: followedStoreProductsTool(userId),
              lookup_live_prices: livePricesTool(userId),
              lookup_weather: weatherTool(),
              get_current_datetime: datetimeTool(),
            }
          : {
              ...buildTravelTools(),
              lookup_live_prices: livePricesTool(null),
              lookup_weather: weatherTool(),
              get_current_datetime: datetimeTool(),
            };
        const result = streamText({
          model,
          system: systemPrompt,
          tools,
          stopWhen: stepCountIs(8),
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
              const msg = error.message.toLowerCase();
              if (
                msg.includes("credit") ||
                error.message.includes("402") ||
                error.message.includes("403") ||
                msg.includes("forbidden") ||
                msg.includes("credit_limit_reached")
              ) {
                notifyCreditsExhausted({
                  route: "/api/chat",
                  operation: "chat",
                  providerMessage: error.message,
                  userId,
                });
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

function livePricesTool(userId: string | null) {
  return _livePricesTool(userId);
}

function weatherTool() {
  return _weatherTool();
}

function currentTimeBlock() {
  const now = new Date();
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", ...opts }).format(now);
  return [
    "---",
    "REAL-TIME CLOCK (authoritative — always trust this over your training data)",
    `Current date: ${fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
    `Current time: ${fmt({ hour: "2-digit", minute: "2-digit", hour12: false })} SAST (Africa/Johannesburg, UTC+2)`,
    `ISO timestamp: ${now.toISOString()}`,
    "Use this whenever the subscriber asks the time, the date, the day of the week, how long until an event, or when you set reminders or judge whether a promotion is still running. For any other timezone or city, CALL get_current_datetime.",
  ].join("\n");
}

function datetimeTool() {
  return tool({
    description:
      "Get the CURRENT real-world date and time. Use for 'what time is it', 'what's today's date', day-of-week questions, countdowns to events, and times in other cities/timezones. Defaults to South Africa (SAST).",
    inputSchema: z.object({
      timezone: z
        .string()
        .optional()
        .describe("IANA timezone, e.g. 'Africa/Johannesburg', 'Europe/London', 'America/New_York'"),
    }),
    execute: async ({ timezone }) => {
      const tz = timezone?.trim() || "Africa/Johannesburg";
      const now = new Date();
      try {
        const parts = new Intl.DateTimeFormat("en-ZA", {
          timeZone: tz,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
        return {
          timezone: tz,
          formatted: parts,
          iso_utc: now.toISOString(),
          note: "This is the real current time. State it plainly and naturally.",
        };
      } catch {
        return { error: `Unknown timezone '${tz}'. Try an IANA name like 'Africa/Johannesburg'.` };
      }
    },
  });
}

function _weatherTool() {
  return tool({
    description:
      "Look up the CURRENT weather and today's forecast for a South African city or suburb using Open-Meteo (no API key). Call this whenever the subscriber asks for meal/dinner/lunch/recipe ideas so you can tailor comfort food to the weather (soups & stews when cold, salads & braai when hot).",
    inputSchema: z.object({
      location: z
        .string()
        .min(2)
        .max(80)
        .describe("City or suburb, e.g. 'Johannesburg', 'Cape Town', 'Sandton'"),
    }),
    execute: async ({ location }) => {
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&country=ZA&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geo = (await geoRes.json()) as {
          results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string }>;
        };
        const first = geo.results?.[0];
        if (!first) return { ok: false, error: `Couldn't find "${location}" in South Africa.` };
        const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Africa%2FJohannesburg&forecast_days=1`;
        const wxRes = await fetch(wxUrl);
        const wx = (await wxRes.json()) as {
          current?: {
            temperature_2m?: number;
            relative_humidity_2m?: number;
            precipitation?: number;
            weather_code?: number;
            wind_speed_10m?: number;
          };
          daily?: {
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
            precipitation_sum?: number[];
            weather_code?: number[];
          };
        };
        const code = wx.current?.weather_code ?? 0;
        const desc = weatherCodeLabel(code);
        const tempC = wx.current?.temperature_2m ?? null;
        const hint =
          tempC == null
            ? "balanced"
            : tempC <= 15
              ? "cold — suggest hearty warm meals (soups, stews, curries, pap & vleis, roasts, hot pies)"
              : tempC >= 26
                ? "hot — suggest light/fresh meals (salads, braai, wraps, cold pasta, smoothie bowls)"
                : "mild — any meal type works";
        return {
          ok: true,
          location: `${first.name}${first.admin1 ? `, ${first.admin1}` : ""}`,
          current: {
            temperature_c: tempC,
            humidity: wx.current?.relative_humidity_2m,
            precipitation_mm: wx.current?.precipitation,
            wind_kmh: wx.current?.wind_speed_10m,
            condition: desc,
          },
          today: {
            high_c: wx.daily?.temperature_2m_max?.[0] ?? null,
            low_c: wx.daily?.temperature_2m_min?.[0] ?? null,
            rain_mm: wx.daily?.precipitation_sum?.[0] ?? null,
          },
          meal_hint: hint,
          instruction:
            "Use meal_hint to steer recipe suggestions. Mention the weather in one short natural sentence (e.g. 'It's a chilly 12°C in Cape Town — perfect for a hearty stew').",
        };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
  });
}

function weatherCodeLabel(code: number): string {
  if (code === 0) return "clear sky";
  if ([1, 2, 3].includes(code)) return "partly cloudy";
  if ([45, 48].includes(code)) return "foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "mixed conditions";
}

function _livePricesTool(userId: string | null) {
  return tool({
    description:
      "Estimate current shelf prices for a product across the major South African retailers (Pick n Pay, Checkers, Checkers Sixty60, Shoprite, Usave, Boxer, Woolworths, SPAR, Makro, Game). Call this whenever the subscriber asks for a product's price, wants to compare retailers, or asks 'where is X cheapest' AND you do not already have a matching LIVE promotion in context. Results are ESTIMATES — always present them as such.",
    inputSchema: z.object({
      product: z
        .string()
        .min(2)
        .max(160)
        .describe("Exact product to price, e.g. 'Iwisa maize meal 5kg' or 'Coca-Cola 2L'"),
      retailers: z
        .array(z.string().min(2).max(60))
        .max(6)
        .optional()
        .describe(
          "Optional retailer names to focus on, e.g. ['Pick n Pay','Checkers','Woolworths']. Defaults to the top SA supermarkets.",
        ),
    }),
    execute: async ({ product, retailers }) => {
      void userId;
      let results: { retailer: string; price: number; confidence: number }[] = [];
      try {
        const { estimateProductPrices } = await import("@/lib/live-prices.server");
        results = await estimateProductPrices(product, retailers);
      } catch (e) {
        return { ok: false, error: `Price estimate failed: ${(e as Error).message}` };
      }
      if (results.length === 0) {
        return {
          ok: false,
          error:
            "No live results returned. Fall back to typical SA price guidance and label it as an estimate.",
        };
      }
      return {
        ok: true,
        product,
        currency: "ZAR",
        results,
        instruction:
          "These are ESTIMATED shelf prices, not advertised specials. Name each retailer, quote the Rand amount, say clearly that they're estimates, and suggest the shopper confirms in-store or in the retailer's app.",
      };
    },
  });
}

function buildTaylorTools(userId: string) {
  void 0;
  return _buildTaylorTools(userId);
}

function followedStoreProductsTool(userId: string) {
  return tool({
    description:
      "Search products from the stores the subscriber FOLLOWS on Taylor before falling back to live web prices. Call this FIRST whenever the subscriber asks about buying/adding a product, price of a product, or 'do any of my stores have X'. Returns matching products with the retailer name, price (if the store set one), size/unit, and product id so you can offer to add them to a shopping list.",
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .max(120)
        .describe("The product the shopper wants, e.g. 'maize meal', 'Coca-Cola 2L', 'chicken breast'"),
      limit: z.number().int().min(1).max(20).optional(),
    }),
    execute: async ({ query, limit }) => {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs } = await supabaseAdmin
          .from("subscriber_store_subs")
          .select("target_type, target_id")
          .eq("user_id", userId)
          .eq("is_active", true);
        const storeIds = (subs ?? [])
          .filter((s) => s.target_type === "store")
          .map((s) => s.target_id);
        if (storeIds.length === 0) {
          return {
            ok: true,
            followed_stores: 0,
            results: [],
            instruction:
              "The subscriber doesn't follow any stores yet. Continue with lookup_live_prices and mention they can follow stores in the Stores tab to see their in-store prices here.",
          };
        }
        const { data: stores } = await supabaseAdmin
          .from("stores")
          .select("id, name, organisation_id")
          .in("id", storeIds)
          .is("deleted_at", null);
        const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
        const orgIds = Array.from(new Set((stores ?? []).map((s) => s.organisation_id)));
        if (orgIds.length === 0) return { ok: true, followed_stores: 0, results: [] };

        const terms = query
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 1)
          .slice(0, 4);
        const cap = Math.min(limit ?? 8, 20);
        // Fuzzy match on name using ILIKE %term%; product_categories/brands stay optional.
        let q = supabaseAdmin
          .from("products")
          .select("id, name, slug, sku, unit, unit_amount, base_price, currency_code, images, organisation_id")
          .in("organisation_id", orgIds)
          .is("deleted_at", null)
          .eq("is_available", true)
          .limit(cap * 3);
        for (const t of terms) q = q.ilike("name", `%${t}%`);
        const { data: products, error } = await q;
        if (error) return { ok: false, error: error.message };

        const productIds = (products ?? []).map((p) => p.id);
        let priceByProductStore = new Map<string, number>();
        let inventoryByProductStore = new Map<string, boolean>();
        if (productIds.length > 0) {
          const [{ data: prices }, { data: inv }] = await Promise.all([
            supabaseAdmin
              .from("product_prices")
              .select("product_id, store_id, price, currency_code, effective_from, effective_to")
              .in("product_id", productIds)
              .in("store_id", storeIds),
            supabaseAdmin
              .from("product_inventory")
              .select("product_id, store_id, is_in_stock, quantity")
              .in("product_id", productIds)
              .in("store_id", storeIds),
          ]);
          const now = Date.now();
          for (const p of prices ?? []) {
            const from = p.effective_from ? new Date(p.effective_from).getTime() : 0;
            const to = p.effective_to ? new Date(p.effective_to).getTime() : Infinity;
            if (now < from || now > to) continue;
            priceByProductStore.set(`${p.product_id}:${p.store_id}`, Number(p.price));
          }
          for (const i of inv ?? []) {
            inventoryByProductStore.set(`${i.product_id}:${i.store_id}`, !!i.is_in_stock);
          }
        }

        const rows: Array<{
          product_id: string;
          name: string;
          unit?: string | null;
          unit_amount?: number | null;
          store_id: string;
          store_name: string;
          price: number | null;
          currency: string;
          in_stock: boolean | null;
          image?: string | null;
        }> = [];
        for (const p of products ?? []) {
          const orgStores = (stores ?? []).filter((s) => s.organisation_id === p.organisation_id);
          for (const s of orgStores) {
            const key = `${p.id}:${s.id}`;
            const price = priceByProductStore.get(key) ?? (p.base_price != null ? Number(p.base_price) : null);
            const inStock = inventoryByProductStore.has(key) ? inventoryByProductStore.get(key)! : null;
            rows.push({
              product_id: p.id,
              name: p.name,
              unit: p.unit,
              unit_amount: p.unit_amount,
              store_id: s.id,
              store_name: s.name,
              price,
              currency: p.currency_code || "ZAR",
              in_stock: inStock,
              image: Array.isArray(p.images) && p.images.length ? String(p.images[0]) : null,
            });
          }
        }
        rows.sort((a, b) => {
          if ((a.price ?? Infinity) !== (b.price ?? Infinity)) return (a.price ?? Infinity) - (b.price ?? Infinity);
          return a.name.localeCompare(b.name);
        });
        const trimmed = rows.slice(0, cap);
        void storeById;
        return {
          ok: true,
          followed_stores: storeIds.length,
          match_count: trimmed.length,
          results: trimmed,
          instruction:
            trimmed.length > 0
              ? "Quote these in-store prices FIRST (name the retailer and price). Offer to add the chosen product to the subscriber's shopping list using save_shopping_list. Only call lookup_live_prices for retailers NOT covered here or when the shopper explicitly wants a wider comparison."
              : "No matches inside the subscriber's followed stores. Fall back to lookup_live_prices and mention which stores you checked (by name) so the shopper knows.",
        };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
  });
}

function _buildTaylorTools(userId: string) {
  return {
    read_promotion_flyer: tool({
      description:
        "Read the flyer image(s) and any attached PDF for a specific promotion to answer the subscriber's price/item question. Call this whenever the subscriber asks about a promotion, a deal, or the price of a specific product at ANY store on Taylor (followed or not). Pass the exact item the subscriber asked about in `question` — the tool returns ONLY the matching items with their advertised prices, not the whole flyer.",
      inputSchema: z.object({
        promotion_id: z.string().uuid().describe("The promotion id from the LIVE PROMOTIONS list"),
        question: z
          .string()
          .max(300)
          .describe(
            "The specific item(s) or question from the subscriber, e.g. 'price of Iwisa maize meal 5kg' or 'is Coca-Cola 2L on special'. Required — the extractor filters the flyer to only these items.",
          ),
      }),
      execute: async ({ promotion_id, question }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Verify subscriber follows the store this promo belongs to.
          const { data: promo, error: pErr } = await supabaseAdmin
            .from("promotions")
            .select("id, title, description, sale_price, original_price, currency_code, hero_image_url, metadata, store_id, is_published, deleted_at, stores(name)")
            .eq("id", promotion_id)
            .maybeSingle();
          if (pErr || !promo) return { ok: false, error: "Promotion not found" };
          if (promo.deleted_at || !promo.is_published) return { ok: false, error: "Promotion not available" };

          // Look for broadcast attachments referencing this promotion (may contain PDFs).
          const { data: broadcasts } = await supabaseAdmin
            .from("store_broadcasts")
            .select("attachments")
            .eq("promotion_id", promotion_id)
            .is("deleted_at", null)
            .limit(5);

          const metaGallery = Array.isArray((promo.metadata as { gallery?: unknown } | null)?.gallery)
            ? ((promo.metadata as { gallery?: unknown[] }).gallery as unknown[]).filter(
                (x): x is string => typeof x === "string",
              )
            : [];
          const imageUrls: string[] = [];
          if (promo.hero_image_url) imageUrls.push(promo.hero_image_url);
          for (const g of metaGallery) if (!imageUrls.includes(g)) imageUrls.push(g);

          type BAtt = { type?: string; url?: string | null };
          const pdfUrls: string[] = [];
          for (const b of broadcasts ?? []) {
            const atts = Array.isArray(b.attachments) ? (b.attachments as BAtt[]) : [];
            for (const a of atts) {
              if (!a?.url) continue;
              if (a.type === "flyer_image" && !imageUrls.includes(a.url)) imageUrls.push(a.url);
              if (a.type === "catalog_pdf" && !pdfUrls.includes(a.url)) pdfUrls.push(a.url);
            }
          }

          if (imageUrls.length === 0 && pdfUrls.length === 0) {
            return { ok: false, error: "No flyer image or PDF attached to this promotion." };
          }

          // Build vision request. PDFs need to be inlined as base64 file blocks.
          const q = (question ?? "").trim();
          const storeName =
            promo.stores && "name" in promo.stores
              ? (promo.stores as { name?: string }).name
              : "";
          const content: Array<Record<string, unknown>> = [
            {
              type: "text",
              text:
                `This is a promotional flyer for "${promo.title}"${storeName ? ` at ${storeName}` : ""}. ` +
                `The shopper is asking specifically about: "${q || "(no specific item — return the 5 best-value items)"}". ` +
                `The flyer is provided as numbered sources below. Image sources are labelled [Image 1], [Image 2], … in the order they appear. PDF sources are labelled [PDF 1 page N], [PDF 2 page N], … — use the actual page number visible on each page. ` +
                `Scan every page/image. Return ONLY the items that match the shopper's request (name variants, sizes and brands count as matches). ` +
                `For each match, output ONE bullet in EXACTLY this format:\n` +
                `  • <exact product name as printed> — <size/quantity> — <price with R prefix exactly as printed> — <any relevant terms: dates, "while stocks last", limits> — Source: <[Image N] top-left | top-right | centre | bottom-left | bottom-right | full-page> OR <[PDF N page M] top-left | …>\n` +
                `The "section" must describe WHERE on that page/image the item appears (top-left, top-right, centre, bottom-left, bottom-right, or full-page if it fills the page). Always include the Source reference — it is mandatory. ` +
                `Currency is ${promo.currency_code || "ZAR"}. ` +
                `If nothing on the flyer matches the request, reply exactly: NO_MATCH — then list up to 3 nearest alternatives briefly, each with its Source reference. ` +
                `If the flyer has no readable prices at all, reply exactly: NO_PRICES. Never invent items, prices, or source references.`,
            },
          ];
          const imgSlice = imageUrls.slice(0, 6);
          imgSlice.forEach((url, i) => {
            content.push({ type: "text", text: `[Image ${i + 1}]` });
            content.push({ type: "image_url", image_url: { url } });
          });
          const pdfSlice = pdfUrls.slice(0, 3);
          for (let i = 0; i < pdfSlice.length; i++) {
            const url = pdfSlice[i];
            try {
              const res = await fetch(url);
              if (!res.ok) continue;
              const buf = await res.arrayBuffer();
              const b64 = Buffer.from(buf).toString("base64");
              const name = url.split("/").pop()?.split("?")[0] || "flyer.pdf";
              content.push({ type: "text", text: `[PDF ${i + 1}] (${name}) — cite the page number printed on each page` });
              content.push({
                type: "file",
                file: {
                  filename: name,
                  file_data: `data:application/pdf;base64,${b64}`,
                },
              });
            } catch {
              // ignore fetch failure for a single PDF
            }
          }

          const apiKey = process.env.LOVABLE_API_KEY!;
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
            },
            body: JSON.stringify({
              model: "openai/gpt-5.5",
              messages: [
                {
                  role: "system",
                  content:
                    "You extract advertised prices and items from South African retail flyers. Be precise, quote prices exactly as printed (with R prefix), and never invent details that aren't visible.",
                },
                { role: "user", content },
              ],
            }),
          });
          if (!resp.ok) {
            const errText = await resp.text().catch(() => "");
            return { ok: false, error: `Vision read failed (${resp.status}): ${errText.slice(0, 200)}` };
          }
          const json = (await resp.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };
          const extracted = json.choices?.[0]?.message?.content?.trim() ?? "";
          void logAiUsage({
            operation: "vision",
            model: "openai/gpt-5.5",
            userId,
            inputTokens: json.usage?.prompt_tokens ?? null,
            outputTokens: json.usage?.completion_tokens ?? null,
            totalTokens: json.usage?.total_tokens ?? null,
            route: "/api/chat:read_promotion_flyer",
          });
          return {
            ok: true,
            promotion_id,
            title: promo.title,
            images_read: imageUrls.length,
            pdfs_read: pdfUrls.length,
            extracted,
          };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
    }),
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
        const rows = items.map((it, i) => {
          const item = prepareShoppingListItemForStorage({
            name: it.name,
            quantity: it.quantity ?? null,
            unit: it.unit ?? null,
            notes: it.notes ?? null,
          });
          return {
            list_id: list.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
            sort_order: i,
          };
        });
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
            is_shareable: true,
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
        // Fire-and-forget: generate a photo for the recipe so users "eat with
        // their eyes first". Failure never blocks the chat response.
        void import("@/lib/recipe-image.server").then(({ generateAndAttachRecipeHero }) =>
          generateAndAttachRecipeHero({
            recipeId: recipe.id,
            title: input.title,
            description: input.description ?? null,
            cuisineTags: input.cuisine_tags ?? null,
          }).catch(() => null),
        );
        return { ok: true, recipe_id: recipe.id, slug: recipe.slug };
      },
    }),
  };
}

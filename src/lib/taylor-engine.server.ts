/**
 * Taylor Intelligence Engine (TIE) — Milestone 7.
 *
 * Builds the personalised system prompt for a signed-in subscriber:
 * - Identity & greeting preference (from profiles)
 * - Subscriber memory (shopping, food, lifestyle) — opt-in
 * - Active Life Moments (birthdays, school terms, festive seasons)
 * - Stores the subscriber follows
 * - Live, published promotions from those stores (real data only)
 * - Trust rules: label sponsored, never invent prices, explain WHY.
 *
 * Falls back to a generic prompt for anonymous users.
 */

import { TAYLOR_SYSTEM_PROMPT } from "./ai-gateway.server";

export async function buildTaylorSystemPrompt(userId: string | null): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Admin-configured Taylor profile & training (always loaded).
  const [settingsRes, trainingRes, knowledgeRes] = await Promise.all([
    supabaseAdmin.from("taylor_settings").select("*").eq("singleton", true).maybeSingle(),
    supabaseAdmin
      .from("taylor_training_examples")
      .select("prompt, ideal_response, category")
      .eq("is_active", true)
      .limit(40),
    supabaseAdmin
      .from("taylor_knowledge")
      .select("title, content, category, tags")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(60),
  ]);
  const settings = settingsRes.data;
  const training = trainingRes.data ?? [];
  const knowledge = knowledgeRes.data ?? [];

  const adminBlock: string[] = [];
  if (settings) {
    adminBlock.push("");
    adminBlock.push("---");
    adminBlock.push("ADMIN-CONFIGURED TAYLOR PROFILE");
    adminBlock.push(`Name: ${settings.display_name}`);
    if (settings.tagline) adminBlock.push(`Tagline: ${settings.tagline}`);
    if (settings.personality_traits)
      adminBlock.push(`Personality: ${settings.personality_traits}`);
    if (settings.system_prompt_addon) {
      adminBlock.push("");
      adminBlock.push("ADDITIONAL INSTRUCTIONS FROM ADMIN (obey these):");
      adminBlock.push(settings.system_prompt_addon);
    }
  }
  if (training.length) {
    adminBlock.push("");
    adminBlock.push("TRAINING EXAMPLES (mirror this tone and structure):");
    for (const t of training) {
      adminBlock.push(`Q: ${t.prompt}`);
      adminBlock.push(`A: ${t.ideal_response}`);
      adminBlock.push("");
    }
  }
  if (knowledge.length) {
    adminBlock.push("");
    adminBlock.push("TAYLOR KNOWLEDGE BASE (authoritative facts — prefer this over guessing):");
    for (const k of knowledge) {
      const cat = k.category ? ` [${k.category}]` : "";
      adminBlock.push(`# ${k.title}${cat}`);
      adminBlock.push(k.content);
      adminBlock.push("");
    }
  }

  if (!userId) {
    return [TAYLOR_SYSTEM_PROMPT, ...adminBlock].join("\n");
  }

  const [profileRes, memoryRes, momentsRes, subsRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(
        "display_name, first_name, locale, country_code, currency_code, preferred_greeting, communication_style",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("subscriber_memory")
      .select("personal, shopping, food, lifestyle, consent")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("life_moments")
      .select("type, title, moment_date, recurs_annually")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(20),
    supabaseAdmin
      .from("subscriber_store_subs")
      .select("target_id")
      .eq("user_id", userId)
      .eq("target_type", "store")
      .eq("is_active", true),
  ]);

  const profile = profileRes.data;
  const memory = memoryRes.data;
  const moments = momentsRes.data ?? [];
  const storeIds = (subsRes.data ?? []).map((s) => s.target_id);

  const [storesRes, promosRes] = await Promise.all([
    storeIds.length
      ? supabaseAdmin
          .from("stores")
          .select("id, organisation_id, name, city, country_code")
          .in("id", storeIds)
          .is("deleted_at", null)
      : Promise.resolve({
          data: [] as {
            id: string;
            organisation_id: string;
            name: string;
            city: string | null;
            country_code: string | null;
          }[],
        }),
    storeIds.length
      ? supabaseAdmin
          .from("promotions")
          .select(
            "id, title, type, is_sponsored, original_price, sale_price, currency_code, starts_at, ends_at, store_id, description, rules, metadata, promotion_products(products(name, description, unit, unit_amount, base_price, currency_code))",
          )
          .in("store_id", storeIds)
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const stores = storesRes.data ?? [];
  const orgIds = Array.from(new Set(stores.map((s) => s.organisation_id).filter(Boolean)));
  const campaignsRes = orgIds.length
    ? await supabaseAdmin
        .from("campaigns")
        .select("id, name, organisation_id, store_id, schedule, starts_at, ends_at, is_active")
        .in("organisation_id", orgIds)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] as never[] };
  const promos = (promosRes.data ?? []) as {
    id: string;
    title: string;
    type: string;
    is_sponsored: boolean;
    original_price: number | null;
    sale_price: number | null;
    currency_code: string;
    starts_at: string | null;
    ends_at: string | null;
    store_id: string | null;
    description: string | null;
    rules?: unknown;
    metadata?: unknown;
    promotion_products?: { products?: PromotionProduct | PromotionProduct[] | null }[] | null;
  }[];

  // Global catalogue — Taylor can see ALL stores & published promotions, not just followed.
  const [allStoresRes, allPromosRes] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id, organisation_id, name, city, country_code")
      .is("deleted_at", null)
      .eq("status", "active")
      .limit(200),
    supabaseAdmin
      .from("promotions")
      .select(
        "id, title, type, is_sponsored, original_price, sale_price, currency_code, starts_at, ends_at, store_id, description, hero_image_url, metadata, promotion_products(products(name, description, unit, unit_amount, base_price, currency_code))",
      )
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(120),
  ]);
  const allStores = (allStoresRes.data ?? []) as typeof stores;
  const allPromos = (allPromosRes.data ?? []) as typeof promos;
  const allStoreById = new Map(allStores.map((s) => [s.id, s]));
  const campaigns = (campaignsRes.data ?? []) as {
    id: string;
    name: string;
    organisation_id: string;
    store_id: string | null;
    schedule: unknown;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
  }[];

  const now = new Date();
  const activePromos = promos.filter((p) => {
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at && new Date(p.ends_at) < now) return false;
    return true;
  });
  const followedIds = new Set(activePromos.map((p) => p.id));
  const activeAllPromos = allPromos.filter((p) => {
    if (followedIds.has(p.id)) return false;
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at && new Date(p.ends_at) < now) return false;
    return true;
  });
  const activeCampaigns = campaigns.filter((c) => {
    if (c.store_id && !storeIds.includes(c.store_id)) return false;
    if (c.starts_at && new Date(c.starts_at) > now) return false;
    if (c.ends_at && new Date(c.ends_at) < now) return false;
    return true;
  });

  const storeById = new Map(stores.map((s) => [s.id, s]));

  // ---- Build the personalised block ----
  const lines: string[] = [TAYLOR_SYSTEM_PROMPT, ""];
  if (adminBlock.length) lines.push(...adminBlock);

  lines.push("---");
  lines.push("SUBSCRIBER CONTEXT (use to personalise; never invent beyond this)");
  lines.push("");

  const name = profile?.display_name || profile?.first_name || null;
  const greeting = profile?.preferred_greeting || null;
  const style = profile?.communication_style || null;
  lines.push(`Name: ${name ?? "unknown"}`);
  lines.push(
    `Locale: ${profile?.locale ?? "en-ZA"} / Currency: ${profile?.currency_code ?? "ZAR"}`,
  );
  if (greeting) lines.push(`Preferred greeting: "${greeting}"`);
  if (style) lines.push(`Conversation style: ${style}`);

  const mem = memory ?? { personal: {}, shopping: {}, food: {}, lifestyle: {} };
  const shopping = flatten(mem.shopping);
  const food = flatten(mem.food);
  const lifestyle = flatten(mem.lifestyle);
  if (shopping) lines.push(`Shopping: ${shopping}`);
  if (food) lines.push(`Food & diet: ${food}`);
  if (lifestyle) lines.push(`Lifestyle: ${lifestyle}`);

  if (moments.length) {
    lines.push("");
    lines.push("LIFE MOMENTS (opt-in; reference gently, never intrusively)");
    for (const m of moments) {
      const when = m.moment_date
        ? new Date(m.moment_date).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
          })
        : "date unknown";
      lines.push(`- ${m.type}: ${m.title} (${when}${m.recurs_annually ? ", annual" : ""})`);
    }
  }

  lines.push("");
  if (stores.length === 0) {
    lines.push(
      "FOLLOWED STORES: none yet. Suggest the subscriber connect a store via a QR or join link before promising personalised deals.",
    );
  } else {
    lines.push("FOLLOWED STORES:");
    for (const s of stores) {
      lines.push(`- ${s.name}${s.city ? ` (${s.city})` : ""}`);
    }
  }

  lines.push("");
  if (activePromos.length === 0) {
    lines.push(
      "LIVE PROMOTIONS from followed stores: none right now. You can still help by comparing typical prices across major SA retailers (frame as guidance, not verified live prices) and suggesting stores worth following for live deals.",
    );
  } else {
    lines.push(
      `LIVE PROMOTIONS (${activePromos.length}) — quote only these when the subscriber asks about deals. Include the store name. If is_sponsored=true, LABEL it as sponsored.`,
    );
    for (const p of activePromos.slice(0, 20)) {
      const store = p.store_id ? storeById.get(p.store_id)?.name : null;
      const price = p.sale_price
        ? `${p.currency_code} ${p.sale_price}${
            p.original_price ? ` (was ${p.original_price})` : ""
          }`
        : "price on request";
      const sponsored = p.is_sponsored ? " [SPONSORED]" : "";
      const items = promotionItems(p)
        .map((item) => formatPromotionItem(item))
        .filter(Boolean)
        .slice(0, 12)
        .join(", ");
      const meta = objectRecord((p as { metadata?: unknown }).metadata);
      const gallery = Array.isArray(meta.gallery) ? (meta.gallery as unknown[]).filter((x) => typeof x === "string").length : 0;
      const hasHero = Boolean((p as { hero_image_url?: string | null }).hero_image_url);
      const media = hasHero || gallery > 0
        ? ` [flyer available — call read_promotion_flyer with promotion_id=${p.id}]`
        : "";
      const detail = [p.description, items ? `Items: ${items}` : null].filter(Boolean).join(" | ");
      lines.push(`- (id:${p.id}) ${p.title}${sponsored} — ${price}${store ? ` @ ${store}` : ""}${detail ? ` — ${detail}` : ""}${media}`);
    }
  }

  if (activeCampaigns.length) {
    lines.push("");
    lines.push(
      "LIVE STORE CAMPAIGNS — these are active adverts/messages from followed stores. Use their title/body and any listed promotion items when suggesting meals or recipes.",
    );
    for (const c of activeCampaigns.slice(0, 15)) {
      const store = c.store_id ? storeById.get(c.store_id)?.name : null;
      const schedule = objectRecord(c.schedule);
      const title = stringVal(schedule.title) || c.name;
      const body = stringVal(schedule.body);
      const category = stringVal(schedule.category);
      lines.push(
        `- ${title}${category ? ` [${category}]` : ""}${store ? ` @ ${store}` : ""}${body ? ` — ${body}` : ""}`,
      );
    }
  }

  // Global catalogue Taylor can quote from, even for stores the subscriber doesn't yet follow.
  lines.push("");
  if (allStores.length) {
    lines.push(
      `ALL STORES ON TAYLOR (${allStores.length}) — Taylor may reference any of these when the subscriber asks about a store or product she has not followed yet. Suggest following for personalised deals.`,
    );
    for (const s of allStores.slice(0, 80)) {
      lines.push(`- ${s.name}${s.city ? ` (${s.city})` : ""}`);
    }
  }
  if (activeAllPromos.length) {
    lines.push("");
    lines.push(
      `OTHER LIVE PROMOTIONS ACROSS TAYLOR (${activeAllPromos.length}) — quote only these when the subscriber asks about a deal or price at a store they don't follow. Same rules: name the store, label sponsored, never fabricate prices.`,
    );
    for (const p of activeAllPromos.slice(0, 40)) {
      const store = p.store_id ? allStoreById.get(p.store_id)?.name : null;
      const price = p.sale_price
        ? `${p.currency_code} ${p.sale_price}${p.original_price ? ` (was ${p.original_price})` : ""}`
        : "price on request";
      const sponsored = p.is_sponsored ? " [SPONSORED]" : "";
      const items = promotionItems(p)
        .map((item) => formatPromotionItem(item))
        .filter(Boolean)
        .slice(0, 8)
        .join(", ");
      const meta = objectRecord((p as { metadata?: unknown }).metadata);
      const gallery = Array.isArray(meta.gallery)
        ? (meta.gallery as unknown[]).filter((x) => typeof x === "string").length
        : 0;
      const hasHero = Boolean((p as { hero_image_url?: string | null }).hero_image_url);
      const media =
        hasHero || gallery > 0
          ? ` [flyer available — call read_promotion_flyer with promotion_id=${p.id}]`
          : "";
      const detail = [p.description, items ? `Items: ${items}` : null]
        .filter(Boolean)
        .join(" | ");
      lines.push(
        `- (id:${p.id}) ${p.title}${sponsored} — ${price}${store ? ` @ ${store}` : ""}${detail ? ` — ${detail}` : ""}${media}`,
      );
    }
  }

  lines.push("");
  lines.push("DECISION ENGINE");
  lines.push(
    "- When recommending, name the specific store and promotion from the list above. Never fabricate a price or store.",
  );
  lines.push(
    "- If sponsored, say 'this one is sponsored by <brand>' plainly, then explain why it fits them.",
  );
  lines.push(
    "- If the subscriber's stated preferences (allergies, diet, budget) rule an item out, do not recommend it.",
  );
  lines.push(
    "- If asked why, answer with the specific signals: their followed store, their diet, an active promo.",
  );
  lines.push(
    "- When active promotions or campaigns list food items, combine those exact items into practical meal suggestions or full recipes. Save any full recipe you create.",
  );

  lines.push("");
  lines.push("SAVING FOR THE SUBSCRIBER (tools — use them, don't just describe)");
  lines.push(
    "- When a subscriber asks about a specific promotion, deal, price, or what's on sale, and the promotion shows [flyer available], CALL the read_promotion_flyer tool with that promotion_id FIRST. The flyer image or PDF contains the real advertised prices and items. Use those extracted prices verbatim in your reply — do NOT say 'price on request' or 'I don't have access' when a flyer is available. When you show extracted items to the shopper, ALWAYS keep the Source reference the tool returned (e.g. 'Source: [PDF 1 page 3] top-right' or 'Source: [Image 2] bottom-left') on the same line as the price so they can see which page and section of the flyer the price came from. Only fall back to the summary price if the tool call fails.",
  );
  lines.push(
    "- Whenever you propose a shopping list (from a chat request, a pantry check, a fridge review, or a scanned receipt), CALL the save_shopping_list tool with a short name and the full item array BEFORE finishing your reply. Then mention 'I've saved this to your Lists' with a brief summary.",
  );
  lines.push(
    "- Whenever you share a recipe, CALL the save_recipe tool with title, servings, cooking_time_minutes, difficulty, ingredients and step-by-step instructions BEFORE finishing your reply. Set source to 'chat', 'pantry', 'fridge', or 'receipt' depending on context. Then mention 'I've added it to your Recipes'.",
  );
  lines.push(
    "- Whenever the subscriber asks you to remind them of anything (medication, appointments, tasks, birthdays), CALL the create_reminder tool BEFORE finishing your reply. Parse the day/time from their message: use recurrence 'weekly' with byday (0=Sun..6=Sat) for phrases like 'every Monday', 'daily' for 'every day', 'monthly' for 'every month on the 5th', and 'once' with a YYYY-MM-DD date for a specific single date. Always pass hour and minute in 24h local time. Default timezone is 'Africa/Johannesburg' unless the user says otherwise. After calling the tool, confirm back in plain English, e.g. 'Got it — I'll remind you every Monday at 07:23 to give Gran her medication.' Never claim you've set a reminder without calling the tool.",
  );
  lines.push(
    "- Never invent that you've saved something without actually calling the tool. If a tool call fails, tell the subscriber honestly.",
  );

  return lines.join("\n");
}

function flatten(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const entries = Object.entries(obj as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join("; ");
}

type PromotionProduct = {
  name?: string | null;
  description?: string | null;
  unit?: string | null;
  unit_amount?: number | string | null;
  base_price?: number | string | null;
  currency_code?: string | null;
};

function promotionItems(promo: { promotion_products?: { products?: PromotionProduct | PromotionProduct[] | null }[] | null }) {
  return (promo.promotion_products ?? []).flatMap((row) => {
    const products = row.products;
    if (!products) return [];
    return Array.isArray(products) ? products : [products];
  });
}

function formatPromotionItem(item: PromotionProduct) {
  if (!item.name) return "";
  const amount = item.unit_amount ? `${item.unit_amount}${item.unit ? ` ${item.unit}` : ""}` : "";
  return amount ? `${item.name} (${amount})` : item.name;
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringVal(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

// Re-export the anonymous fallback for callers that want it explicitly.
export { TAYLOR_SYSTEM_PROMPT } from "./ai-gateway.server";

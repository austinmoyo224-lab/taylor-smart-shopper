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
  if (!userId) return TAYLOR_SYSTEM_PROMPT;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
          .select("id, name, city, country_code")
          .in("id", storeIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as { id: string; name: string; city: string | null; country_code: string | null }[] }),
    storeIds.length
      ? supabaseAdmin
          .from("promotions")
          .select(
            "title, type, is_sponsored, original_price, sale_price, currency_code, starts_at, ends_at, store_id, description",
          )
          .in("store_id", storeIds)
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const stores = storesRes.data ?? [];
  const promos = (promosRes.data ?? []) as {
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
  }[];

  const now = new Date();
  const activePromos = promos.filter((p) => {
    if (p.starts_at && new Date(p.starts_at) > now) return false;
    if (p.ends_at && new Date(p.ends_at) < now) return false;
    return true;
  });

  const storeById = new Map(stores.map((s) => [s.id, s]));

  // ---- Build the personalised block ----
  const lines: string[] = [TAYLOR_SYSTEM_PROMPT, ""];

  lines.push("---");
  lines.push("SUBSCRIBER CONTEXT (use to personalise; never invent beyond this)");
  lines.push("");

  const name = profile?.display_name || profile?.first_name || null;
  const greeting = profile?.preferred_greeting || null;
  const style = profile?.communication_style || null;
  lines.push(`Name: ${name ?? "unknown"}`);
  lines.push(`Locale: ${profile?.locale ?? "en-ZA"} / Currency: ${profile?.currency_code ?? "ZAR"}`);
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
      "LIVE PROMOTIONS: none right now. Say so honestly rather than inventing one.",
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
      lines.push(
        `- ${p.title}${sponsored} — ${price}${store ? ` @ ${store}` : ""}`,
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

  return lines.join("\n");
}

function flatten(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const entries = Object.entries(obj as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join("; ");
}

// Re-export the anonymous fallback for callers that want it explicitly.
export { TAYLOR_SYSTEM_PROMPT } from "./ai-gateway.server";
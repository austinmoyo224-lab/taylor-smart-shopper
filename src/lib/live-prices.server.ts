// Live price estimation for the basket comparison.
//
// The Firecrawl scraper extension was deactivated: it returned prices that were
// often wrong or belonged to a different product, which is worse than no price.
// Instead we ask the model (Lovable AI Gateway) for its best current knowledge
// of shelf pricing at the major South African retailers. Every price returned
// here is an ESTIMATE and must be labelled as such in the UI.

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

export type StoreRow = { id: string; name: string; logo_url: string | null };

type LiveRetailer = StoreRow & { key: string };

// Major SA grocery retailers + their on-demand apps.
const LIVE_RETAILERS: LiveRetailer[] = [
  { id: "live:pnp", key: "Pick n Pay", name: "Pick n Pay", logo_url: null },
  { id: "live:checkers", key: "Checkers", name: "Checkers", logo_url: null },
  { id: "live:sixty60", key: "Checkers Sixty60", name: "Checkers Sixty60", logo_url: null },
  { id: "live:shoprite", key: "Shoprite", name: "Shoprite", logo_url: null },
  { id: "live:usave", key: "Usave", name: "Usave", logo_url: null },
  { id: "live:boxer", key: "Boxer", name: "Boxer", logo_url: null },
  { id: "live:woolworths", key: "Woolworths", name: "Woolworths", logo_url: null },
  { id: "live:spar", key: "SPAR", name: "SPAR", logo_url: null },
  { id: "live:makro", key: "Makro", name: "Makro", logo_url: null },
  { id: "live:game", key: "Game", name: "Game", logo_url: null },
];

const PRICE_MAX_RAND = 5_000;
const CONFIDENCE_THRESHOLD = 0.5;
const MAX_ITEMS = 20;

export type PriceMatch = { price: number; confidence: number; estimated: boolean };

const PriceSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      prices: z.array(
        z.object({
          retailer: z.string(),
          price: z.number(),
          confidence: z.number(),
        }),
      ),
    }),
  ),
});

function systemPrompt() {
  const today = new Date().toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" });
  return `You are a South African grocery pricing analyst. Today is ${today}.

For each basket item, give the most accurate CURRENT shelf price in South African Rand for each retailer listed, based on your knowledge of these retailers' websites and apps (Pick n Pay, Checkers, Checkers Sixty60, Shoprite, Usave, Boxer, Woolworths, SPAR, Makro, Game).

RULES
- Price the smallest sensible standard retail unit/pack for that item (e.g. "baby potatoes" = 1kg bag, "milk" = 2L).
- Prices must be realistic for ${today} in South Africa, including normal retailer positioning: Usave/Boxer/Shoprite cheapest on staples, Woolworths premium (usually 20-60% above Shoprite), Checkers Sixty60 slightly above in-store Checkers, Makro cheaper per unit but bulk packs, Game limited grocery range.
- Only include a retailer that genuinely stocks the item. Omit it otherwise (Game and Makro rarely stock fresh produce).
- confidence is 0-1: how sure you are the price is within ~10% of the real shelf price. Use below 0.5 when you are guessing; those are discarded.
- Never invent a promotion. Give regular shelf pricing.
- Use the exact item id given to you.`;
}

async function estimateBasket(
  items: { id: string; name: string }[],
): Promise<Map<string, Map<string, PriceMatch>>> {
  const out = new Map<string, Map<string, PriceMatch>>();
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || items.length === 0) return out;

  const gateway = createLovableAiGatewayProvider(key, undefined, { structuredOutputs: true });
  const retailerNames = LIVE_RETAILERS.map((r) => r.key);

  const prompt = `Retailers: ${retailerNames.join(", ")}

Basket items (id — item):
${items.map((i) => `${i.id} — ${i.name}`).join("\n")}

Return an estimated price per retailer for every item.`;

  let parsed: z.infer<typeof PriceSchema> | null = null;
  try {
    const result = streamText({
      model: gateway("openai/gpt-5.6-sol"),
      system: systemPrompt(),
      prompt,
      output: Output.object({ schema: PriceSchema }),
    });
    parsed = (await result.output) as z.infer<typeof PriceSchema>;
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) {
      console.error("[live-prices] estimation failed", error);
    }
    return out;
  }

  const byKey = new Map(LIVE_RETAILERS.map((r) => [r.key.toLowerCase(), r]));
  for (const row of parsed?.items ?? []) {
    const byStore = new Map<string, PriceMatch>();
    for (const p of row.prices ?? []) {
      const retailer = byKey.get((p.retailer ?? "").trim().toLowerCase());
      if (!retailer) continue;
      const price = Number(p.price);
      const confidence = Number(p.confidence);
      if (!Number.isFinite(price) || price <= 0 || price >= PRICE_MAX_RAND) continue;
      if (!Number.isFinite(confidence) || confidence < CONFIDENCE_THRESHOLD) continue;
      byStore.set(retailer.id, {
        price: Math.round(price * 100) / 100,
        confidence,
        estimated: true,
      });
    }
    if (byStore.size > 0) out.set(row.id, byStore);
  }
  return out;
}

export async function fetchLivePricesForBasket(
  items: { id: string; name: string; quantity: number }[],
): Promise<{ stores: StoreRow[]; perItem: Map<string, Map<string, PriceMatch>> }> {
  const searchable = items.filter((item) => item.name.trim()).slice(0, MAX_ITEMS);
  const perItem = await estimateBasket(searchable.map(({ id, name }) => ({ id, name })));

  const used = new Set<string>();
  for (const byStore of perItem.values()) for (const id of byStore.keys()) used.add(id);

  const stores: StoreRow[] = LIVE_RETAILERS.filter((r) => used.has(r.id)).map((r) => ({
    id: r.id,
    name: r.name,
    logo_url: null,
  }));
  return { stores, perItem };
}

/** Single-product estimate used by Taylor's chat tool. */
export async function estimateProductPrices(
  product: string,
  retailers?: string[],
): Promise<{ retailer: string; price: number; confidence: number }[]> {
  const perItem = await estimateBasket([{ id: "p1", name: product }]);
  const byStore = perItem.get("p1");
  if (!byStore) return [];
  const wanted = retailers?.map((r) => r.trim().toLowerCase());
  return LIVE_RETAILERS.filter((r) => byStore.has(r.id))
    .filter((r) => !wanted?.length || wanted.some((w) => r.key.toLowerCase().includes(w) || w.includes(r.key.toLowerCase())))
    .map((r) => ({
      retailer: r.name,
      price: byStore.get(r.id)!.price,
      confidence: byStore.get(r.id)!.confidence,
    }));
}

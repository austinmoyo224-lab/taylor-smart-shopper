import { firecrawlSearch, type FirecrawlSearchResult } from "@/lib/firecrawl.server";

export type StoreRow = { id: string; name: string; logo_url: string | null };

type LiveRetailer = StoreRow & {
  hostMatches: string[];
  textMatches: (string | RegExp)[];
};

const LIVE_RETAILERS: LiveRetailer[] = [
  {
    id: "live:pnp",
    name: "Pick n Pay (live)",
    logo_url: null,
    hostMatches: ["pnp.co.za", "picknpay", "pick-n-pay", "pick-n-pay"],
    textMatches: ["pick n pay", "pick-n-pay", "picknpay", /\bpnp\b/i],
  },
  {
    id: "live:checkers",
    name: "Checkers (live)",
    logo_url: null,
    hostMatches: ["checkers.co.za"],
    textMatches: ["checkers", "xtra savings"],
  },
  {
    id: "live:shoprite",
    name: "Shoprite (live)",
    logo_url: null,
    hostMatches: ["shoprite.co.za"],
    textMatches: ["shoprite", "xtra savings"],
  },
  {
    id: "live:woolworths",
    name: "Woolworths (live)",
    logo_url: null,
    hostMatches: ["woolworths.co.za"],
    textMatches: ["woolworths", "woolies"],
  },
  {
    id: "live:spar",
    name: "SPAR (live)",
    logo_url: null,
    hostMatches: ["spar.co.za"],
    textMatches: [/\bspar\b/i, "superspar", "kwikspar"],
  },
  {
    id: "live:makro",
    name: "Makro (live)",
    logo_url: null,
    hostMatches: ["makro.co.za"],
    textMatches: ["makro"],
  },
  {
    id: "live:boxer",
    name: "Boxer (live)",
    logo_url: null,
    hostMatches: ["boxer.co.za"],
    textMatches: ["boxer"],
  },
  {
    id: "live:foodlovers",
    name: "Food Lover's Market (live)",
    logo_url: null,
    hostMatches: ["foodlovers.co.za", "foodloversmarket.co.za", "food-lovers-market"],
    textMatches: ["food lover", "food lovers", "food lover's market", "foodlovers"],
  },
  {
    id: "live:okfoods",
    name: "OK Foods (live)",
    logo_url: null,
    hostMatches: ["okfoods.co.za", "ok-foods"],
    textMatches: ["ok foods", "okfoods"],
  },
];

function textFromResult(result: FirecrawlSearchResult) {
  return [result.url, result.title, result.description, result.markdown]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function matchRetailer(result: FirecrawlSearchResult) {
  const text = textFromResult(result);
  return (
    LIVE_RETAILERS.find((retailer) =>
      retailer.hostMatches.some((needle) => text.includes(needle.toLowerCase())),
    ) ??
    LIVE_RETAILERS.find((retailer) =>
      retailer.textMatches.some((needle) =>
        typeof needle === "string" ? text.includes(needle.toLowerCase()) : needle.test(text),
      ),
    ) ??
    null
  );
}

function normalizeItemTerms(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((part) => part.length > 2 && !["the", "and", "with", "for"].includes(part));
}

function resultLooksRelevant(result: FirecrawlSearchResult, itemName: string) {
  const terms = normalizeItemTerms(itemName);
  if (terms.length === 0) return false;
  const titleAndDescription = [result.title, result.description].filter(Boolean).join(" ").toLowerCase();
  const fullText = textFromResult(result);
  return terms.some((term) => titleAndDescription.includes(term)) || terms.every((term) => fullText.includes(term));
}

function extractPrices(text: string | undefined): number[] {
  if (!text) return [];
  const prices: number[] = [];
  const matches = text.matchAll(/R\s?(\d{1,4}(?:[.,]\d{2})?)/gi);
  for (const match of matches) {
    const value = Number(match[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0 && value < 10000) prices.push(value);
  }
  return prices;
}

function extractBestPrice(result: FirecrawlSearchResult, itemName: string): number | null {
  const priorityText = [result.title, result.description].filter(Boolean).join("\n");
  const priorityPrices = extractPrices(priorityText);
  if (priorityPrices.length) return Math.min(...priorityPrices);

  if (!resultLooksRelevant(result, itemName)) return null;
  const allPrices = extractPrices(result.markdown);
  if (allPrices.length === 0) return null;
  return Math.min(...allPrices);
}

export async function fetchLivePricesForBasket(
  items: { id: string; name: string; quantity: number }[],
): Promise<{
  stores: StoreRow[];
  perItem: Map<string, Map<string, number>>;
}> {
  const perItem = new Map<string, Map<string, number>>();
  const usedStoreIds = new Set<string>();

  const searchable = items.filter((item) => item.name.trim()).slice(0, 15);
  await Promise.all(
    searchable.map(async (item) => {
      let results: FirecrawlSearchResult[] = [];
      try {
        results = await firecrawlSearch(
          `"${item.name}" price Pick n Pay Checkers Shoprite Woolworths SPAR Makro Boxer South Africa 2026`,
          { limit: 10, timeoutMs: 15_000 },
        );
      } catch {
        return;
      }

      const byStore = new Map<string, number>();
      for (const result of results) {
        const retailer = matchRetailer(result);
        if (!retailer) continue;
        const price = extractBestPrice(result, item.name);
        if (price == null) continue;
        const previous = byStore.get(retailer.id);
        if (previous == null || price < previous) byStore.set(retailer.id, price);
        usedStoreIds.add(retailer.id);
      }
      if (byStore.size > 0) perItem.set(item.id, byStore);
    }),
  );

  const stores: StoreRow[] = LIVE_RETAILERS.filter((retailer) => usedStoreIds.has(retailer.id)).map(
    (retailer) => ({ id: retailer.id, name: retailer.name, logo_url: null }),
  );

  return { stores, perItem };
}
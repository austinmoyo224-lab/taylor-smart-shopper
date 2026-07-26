import { firecrawlSearch, type FirecrawlSearchResult } from "@/lib/firecrawl.server";

export type StoreRow = { id: string; name: string; logo_url: string | null };

type LiveRetailer = StoreRow & {
  domains: string[];
  searchName: string;
  hostMatches: string[];
  textMatches: (string | RegExp)[];
};

const LIVE_RETAILERS: LiveRetailer[] = [
  {
    id: "live:pnp",
    name: "Pick n Pay (live)",
    logo_url: null,
    domains: ["pnp.co.za"],
    searchName: "Pick n Pay",
    hostMatches: ["pnp.co.za", "picknpay", "pick-n-pay"],
    textMatches: ["pick n pay", "pick-n-pay", "picknpay", /\bpnp\b/i],
  },
  {
    id: "live:checkers",
    name: "Checkers (live)",
    logo_url: null,
    domains: ["checkers.co.za"],
    searchName: "Checkers",
    hostMatches: ["checkers.co.za"],
    textMatches: ["checkers", "xtra savings"],
  },
  {
    id: "live:shoprite",
    name: "Shoprite (live)",
    logo_url: null,
    domains: ["shoprite.co.za"],
    searchName: "Shoprite",
    hostMatches: ["shoprite.co.za"],
    textMatches: ["shoprite", "xtra savings"],
  },
  {
    id: "live:woolworths",
    name: "Woolworths (live)",
    logo_url: null,
    domains: ["woolworths.co.za"],
    searchName: "Woolworths",
    hostMatches: ["woolworths.co.za"],
    textMatches: ["woolworths", "woolies"],
  },
  {
    id: "live:spar",
    name: "SPAR (live)",
    logo_url: null,
    domains: ["spar.co.za"],
    searchName: "SPAR",
    hostMatches: ["spar.co.za"],
    textMatches: [/\bspar\b/i, "superspar", "kwikspar"],
  },
  {
    id: "live:makro",
    name: "Makro (live)",
    logo_url: null,
    domains: ["makro.co.za"],
    searchName: "Makro",
    hostMatches: ["makro.co.za"],
    textMatches: ["makro"],
  },
  {
    id: "live:boxer",
    name: "Boxer (live)",
    logo_url: null,
    domains: ["boxer.co.za"],
    searchName: "Boxer",
    hostMatches: ["boxer.co.za"],
    textMatches: ["boxer"],
  },
  {
    id: "live:foodlovers",
    name: "Food Lover's Market (live)",
    logo_url: null,
    domains: ["foodlovers.co.za", "foodloversmarket.co.za"],
    searchName: "Food Lover's Market",
    hostMatches: ["foodlovers.co.za", "foodloversmarket.co.za", "food-lovers-market"],
    textMatches: ["food lover", "food lovers", "food lover's market", "foodlovers"],
  },
  {
    id: "live:okfoods",
    name: "OK Foods (live)",
    logo_url: null,
    domains: ["okfoods.co.za"],
    searchName: "OK Foods",
    hostMatches: ["okfoods.co.za", "ok-foods"],
    textMatches: ["ok foods", "okfoods"],
  },
];

const LIVE_RETAILER_LOOKUP_LIMIT = 5;
const PRICE_MAX_RAND = 1_000;

function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isOfficialRetailerUrl(result: FirecrawlSearchResult, retailer: LiveRetailer) {
  const host = hostFromUrl(result.url);
  if (!host || result.url.toLowerCase().endsWith(".pdf")) return false;
  return retailer.domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

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
    .replace(/\b\d+\s?(?:ml|l|g|kg|pack|s)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((part) => part.length > 2 && !["the", "and", "with", "for"].includes(part));
}

function resultLooksRelevant(result: FirecrawlSearchResult, itemName: string) {
  const terms = normalizeItemTerms(itemName);
  if (terms.length === 0) return false;
  const titleAndDescription = [result.title, result.description].filter(Boolean).join(" ").toLowerCase();
  const fullText = textFromResult(result);
  const requiredMatches = Math.min(terms.length, 2);
  const titleMatches = terms.filter((term) => titleAndDescription.includes(term)).length;
  const fullMatches = terms.filter((term) => fullText.includes(term)).length;
  return titleMatches >= requiredMatches || fullMatches >= terms.length;
}

function extractPrices(text: string | undefined): number[] {
  if (!text) return [];
  const prices: number[] = [];
  const matches = text.matchAll(/(?:^|[^A-Za-z0-9])R\s*(\d{1,3}(?:[\s\u00a0]\d{3})*(?:[.,]\d{2})?|\d{1,4}(?:[.,]\d{2})?)(?!\d)/g);
  for (const match of matches) {
    const value = Number(match[1].replace(/[\s\u00a0]/g, "").replace(",", "."));
    if (Number.isFinite(value) && value > 0 && value < PRICE_MAX_RAND) prices.push(value);
  }
  return prices;
}

function extractBestPrice(result: FirecrawlSearchResult, itemName: string): number | null {
  if (!resultLooksRelevant(result, itemName)) return null;

  const lines = (result.markdown ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const title = (result.title ?? itemName).toLowerCase();
  const terms = normalizeItemTerms(itemName);
  const productLineIndex = lines.findIndex((line) => {
    const lower = line.toLowerCase();
    return lower.includes(title) || terms.every((term) => lower.includes(term));
  });

  if (productLineIndex >= 0) {
    const stopWords = ["related products", "recommended", "similar", "customers also", "product info"];
    const nearbyLines: string[] = [];
    for (const line of lines.slice(productLineIndex, productLineIndex + 12)) {
      const lower = line.toLowerCase();
      if (stopWords.some((word) => lower.includes(word))) break;
      nearbyLines.push(line);
    }
    const nearbyPrices = extractPrices(nearbyLines.join("\n"));
    if (nearbyPrices.length) return nearbyPrices[0];
  }

  const priorityText = [result.title, result.description].filter(Boolean).join("\n");
  const priorityPrices = extractPrices(priorityText);
  if (priorityPrices.length) return priorityPrices[0];

  const firstScreen = lines.slice(0, 60).join("\n");
  const firstScreenPrices = extractPrices(firstScreen);
  return firstScreenPrices[0] ?? null;
}

async function fetchRetailerItemPrice(itemName: string, retailer: LiveRetailer) {
  const siteClause = retailer.domains.map((domain) => `site:${domain}`).join(" OR ");
  const query = `${siteClause} "${itemName}" "${retailer.searchName}" price South Africa`;
  const results = await firecrawlSearch(query, { limit: 3, scrape: true, timeoutMs: 18_000 });

  for (const result of results) {
    if (!isOfficialRetailerUrl(result, retailer)) continue;
    const price = extractBestPrice(result, itemName);
    if (price != null) return price;
  }
  return null;
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
      const byStore = new Map<string, number>();
      await Promise.all(
        LIVE_RETAILERS.slice(0, LIVE_RETAILER_LOOKUP_LIMIT).map(async (retailer) => {
          try {
            const price = await fetchRetailerItemPrice(item.name, retailer);
            if (price == null) return;
            byStore.set(retailer.id, price);
            usedStoreIds.add(retailer.id);
          } catch {
            // Keep comparison safe: one retailer lookup must never block the whole basket.
          }
        }),
      );
      if (byStore.size > 0) perItem.set(item.id, byStore);
    }),
  );

  const stores: StoreRow[] = LIVE_RETAILERS.filter((retailer) => usedStoreIds.has(retailer.id)).map(
    (retailer) => ({ id: retailer.id, name: retailer.name, logo_url: null }),
  );

  return { stores, perItem };
}
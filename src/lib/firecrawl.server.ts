// Firecrawl live-price lookup helper (gateway-backed).
// Uses Firecrawl v2 through the Lovable connector gateway.

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

function headers() {
  const lovable = process.env.LOVABLE_API_KEY;
  const fc = process.env.FIRECRAWL_API_KEY;
  if (!lovable || !fc) throw new Error("Firecrawl not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": fc,
  };
}

export interface FirecrawlSearchResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asSearchResults(value: unknown): FirecrawlSearchResult[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (item): item is FirecrawlSearchResult =>
      item != null && typeof item === "object" && typeof (item as { url?: unknown }).url === "string",
  );
}

function normalizeSearchResults(payload: unknown): FirecrawlSearchResult[] {
  const root = asRecord(payload);
  if (!root) return [];

  const direct = asSearchResults(root.data) ?? asSearchResults(root.web) ?? asSearchResults(root.results);
  if (direct) return direct;

  const data = asRecord(root.data);
  if (!data) return [];
  return asSearchResults(data.web) ?? asSearchResults(data.data) ?? asSearchResults(data.results) ?? [];
}

export async function firecrawlSearch(
  query: string,
  opts: { limit?: number; scrape?: boolean; timeoutMs?: number } = {},
): Promise<FirecrawlSearchResult[]> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);
  try {
    const body: Record<string, unknown> = {
      query,
      limit: opts.limit ?? 5,
      country: "za",
      lang: "en",
    };
    if (opts.scrape) {
      body.scrapeOptions = { formats: ["markdown"], onlyMainContent: true };
    }
    const res = await fetch(`${GATEWAY}/search`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Firecrawl search failed (${res.status}): ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    return normalizeSearchResults(json);
  } finally {
    clearTimeout(t);
  }
}

export async function firecrawlScrape(
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<{ markdown?: string; metadata?: Record<string, unknown> }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);
  try {
    const res = await fetch(`${GATEWAY}/scrape`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Firecrawl scrape failed (${res.status}): ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: { markdown?: string; metadata?: Record<string, unknown> };
      markdown?: string;
      metadata?: Record<string, unknown>;
    };
    return json.data ?? { markdown: json.markdown, metadata: json.metadata };
  } finally {
    clearTimeout(t);
  }
}
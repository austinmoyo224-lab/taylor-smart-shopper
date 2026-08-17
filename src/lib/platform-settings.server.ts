// Server-only access to the private platform_settings table.
// Used to override Lovable-managed connector keys with the operator's own keys.

const CACHE_TTL_MS = 30_000;
let cache: { value: string | null; at: number } | null = null;

export const GOOGLE_MAPS_KEY_SETTING = "google_maps_api_key";

export async function getSetting(key: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) return null;
  const v = (data?.value ?? "").trim();
  return v ? v : null;
}

export async function setSetting(key: string, value: string | null, userId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("platform_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by: userId ?? null },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
  if (key === GOOGLE_MAPS_KEY_SETTING) cache = null;
}

/** Operator-supplied Google Maps key, if configured (cached briefly). */
export async function getCustomGoogleMapsKey(): Promise<string | null> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;
  const value = await getSetting(GOOGLE_MAPS_KEY_SETTING);
  cache = { value, at: now };
  return value;
}

export function clearGoogleMapsKeyCache() {
  cache = null;
}

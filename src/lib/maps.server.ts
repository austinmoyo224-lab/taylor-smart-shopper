// Google Maps Platform helpers (gateway-backed connector).
// Used by Taylor for restaurant discovery, ratings/reviews and road-trip routing.

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function mapsHeaders(fieldMask?: string): Record<string, string> {
  const lovable = process.env.LOVABLE_API_KEY;
  const maps = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovable || !maps) throw new Error("Google Maps is not configured");
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": maps,
  };
  if (fieldMask) h["X-Goog-FieldMask"] = fieldMask;
  return h;
}

async function mapsFetch(path: string, init: RequestInit & { fieldMask?: string }) {
  const { fieldMask, ...rest } = init;
  // Server-side Maps calls always use the linked connector. The custom key in
  // platform settings is browser/referrer restricted and fails from the server.
  const res = await fetch(`${GATEWAY}${path}`, {
    ...rest,
    headers: mapsHeaders(fieldMask),
    signal: rest.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403) {
      throw new Error(
        `Google Maps request was denied (403). Check the server key's restrictions in Google Cloud Console. ${body.slice(0, 200)}`,
      );
    }
    throw new Error(`Google Maps request failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** Lightweight connectivity check used by the admin console. */
export async function verifyMapsKey(): Promise<{ ok: true; sample: string }> {
  const json = (await mapsFetch("/places/v1/places:searchText", {
    method: "POST",
    body: JSON.stringify({
      textQuery: "restaurant in Johannesburg",
      maxResultCount: 1,
      regionCode: "ZA",
      languageCode: "en",
    }),
    fieldMask: "places.displayName",
  })) as { places?: Array<{ displayName?: { text?: string } }> };
  return { ok: true, sample: json.places?.[0]?.displayName?.text ?? "no results" };
}

export interface PlaceSummary {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  review_count?: number;
  price_level?: string;
  open_now?: boolean;
  types?: string[];
  maps_url?: string;
  location?: { lat: number; lng: number };
  top_reviews?: Array<{ rating?: number; text?: string; author?: string }>;
}

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
  types?: string[];
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    authorAttribution?: { displayName?: string };
  }>;
};

function toSummary(p: RawPlace): PlaceSummary {
  return {
    id: p.id ?? "",
    name: p.displayName?.text ?? "Unknown",
    address: p.formattedAddress,
    rating: p.rating,
    review_count: p.userRatingCount,
    price_level: p.priceLevel,
    open_now: p.currentOpeningHours?.openNow,
    types: p.types?.slice(0, 4),
    maps_url: p.googleMapsUri,
    location:
      p.location?.latitude != null && p.location?.longitude != null
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : undefined,
    top_reviews: p.reviews?.slice(0, 3).map((r) => ({
      rating: r.rating,
      text: r.text?.text?.slice(0, 400),
      author: r.authorAttribution?.displayName,
    })),
  };
}

const LIST_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours.openNow,places.types,places.googleMapsUri,places.location";

export async function searchRestaurants(
  query: string,
  opts: { limit?: number; openNow?: boolean; minRating?: number } = {},
): Promise<PlaceSummary[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    includedType: "restaurant",
    maxResultCount: Math.min(opts.limit ?? 8, 20),
    regionCode: "ZA",
    languageCode: "en",
    rankPreference: "RELEVANCE",
  };
  if (opts.openNow) body.openNow = true;
  if (opts.minRating) body.minRating = opts.minRating;
  const json = (await mapsFetch("/places/v1/places:searchText", {
    method: "POST",
    body: JSON.stringify(body),
    fieldMask: LIST_MASK,
  })) as { places?: RawPlace[] };
  return (json.places ?? []).map(toSummary);
}

export async function getPlaceDetails(placeId: string): Promise<PlaceSummary> {
  const json = (await mapsFetch(`/places/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    fieldMask:
      "id,displayName,formattedAddress,rating,userRatingCount,priceLevel,currentOpeningHours.openNow,types,googleMapsUri,location,reviews",
  })) as RawPlace;
  return toSummary(json);
}

export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radiusMeters = 15000,
  limit = 5,
): Promise<PlaceSummary[]> {
  const json = (await mapsFetch("/places/v1/places:searchNearby", {
    method: "POST",
    fieldMask: LIST_MASK,
    body: JSON.stringify({
      includedTypes: ["restaurant"],
      maxResultCount: Math.min(limit, 20),
      rankPreference: "POPULARITY",
      languageCode: "en",
      regionCode: "ZA",
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
    }),
  })) as { places?: RawPlace[] };
  return (json.places ?? []).map(toSummary);
}

export interface RouteInfo {
  distance_km: number;
  duration_text: string;
  duration_seconds: number;
  polyline: string;
  summary?: string;
  warnings?: string[];
}

export async function computeRoute(origin: string, destination: string): Promise<RouteInfo> {
  const json = (await mapsFetch("/routes/directions/v2:computeRoutes", {
    method: "POST",
    fieldMask:
      "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.description,routes.warnings",
    body: JSON.stringify({
      origin: { address: `${origin}, South Africa` },
      destination: { address: `${destination}, South Africa` },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      languageCode: "en-ZA",
      units: "METRIC",
      regionCode: "ZA",
    }),
  })) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
      description?: string;
      warnings?: string[];
    }>;
  };
  const r = json.routes?.[0];
  if (!r) throw new Error("No route found between those places.");
  const seconds = Number(String(r.duration ?? "0s").replace("s", "")) || 0;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return {
    distance_km: Math.round((r.distanceMeters ?? 0) / 100) / 10,
    duration_seconds: seconds,
    duration_text: hours ? `${hours}h ${mins}m` : `${mins}m`,
    polyline: r.polyline?.encodedPolyline ?? "",
    summary: r.description,
    warnings: r.warnings,
  };
}

/** Decode a Google encoded polyline into [lat, lng] pairs. */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** Pick evenly spaced sample points along a decoded path. */
export function samplePath(path: Array<[number, number]>, samples: number): Array<[number, number]> {
  if (path.length <= samples) return path;
  const out: Array<[number, number]> = [];
  const step = (path.length - 1) / (samples - 1);
  for (let i = 0; i < samples; i++) out.push(path[Math.round(i * step)]);
  return out;
}
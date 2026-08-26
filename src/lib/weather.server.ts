type GeocodingResult = {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
  country_code?: string;
};

type GoogleCondition = { description?: { text?: string } };
type GooglePrecipitation = {
  probability?: { percent?: number };
  qpf?: { quantity?: number };
};
type GoogleCurrent = {
  currentTime?: string;
  timeZone?: { id?: string };
  weatherCondition?: GoogleCondition;
  temperature?: { degrees?: number };
  feelsLikeTemperature?: { degrees?: number };
  relativeHumidity?: number;
  precipitation?: GooglePrecipitation;
  wind?: { speed?: { value?: number } };
};
type GoogleForecastDay = {
  displayDate?: { year?: number; month?: number; day?: number };
  daytimeForecast?: {
    weatherCondition?: GoogleCondition;
    precipitation?: GooglePrecipitation;
  };
  nighttimeForecast?: { precipitation?: GooglePrecipitation };
  maxTemperature?: { degrees?: number };
  minTemperature?: { degrees?: number };
  sunEvents?: { sunriseTime?: string; sunsetTime?: string };
};
type GoogleForecastHour = {
  interval?: { startTime?: string };
  weatherCondition?: GoogleCondition;
  temperature?: { degrees?: number };
  precipitation?: GooglePrecipitation;
};

export type SouthAfricanWeather = {
  ok: true;
  location: string;
  coordinates: { latitude: number; longitude: number };
  observed_at: string | null;
  timezone: string;
  current: {
    temperature_c: number;
    feels_like_c: number | null;
    humidity_percent: number | null;
    precipitation_mm: number | null;
    wind_kmh: number | null;
    condition: string;
  };
  forecast: Array<{
    date: string;
    high_c: number | null;
    low_c: number | null;
    condition: string;
    rain_probability_percent: number | null;
    rain_mm: number | null;
    sunrise: string | null;
    sunset: string | null;
  }>;
  hourly: Array<{
    time: string;
    temperature_c: number | null;
    rain_probability_percent: number | null;
    condition: string;
  }>;
  meal_hint: string;
};

const freshWeatherCache = new Map<string, { value: SouthAfricanWeather; expiresAt: number }>();
const staleWeatherCache = new Map<string, { value: SouthAfricanWeather; expiresAt: number }>();
/** One in-flight lookup per city, so parallel callers share a single request. */
const inFlight = new Map<string, Promise<SouthAfricanWeather>>();

/** How long a per-city reading is considered fresh before a background refresh. */
export const WEATHER_FRESH_MS = 15 * 60 * 1000;
/** How long a stale reading may still be served if the provider is unavailable. */
export const WEATHER_STALE_MS = 6 * 60 * 60 * 1000;
const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function cacheKeyFor(location: string) {
  return (location.trim() || "Johannesburg").toLocaleLowerCase("en-ZA");
}

/**
 * Cached, per-city weather with stale-while-revalidate: fresh readings return
 * instantly, slightly-old readings return instantly and refresh in the
 * background, and only a cold city waits for the provider.
 */
export async function getCityWeather(location: string): Promise<SouthAfricanWeather> {
  const key = cacheKeyFor(location);
  const fresh = freshWeatherCache.get(key);
  if (fresh && fresh.expiresAt > Date.now()) return fresh.value;

  const stale = staleWeatherCache.get(key);
  if (stale && stale.expiresAt > Date.now()) {
    if (!inFlight.has(key)) void refresh(location, key).catch(() => undefined);
    return stale.value;
  }
  return refresh(location, key);
}

function refresh(location: string, key: string): Promise<SouthAfricanWeather> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = lookupSouthAfricanWeather(location).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/** Fetch several cities at once, sharing the per-city cache and in-flight requests. */
export async function getCitiesWeather(
  locations: string[],
): Promise<Array<SouthAfricanWeather | null>> {
  return Promise.all(locations.map((l) => getCityWeather(l).catch(() => null)));
}


export function weatherCodeLabel(code: number): string {
  if (code === 0) return "clear sky";
  if ([1, 2, 3].includes(code)) return "partly cloudy";
  if ([45, 48].includes(code)) return "foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "mixed conditions";
}

function mapsHeaders(): Record<string, string> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) throw new Error("Live weather is not configured.");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
  };
}

async function googleGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GATEWAY}${path}`);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url, {
    headers: mapsHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 403) {
      throw new Error("Live weather access was denied. Check the Google Maps connection.");
    }
    throw new Error(`Live weather lookup failed (${response.status}). ${body.slice(0, 120)}`);
  }
  return response.json() as Promise<T>;
}

async function geocodeSouthAfricanLocation(query: string): Promise<GeocodingResult> {
  const candidates = Array.from(
    new Set([query, ...query.split(",").map((part) => part.trim()).filter(Boolean)]),
  );
  for (const candidate of candidates) {
    const result = await googleGet<{
      status?: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name?: string; types?: string[] }>;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    }>("/maps/api/geocode/json", {
      address: `${candidate}, South Africa`,
      region: "za",
    });
    const hit = result.results?.[0];
    const latitude = hit?.geometry?.location?.lat;
    const longitude = hit?.geometry?.location?.lng;
    if (typeof latitude !== "number" || typeof longitude !== "number") continue;
    const locality = hit?.address_components?.find((part) =>
      part.types?.some((type) => ["locality", "sublocality", "administrative_area_level_2"].includes(type)),
    )?.long_name;
    const province = hit?.address_components?.find((part) =>
      part.types?.includes("administrative_area_level_1"),
    )?.long_name;
    return {
      latitude,
      longitude,
      name: locality ?? hit?.formatted_address?.split(",")[0] ?? candidate,
      admin1: province,
      country_code: "ZA",
    };
  }
  throw new Error(`Couldn't find "${query}" in South Africa.`);
}

export async function lookupSouthAfricanWeather(location: string): Promise<SouthAfricanWeather> {
  const query = location.trim() || "Johannesburg";
  const cacheKey = query.toLocaleLowerCase("en-ZA");
  const cached = freshWeatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const stale = staleWeatherCache.get(cacheKey);

  try {
    const first = await geocodeSouthAfricanLocation(query);
    const coordinates = {
      "location.latitude": String(first.latitude),
      "location.longitude": String(first.longitude),
      unitsSystem: "METRIC",
    };
    const [current, daysResponse, hoursResponse] = await Promise.all([
      googleGet<GoogleCurrent>("/weather/v1/currentConditions:lookup", coordinates),
      googleGet<{ forecastDays?: GoogleForecastDay[]; timeZone?: { id?: string } }>(
        "/weather/v1/forecast/days:lookup",
        { ...coordinates, days: "7", pageSize: "7" },
      ),
      googleGet<{ forecastHours?: GoogleForecastHour[] }>(
        "/weather/v1/forecast/hours:lookup",
        { ...coordinates, hours: "12", pageSize: "12" },
      ),
    ]);
    const tempC = current.temperature?.degrees;
    if (typeof tempC !== "number") {
      throw new Error(`Live temperature is temporarily unavailable for ${first.name}.`);
    }

    const forecast = (daysResponse.forecastDays ?? []).map((day) => {
      const date = day.displayDate;
      const dateText = date?.year && date.month && date.day
        ? `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
        : day.daytimeForecast?.weatherCondition?.description?.text ?? "";
      const dayRain = day.daytimeForecast?.precipitation?.probability?.percent;
      const nightRain = day.nighttimeForecast?.precipitation?.probability?.percent;
      return {
        date: dateText,
        high_c: day.maxTemperature?.degrees ?? null,
        low_c: day.minTemperature?.degrees ?? null,
        condition: day.daytimeForecast?.weatherCondition?.description?.text?.toLocaleLowerCase("en-ZA") ?? "mixed conditions",
        rain_probability_percent:
          dayRain === undefined && nightRain === undefined ? null : Math.max(dayRain ?? 0, nightRain ?? 0),
        rain_mm: day.daytimeForecast?.precipitation?.qpf?.quantity ?? null,
        sunrise: day.sunEvents?.sunriseTime ?? null,
        sunset: day.sunEvents?.sunsetTime ?? null,
      };
    }).filter((day) => Boolean(day.date)).slice(0, 7);

    const hourly = (hoursResponse.forecastHours ?? []).map((hour) => ({
      time: hour.interval?.startTime ?? "",
      temperature_c: hour.temperature?.degrees ?? null,
      rain_probability_percent: hour.precipitation?.probability?.percent ?? null,
      condition: hour.weatherCondition?.description?.text?.toLocaleLowerCase("en-ZA") ?? "mixed conditions",
    })).filter((hour) => Boolean(hour.time)).slice(0, 12);

    const result: SouthAfricanWeather = {
    ok: true,
    location: `${first.name}${first.admin1 ? `, ${first.admin1}` : ""}`,
    coordinates: { latitude: first.latitude, longitude: first.longitude },
    observed_at: current.currentTime ?? null,
    timezone: current.timeZone?.id ?? daysResponse.timeZone?.id ?? "Africa/Johannesburg",
    current: {
      temperature_c: tempC,
      feels_like_c: current.feelsLikeTemperature?.degrees ?? null,
      humidity_percent: current.relativeHumidity ?? null,
      precipitation_mm: current.precipitation?.qpf?.quantity ?? null,
      wind_kmh: current.wind?.speed?.value ?? null,
      condition: current.weatherCondition?.description?.text?.toLocaleLowerCase("en-ZA") ?? "mixed conditions",
    },
    forecast,
    hourly,
    meal_hint:
      tempC <= 15
        ? "cold — suggest hearty warm meals"
        : tempC >= 26
          ? "hot — suggest light, fresh meals"
          : "mild — any meal type works",
    };
    freshWeatherCache.set(cacheKey, { value: result, expiresAt: Date.now() + WEATHER_FRESH_MS });
    staleWeatherCache.set(cacheKey, { value: result, expiresAt: Date.now() + WEATHER_STALE_MS });
    return result;
  } catch (error) {
    if (stale && stale.expiresAt > Date.now()) return stale.value;
    throw error;
  }
}
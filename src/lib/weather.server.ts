type GeocodingResult = {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
  country_code?: string;
};

type ForecastResponse = {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
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
  meal_hint: string;
};

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

export async function lookupSouthAfricanWeather(location: string): Promise<SouthAfricanWeather> {
  const query = location.trim();
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.search = new URLSearchParams({
    name: query,
    count: "5",
    countryCode: "ZA",
    language: "en",
    format: "json",
  }).toString();

  const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(10_000) });
  if (!geoRes.ok) throw new Error(`Weather location lookup failed (${geoRes.status}).`);
  const geo = (await geoRes.json()) as { results?: GeocodingResult[] };
  const first = geo.results?.find((place) => place.country_code === "ZA") ?? geo.results?.[0];
  if (!first) throw new Error(`Couldn't find "${query}" in South Africa.`);

  const wxUrl = new URL("https://api.open-meteo.com/v1/forecast");
  wxUrl.search = new URLSearchParams({
    latitude: String(first.latitude),
    longitude: String(first.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,sunrise,sunset",
    timezone: "auto",
    forecast_days: "3",
  }).toString();

  const wxRes = await fetch(wxUrl, { signal: AbortSignal.timeout(10_000) });
  if (!wxRes.ok) throw new Error(`Weather forecast lookup failed (${wxRes.status}).`);
  const wx = (await wxRes.json()) as ForecastResponse;
  const tempC = wx.current?.temperature_2m;
  if (typeof tempC !== "number") {
    throw new Error(`Live temperature is temporarily unavailable for ${first.name}.`);
  }

  const forecast = (wx.daily?.time ?? []).map((date, index) => ({
    date,
    high_c: wx.daily?.temperature_2m_max?.[index] ?? null,
    low_c: wx.daily?.temperature_2m_min?.[index] ?? null,
    condition: weatherCodeLabel(wx.daily?.weather_code?.[index] ?? 0),
    rain_probability_percent: wx.daily?.precipitation_probability_max?.[index] ?? null,
    rain_mm: wx.daily?.precipitation_sum?.[index] ?? null,
    sunrise: wx.daily?.sunrise?.[index] ?? null,
    sunset: wx.daily?.sunset?.[index] ?? null,
  }));

  return {
    ok: true,
    location: `${first.name}${first.admin1 ? `, ${first.admin1}` : ""}`,
    coordinates: { latitude: first.latitude, longitude: first.longitude },
    observed_at: wx.current?.time ?? null,
    timezone: wx.timezone ?? "Africa/Johannesburg",
    current: {
      temperature_c: tempC,
      feels_like_c: wx.current?.apparent_temperature ?? null,
      humidity_percent: wx.current?.relative_humidity_2m ?? null,
      precipitation_mm: wx.current?.precipitation ?? null,
      wind_kmh: wx.current?.wind_speed_10m ?? null,
      condition: weatherCodeLabel(wx.current?.weather_code ?? 0),
    },
    forecast,
    meal_hint:
      tempC <= 15
        ? "cold — suggest hearty warm meals"
        : tempC >= 26
          ? "hot — suggest light, fresh meals"
          : "mild — any meal type works",
  };
}
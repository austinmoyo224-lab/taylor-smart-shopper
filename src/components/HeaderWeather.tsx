import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloudSun, MapPin, X, Loader2 } from "lucide-react";
import { getCurrentLocation } from "@/hooks/useGeolocation";

export interface WeatherSnapshot {
  place: string;
  temp: number;
  feels: number;
  high: number;
  low: number;
  label: string;
  code: number;
  humidity: number;
  wind: number;
  precipitation: number;
  sunrise: string | null;
  sunset: string | null;
  hourly: { time: string; temp: number; code: number; rain: number }[];
}

export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

function weatherEmoji(code: number, night = false): string {
  if (code === 0) return night ? "🌙" : "☀️";
  if (code <= 2) return night ? "☁️" : "⛅";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

async function reverseName(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`,
    );
    const j = (await r.json()) as { results?: { name?: string }[] };
    return j.results?.[0]?.name ?? "Your area";
  } catch {
    return "Your area";
  }
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json&country=ZA`,
    );
    const j = (await r.json()) as {
      results?: { latitude: number; longitude: number; name: string }[];
    };
    const hit = j.results?.[0];
    return hit ? { lat: hit.latitude, lon: hit.longitude, name: hit.name } : null;
  } catch {
    return null;
  }
}

async function loadWeather(lat: number, lon: number, place: string): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&timezone=Africa%2FJohannesburg&forecast_days=1`;
  const r = await fetch(url);
  const j = (await r.json()) as {
    current?: Record<string, number>;
    hourly?: {
      time: string[];
      temperature_2m: number[];
      weather_code: number[];
      precipitation_probability: number[];
    };
    daily?: {
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      sunrise: string[];
      sunset: string[];
    };
  };
  const c = j.current ?? {};
  const nowIdx = Math.max(
    0,
    (j.hourly?.time ?? []).findIndex((t) => new Date(t).getTime() >= Date.now() - 60 * 60 * 1000),
  );
  const hourly = (j.hourly?.time ?? []).slice(nowIdx, nowIdx + 8).map((t, i) => ({
    time: t,
    temp: Math.round(j.hourly?.temperature_2m?.[nowIdx + i] ?? 0),
    code: j.hourly?.weather_code?.[nowIdx + i] ?? 0,
    rain: j.hourly?.precipitation_probability?.[nowIdx + i] ?? 0,
  }));
  const code = c["weather_code"] ?? 0;
  return {
    place,
    temp: Math.round(c["temperature_2m"] ?? 0),
    feels: Math.round(c["apparent_temperature"] ?? c["temperature_2m"] ?? 0),
    high: Math.round(j.daily?.temperature_2m_max?.[0] ?? 0),
    low: Math.round(j.daily?.temperature_2m_min?.[0] ?? 0),
    label: weatherCodeLabel(code),
    code,
    humidity: Math.round(c["relative_humidity_2m"] ?? 0),
    wind: Math.round(c["wind_speed_10m"] ?? 0),
    precipitation: c["precipitation"] ?? 0,
    sunrise: j.daily?.sunrise?.[0] ?? null,
    sunset: j.daily?.sunset?.[0] ?? null,
    hourly,
  };
}

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * Compact date + weather chip for screen headers. Tapping it opens a full
 * weather detail sheet (current conditions, hi/lo and an hourly strip).
 */
export function HeaderWeather({ fallbackCity }: { fallbackCity?: string | null }) {
  const [wx, setWx] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let lat: number | null = null;
        let lon: number | null = null;
        let place = "";
        try {
          const loc = await getCurrentLocation();
          lat = loc.latitude;
          lon = loc.longitude;
          place = await reverseName(lat, lon);
        } catch {
          const geo = fallbackCity ? await geocodeCity(fallbackCity) : null;
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
            place = geo.name;
          }
        }
        if (lat == null || lon == null) {
          // Default to Johannesburg so the chip is never empty.
          lat = -26.2041;
          lon = 28.0473;
          place = "Johannesburg";
        }
        const data = await loadWeather(lat, lon, place);
        if (!cancelled) setWx(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallbackCity]);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
  const isNight = now.getHours() < 6 || now.getHours() >= 18;

  return (
    <>
      <button
        type="button"
        onClick={() => wx && setOpen(true)}
        aria-label="Open weather details"
        className="flex items-center gap-2 rounded-2xl border border-border bg-card/70 px-3 py-2 text-right shadow-sm backdrop-blur transition active:scale-95"
      >
        <span className="text-lg leading-none">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted" />
          ) : (
            weatherEmoji(wx?.code ?? 0, isNight)
          )}
        </span>
        <span className="flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold text-foreground">
            {wx ? `${wx.temp}°` : "--°"}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
            {dateLabel}
          </span>
        </span>
      </button>

      {mounted && open && wx
        ? createPortal(<WeatherSheet wx={wx} onClose={() => setOpen(false)} />, document.body)
        : null}
    </>
  );
}

function WeatherSheet({ wx, onClose }: { wx: WeatherSnapshot; onClose: () => void }) {
  const now = new Date();
  const isNight = now.getHours() < 6 || now.getHours() >= 18;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <button className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-primary text-primary-foreground shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 opacity-80" />
            <h2 className="text-lg font-semibold">{wx.place}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close weather"
            className="rounded-full bg-primary-foreground/15 p-1.5"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-end justify-between px-6 pb-4 pt-4">
          <div>
            <p className="text-6xl font-light leading-none">{wx.temp}°</p>
            <p className="mt-2 text-lg font-semibold">{wx.label}</p>
            <p className="mt-3 text-sm opacity-80">
              ↑{wx.high}° / ↓{wx.low}°
            </p>
            <p className="text-sm opacity-80">Feels like {wx.feels}°</p>
          </div>
          <div className="text-6xl leading-none">{weatherEmoji(wx.code, isNight)}</div>
        </div>

        <div className="mx-4 mb-4 rounded-2xl bg-primary-foreground/10 px-4 py-4">
          <p className="text-sm font-medium">
            {now.toLocaleDateString("en-ZA", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {" · "}
            {now.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </p>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
            {wx.hourly.map((h) => (
              <div key={h.time} className="flex min-w-[52px] flex-col items-center gap-1">
                <span className="text-[11px] opacity-80">{timeFmt(h.time)}</span>
                <span className="text-lg leading-none">
                  {weatherEmoji(h.code, new Date(h.time).getHours() < 6 || new Date(h.time).getHours() >= 18)}
                </span>
                <span className="text-sm font-semibold">{h.temp}°</span>
                <span className="text-[10px] opacity-70">{h.rain}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-8">
          <Stat label="Humidity" value={`${wx.humidity}%`} />
          <Stat label="Wind" value={`${wx.wind} km/h`} />
          <Stat label="Sunrise" value={wx.sunrise ? timeFmt(wx.sunrise) : "—"} />
          <Stat label="Sunset" value={wx.sunset ? timeFmt(wx.sunset) : "—"} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

export { CloudSun };

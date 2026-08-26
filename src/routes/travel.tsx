import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { planTripWeatherFn } from "@/lib/travel.functions";
import { Button } from "@/components/ui/button";
import {
  CarFront,
  ChevronDown,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Wind,
} from "lucide-react";

export const Route = createFileRoute("/travel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Travel & Road Trips - Taylor" },
      {
        name: "description",
        content:
          "Plan a South African road trip with live traffic-aware driving times and 3-day weather for your origin and destination.",
      },
      { property: "og:title", content: "Travel & Road Trips - Taylor" },
      {
        property: "og:description",
        content: "Live driving times and 3-day weather for both ends of your trip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TravelScreen,
});

type Trip = Awaited<ReturnType<typeof planTripWeatherFn>>;
type TripWeather = NonNullable<Trip["origin_weather"]>;

function WeatherCard({ label, weather }: { label: string; weather: TripWeather | null }) {
  const [open, setOpen] = useState(false);

  if (!weather) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
        <p className="mt-2 text-sm text-muted">Weather unavailable for this stop.</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <MapPin className="size-3.5 text-primary" /> {weather.location}
          </p>
          <p className="mt-0.5 text-xs capitalize text-muted">{weather.current.condition}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-foreground">
            {Math.round(weather.current.temperature_c)}°
          </p>
          <p className="flex items-center justify-end gap-1 text-[11px] text-muted">
            <ChevronDown className={`size-3 transition ${open ? "rotate-180" : ""}`} /> 3-day
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-widest text-muted">
        {weather.current.feels_like_c !== null && (
          <span>Feels {Math.round(weather.current.feels_like_c)}°</span>
        )}
        {weather.current.humidity_percent !== null && (
          <span className="flex items-center gap-1">
            <Droplets className="size-3" /> {weather.current.humidity_percent}%
          </span>
        )}
        {weather.current.wind_kmh !== null && (
          <span className="flex items-center gap-1">
            <Wind className="size-3" /> {Math.round(weather.current.wind_kmh)} km/h
          </span>
        )}
      </div>

      {open && (
        <ul className="mt-3 space-y-2 border-t border-border pt-3">
          {weather.forecast.map((day) => (
            <li key={day.date} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground">
                {new Date(`${day.date}T12:00:00`).toLocaleDateString("en-ZA", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="flex-1 truncate px-2 capitalize text-muted">{day.condition}</span>
              <span className="text-muted">
                {day.rain_probability_percent !== null ? `${day.rain_probability_percent}% ` : ""}
              </span>
              <span className="tabular-nums text-foreground">
                {day.high_c !== null ? `${Math.round(day.high_c)}°` : "–"}
                <span className="text-muted">
                  {day.low_c !== null ? ` / ${Math.round(day.low_c)}°` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

function TravelScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const trip = useMutation({
    mutationFn: () =>
      planTripWeatherFn({
        data: { origin: origin.trim(), destination: destination.trim() },
      }),
  });

  const canPlan = origin.trim().length > 1 && destination.trim().length > 1;

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <CarFront className="size-5 text-primary" /> Travel &amp; road trips
        </h1>
        <p className="mt-1 text-sm text-muted">
          Live driving time plus weather at both ends — tap a card for the 3-day forecast.
        </p>
      </header>

      <div className="px-6 py-5">
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canPlan) trip.mutate();
          }}
        >
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="From (e.g. Johannesburg)"
            aria-label="Origin"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="To (e.g. Durban)"
            aria-label="Destination"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <Button type="submit" disabled={!canPlan || trip.isPending} className="sm:col-span-2">
            {trip.isPending ? <Loader2 className="animate-spin" /> : <RouteIcon />}
            {trip.data ? "Update trip" : "Plan trip"}
          </Button>
        </form>

        {trip.error && (
          <p className="mt-3 text-xs text-destructive">{(trip.error as Error).message}</p>
        )}

        {trip.data && (
          <div className="mt-5 space-y-3">
            {trip.data.route ? (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Driving
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {trip.data.route.distance_km} km · {trip.data.route.duration_text} in current
                  traffic
                </p>
                {trip.data.route.summary && (
                  <p className="mt-0.5 text-xs text-muted">via {trip.data.route.summary}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted">Route details unavailable for this pair.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <WeatherCard label="Origin" weather={trip.data.origin_weather} />
              <WeatherCard label="Destination" weather={trip.data.destination_weather} />
            </div>

            <p className="flex items-center gap-2 pt-1 text-[11px] text-muted">
              <CloudSun className="size-3.5" /> Readings refresh automatically every 15 minutes per
              city.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

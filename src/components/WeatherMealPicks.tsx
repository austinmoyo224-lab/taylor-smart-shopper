import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CloudSun, Clock, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { suggestWeatherMealsFn } from "@/lib/weather-meals.functions";
import { generateRecipeIdeaFn } from "@/lib/recipes.functions";
import { readCachedWeatherSnapshot } from "@/components/HeaderWeather";
import { useAuth } from "@/hooks/useAuth";

/** Weather-aware "what should I cook next" picks, driven by today's hourly forecast. */
export function WeatherMealPicks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cooking, setCooking] = useState<string | null>(null);

  const cached = typeof window === "undefined" ? null : readCachedWeatherSnapshot();
  const location = cached?.place ?? null;

  const q = useQuery({
    queryKey: ["weather-meals", location ?? "profile"],
    queryFn: () => suggestWeatherMealsFn({ data: location ? { location } : {} }),
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const cook = useMutation({
    mutationFn: (brief: string) =>
      generateRecipeIdeaFn({ data: { style: "Everyday South African", brief, use_pantry: true } }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["recipes", "mine"] });
      navigate({ to: "/recipes/$slug", params: { slug: r.slug } });
    },
    onSettled: () => setCooking(null),
  });

  if (!user) return null;

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CloudSun className="size-4 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Cook for today's weather
          </p>
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted disabled:opacity-50"
          aria-label="Refresh weather meal suggestions"
        >
          <RefreshCw className={`size-3 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {q.isLoading && (
        <p className="flex items-center gap-2 py-3 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Taylor is reading the forecast…
        </p>
      )}

      {q.error && (
        <p className="py-2 text-xs text-destructive">{(q.error as Error).message}</p>
      )}

      {q.data && (
        <>
          <p className="mb-1 text-sm text-foreground">{q.data.headline}</p>
          <p className="mb-3 text-[11px] text-muted">
            {q.data.location} · {q.data.weather.temperature_c}°C {q.data.weather.condition}
            {q.data.weather.high_c !== null && ` · high ${Math.round(q.data.weather.high_c)}°`}
            {q.data.weather.rain_probability_percent !== null &&
              ` · ${q.data.weather.rain_probability_percent}% rain`}
          </p>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {q.data.suggestions.map((s) => (
              <li
                key={s.title}
                className="rounded-2xl border border-border bg-background p-3 transition hover:border-primary/50"
              >
                <p className="text-sm text-foreground">{s.title}</p>
                <p className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  <span>{s.meal_type}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {s.cooking_time_minutes} min
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-muted">{s.why}</p>
                {s.key_ingredients.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-muted">
                    {s.key_ingredients.slice(0, 5).join(" · ")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCooking(s.title);
                    cook.mutate(s.recipe_brief || s.title);
                  }}
                  disabled={cook.isPending}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2 text-xs text-primary-foreground disabled:opacity-60"
                >
                  {cook.isPending && cooking === s.title ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Writing the recipe…
                    </>
                  ) : (
                    <>
                      <Wand2 className="size-3.5" /> Get the recipe
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {cook.error && (
            <p className="mt-2 text-xs text-destructive">{(cook.error as Error).message}</p>
          )}
        </>
      )}
    </section>
  );
}

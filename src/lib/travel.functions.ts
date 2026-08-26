import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Plan a South African drive and return live weather for both ends of the trip. */
export const planTripWeatherFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        origin: z.string().min(2).max(120),
        destination: z.string().min(2).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { rateLimit } = await import("@/lib/rate-limit.server");
    const rl = rateLimit(`travel-plan:u:${context.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new Error(`Too many trips — try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`);
    }

    const { computeRoute } = await import("@/lib/maps.server");
    const { getCitiesWeather } = await import("@/lib/weather.server");

    const [route, weather] = await Promise.all([
      computeRoute(data.origin, data.destination).catch(() => null),
      getCitiesWeather([data.origin, data.destination]),
    ]);

    const trim = (w: (typeof weather)[number]) =>
      w
        ? {
            location: w.location,
            current: w.current,
            observed_at: w.observed_at,
            forecast: w.forecast.slice(0, 3),
          }
        : null;

    return {
      origin: data.origin,
      destination: data.destination,
      route: route
        ? {
            distance_km: route.distance_km,
            duration_text: route.duration_text,
            summary: route.summary ?? null,
            warnings: route.warnings ?? [],
          }
        : null,
      origin_weather: trim(weather[0] ?? null),
      destination_weather: trim(weather[1] ?? null),
    };
  });

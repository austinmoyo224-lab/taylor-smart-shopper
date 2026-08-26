import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const suggestWeatherMealsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        location: z.string().min(2).max(120).optional(),
        use_pantry: z.boolean().optional(),
        weather_snapshot: z
          .object({
            place: z.string().min(1).max(120),
            temp: z.number().min(-30).max(60),
            feels: z.number().min(-30).max(60),
            high: z.number().min(-30).max(60),
            low: z.number().min(-30).max(60),
            label: z.string().min(1).max(80),
            humidity: z.number().min(0).max(100),
            wind: z.number().min(0).max(300),
            precipitation: z.number().min(0).max(1000),
            sunrise: z.string().nullable(),
            sunset: z.string().nullable(),
            hourly: z
              .array(
                z.object({
                  time: z.string(),
                  temp: z.number().min(-30).max(60),
                  code: z.number(),
                  rain: z.number().min(0).max(100),
                }),
              )
              .max(24),
          })
          .optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { rateLimit } = await import("@/lib/rate-limit.server");
    const rl = rateLimit(`weather-meals:u:${context.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new Error(
        `Too many suggestions — try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`,
      );
    }

    let location = data.location?.trim();
    if (!location) {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("city")
        .eq("id", context.userId)
        .maybeSingle();
      location = profile?.city?.trim() || "Johannesburg";
    }

    const { generateWeatherMealSuggestions } = await import("@/lib/weather-meals.server");
    return generateWeatherMealSuggestions({
      supabase: context.supabase,
      userId: context.userId,
      location,
      usePantry: data.use_pantry ?? true,
      weatherSnapshot: data.weather_snapshot,
    });
  });

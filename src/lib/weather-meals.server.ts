import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { lookupSouthAfricanWeather, type SouthAfricanWeather } from "@/lib/weather.server";

const SuggestionSchema = z.object({
  headline: z.string(),
  suggestions: z
    .array(
      z.object({
        title: z.string(),
        meal_type: z.string(),
        why: z.string(),
        cooking_time_minutes: z.number().int(),
        key_ingredients: z.array(z.string()),
        recipe_brief: z.string(),
      }),
    )
    .min(2)
    .max(4),
});

export type WeatherMealSuggestions = z.infer<typeof SuggestionSchema> & {
  location: string;
  weather: {
    temperature_c: number;
    condition: string;
    high_c: number | null;
    low_c: number | null;
    rain_probability_percent: number | null;
  };
};

function summariseHours(wx: SouthAfricanWeather) {
  return wx.hourly
    .slice(0, 12)
    .map((h) => {
      const hour = new Date(h.time).toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: wx.timezone,
      });
      const temp = h.temperature_c === null ? "?" : `${Math.round(h.temperature_c)}°C`;
      const rain =
        h.rain_probability_percent === null ? "" : `, ${h.rain_probability_percent}% rain`;
      return `${hour} ${temp} ${h.condition}${rain}`;
    })
    .join("; ");
}

export async function generateWeatherMealSuggestions(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
  location: string;
  usePantry?: boolean;
}): Promise<WeatherMealSuggestions> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const wx = await lookupSouthAfricanWeather(input.location);

  const { data: profile } = await input.supabase
    .from("profiles")
    .select("household_size, dietary_preferences, allergies, health_goal, cooking_skill")
    .eq("id", input.userId)
    .maybeSingle();

  let pantry: string[] = [];
  if (input.usePantry !== false) {
    const { data } = await input.supabase
      .from("pantry_items")
      .select("name")
      .eq("user_id", input.userId)
      .limit(60);
    pantry = (data ?? []).map((p: { name: string }) => p.name);
  }

  const p = (profile ?? {}) as Record<string, unknown>;
  const today = wx.forecast[0];
  const now = new Date().toLocaleString("en-ZA", { timeZone: wx.timezone });

  const promptLines = [
    `Local time now: ${now} (${wx.location}).`,
    `Right now: ${Math.round(wx.current.temperature_c)}°C, feels like ${
      wx.current.feels_like_c === null ? "n/a" : `${Math.round(wx.current.feels_like_c)}°C`
    }, ${wx.current.condition}, humidity ${wx.current.humidity_percent ?? "n/a"}%, wind ${
      wx.current.wind_kmh ?? "n/a"
    } km/h.`,
    today
      ? `Today: high ${today.high_c ?? "?"}°C / low ${today.low_c ?? "?"}°C, ${today.condition}, rain chance ${
          today.rain_probability_percent ?? 0
        }%. Sunset ${today.sunset ?? "n/a"}.`
      : "",
    `Next hours: ${summariseHours(wx) || "no hourly data"}.`,
    wx.forecast[1]
      ? `Tomorrow: high ${wx.forecast[1].high_c ?? "?"}°C, ${wx.forecast[1].condition}, rain chance ${
          wx.forecast[1].rain_probability_percent ?? 0
        }%.`
      : "",
    `Household size: ${p["household_size"] ?? "unknown"}.`,
    p["dietary_preferences"] ? `Dietary preferences: ${JSON.stringify(p["dietary_preferences"])}.` : "",
    p["allergies"] ? `ALLERGIES — never include these: ${JSON.stringify(p["allergies"])}.` : "",
    p["health_goal"] ? `Health goal: ${String(p["health_goal"])}.` : "",
    p["cooking_skill"] ? `Cooking skill: ${String(p["cooking_skill"])}.` : "",
    pantry.length ? `Already in the pantry: ${pantry.join(", ")}.` : "",
  ].filter(Boolean);

  let out: z.infer<typeof SuggestionSchema>;
  try {
    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key, undefined, { structuredOutputs: true })(
        "google/gemini-2.5-flash",
      ),
      system:
        "You are Taylor, a South African shopping and cooking companion. Using the live weather below, " +
        "suggest what the cook should make NEXT (the upcoming meal for this time of day). Cold, wet or " +
        "sub-15°C conditions call for hearty warm food (stews, curries, pap, soups, bakes). Hot conditions " +
        "above 25°C call for light, fresh, braai or salad-style food. Mild weather is open. Consider how the " +
        "next few hours change (e.g. rain rolling in, a cold evening) and say so in the 'why'. " +
        "Recipes must be affordable, everyday South African cooking with ingredients from Checkers, Pick n Pay, " +
        "Shoprite or Woolworths. Never suggest anything that clashes with the stated allergies or diet. " +
        "'headline' is one short warm sentence tying the weather to the food. 'recipe_brief' is a single " +
        "instruction sentence Taylor can use to generate the full recipe later.",
      prompt: promptLines.join("\n"),
      output: Output.object({ schema: SuggestionSchema }),
    });
    out = output;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      throw new Error("Taylor couldn't read the kitchen mood right now — try again in a moment.");
    }
    throw e;
  }

  void (await import("@/lib/ai-usage.server")).logAiUsage({
    operation: "chat",
    model: "google/gemini-2.5-flash",
    userId: input.userId,
    route: "recipes.weatherMeals",
  });

  return {
    ...out,
    location: wx.location,
    weather: {
      temperature_c: Math.round(wx.current.temperature_c),
      condition: wx.current.condition,
      high_c: today?.high_c ?? null,
      low_c: today?.low_c ?? null,
      rain_probability_percent: today?.rain_probability_percent ?? null,
    },
  };
}

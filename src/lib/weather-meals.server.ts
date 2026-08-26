import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  getCityWeather,
  weatherCodeLabel,
  type SouthAfricanWeather,
} from "@/lib/weather.server";

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

const WeeklyPlanSchema = z.object({
  summary: z.string(),
  days: z.array(
    z.object({
      date: z.string(),
      weather: z.string(),
      meal: z.string(),
      why: z.string(),
      cooking_time_minutes: z.number().int(),
      key_ingredients: z.array(z.string()).min(2).max(10),
      suggested_store: z.string().nullable(),
      matching_special: z.string().nullable(),
      recipe_brief: z.string(),
    }),
  ).length(7),
});

export type WeeklyWeatherMealPlan = z.infer<typeof WeeklyPlanSchema> & { location: string };

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
  weatherSnapshot?: {
    place: string;
    temp: number;
    feels: number;
    high: number;
    low: number;
    label: string;
    humidity: number;
    wind: number;
    precipitation: number;
    sunrise: string | null;
    sunset: string | null;
    hourly: Array<{ time: string; temp: number; code: number; rain: number }>;
  };
}): Promise<WeatherMealSuggestions> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const snapshot = input.weatherSnapshot;
  const today = new Date().toISOString().slice(0, 10);
  const wx: SouthAfricanWeather = snapshot
    ? {
        ok: true,
        location: snapshot.place,
        coordinates: { latitude: 0, longitude: 0 },
        observed_at: new Date().toISOString(),
        timezone: "Africa/Johannesburg",
        current: {
          temperature_c: snapshot.temp,
          feels_like_c: snapshot.feels,
          humidity_percent: snapshot.humidity,
          precipitation_mm: snapshot.precipitation,
          wind_kmh: snapshot.wind,
          condition: snapshot.label.toLocaleLowerCase("en-ZA"),
        },
        forecast: [
          {
            date: today,
            high_c: snapshot.high,
            low_c: snapshot.low,
            condition: snapshot.label.toLocaleLowerCase("en-ZA"),
            rain_probability_percent: snapshot.hourly.reduce(
              (highest, hour) => Math.max(highest, hour.rain),
              0,
            ),
            rain_mm: snapshot.precipitation,
            sunrise: snapshot.sunrise,
            sunset: snapshot.sunset,
          },
        ],
        hourly: snapshot.hourly.map((hour) => ({
          time: hour.time,
          temperature_c: hour.temp,
          rain_probability_percent: hour.rain,
          condition: weatherCodeLabel(hour.code),
        })),
        meal_hint:
          snapshot.temp <= 15
            ? "cold — suggest hearty warm meals"
            : snapshot.temp >= 26
              ? "hot — suggest light, fresh meals"
              : "mild — any meal type works",
      }
    : await getCityWeather(input.location);

  const { data: memory } = await input.supabase
    .from("subscriber_memory")
    .select("food, lifestyle, personal")
    .eq("user_id", input.userId)
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

  const food = (memory?.food ?? {}) as Record<string, unknown>;
  const lifestyle = (memory?.lifestyle ?? {}) as Record<string, unknown>;
  const personal = (memory?.personal ?? {}) as Record<string, unknown>;
  const todayForecast = wx.forecast[0];
  const now = new Date().toLocaleString("en-ZA", { timeZone: wx.timezone });

  const promptLines = [
    `Local time now: ${now} (${wx.location}).`,
    `Right now: ${Math.round(wx.current.temperature_c)}°C, feels like ${
      wx.current.feels_like_c === null ? "n/a" : `${Math.round(wx.current.feels_like_c)}°C`
    }, ${wx.current.condition}, humidity ${wx.current.humidity_percent ?? "n/a"}%, wind ${
      wx.current.wind_kmh ?? "n/a"
    } km/h.`,
    todayForecast
      ? `Today: high ${todayForecast.high_c ?? "?"}°C / low ${todayForecast.low_c ?? "?"}°C, ${todayForecast.condition}, rain chance ${
          todayForecast.rain_probability_percent ?? 0
        }%. Sunset ${todayForecast.sunset ?? "n/a"}.`
      : "",
    `Next hours: ${summariseHours(wx) || "no hourly data"}.`,
    wx.forecast[1]
      ? `Tomorrow: high ${wx.forecast[1].high_c ?? "?"}°C, ${wx.forecast[1].condition}, rain chance ${
          wx.forecast[1].rain_probability_percent ?? 0
        }%.`
      : "",
    Object.keys(personal).length ? `Household details: ${JSON.stringify(personal).slice(0, 600)}.` : "",
    Object.keys(food).length
      ? `Food profile (respect allergies and diets absolutely): ${JSON.stringify(food).slice(0, 900)}.`
      : "",
    Object.keys(lifestyle).length ? `Lifestyle: ${JSON.stringify(lifestyle).slice(0, 500)}.` : "",
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
      high_c: todayForecast?.high_c ?? null,
      low_c: todayForecast?.low_c ?? null,
      rain_probability_percent: todayForecast?.rain_probability_percent ?? null,
    },
  };
}

export async function generateWeeklyWeatherMealPlan(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
  location: string;
}): Promise<WeeklyWeatherMealPlan> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Taylor's recipe service is temporarily unavailable.");

  const wx = await getCityWeather(input.location);
  const [{ data: memory }, { data: subscriptions }] = await Promise.all([
    input.supabase
      .from("subscriber_memory")
      .select("food, lifestyle, personal")
      .eq("user_id", input.userId)
      .maybeSingle(),
    input.supabase
      .from("subscriber_store_subs")
      .select("target_id")
      .eq("user_id", input.userId)
      .eq("target_type", "store")
      .eq("is_active", true),
  ]);

  const storeIds = (subscriptions ?? []).map((subscription) => subscription.target_id);
  const [{ data: stores }, { data: promotions }] = await Promise.all([
    storeIds.length
      ? input.supabase.from("stores").select("id, name").in("id", storeIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    storeIds.length
      ? input.supabase
          .from("promotions")
          .select("title, description, sale_price, currency_code, store_id, ends_at")
          .in("store_id", storeIds)
          .eq("is_published", true)
          .is("deleted_at", null)
          .gte("ends_at", new Date().toISOString())
          .limit(40)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const storeNames = new Map((stores ?? []).map((store) => [store.id, store.name]));
  const specials = (promotions ?? []).map((promotion) => ({
    store: promotion.store_id ? storeNames.get(promotion.store_id) ?? "Followed store" : "Followed store",
    title: promotion.title,
    description: promotion.description,
    price:
      promotion.sale_price === null
        ? null
        : `${promotion.currency_code} ${Number(promotion.sale_price).toFixed(2)}`,
    ends_at: promotion.ends_at,
  }));
  const foodProfile = memory?.food ?? {};
  const household = memory?.personal ?? {};
  const lifestyle = memory?.lifestyle ?? {};
  const forecast = wx.forecast.map((day) => ({
    date: day.date,
    high_c: day.high_c,
    low_c: day.low_c,
    condition: day.condition,
    rain_probability_percent: day.rain_probability_percent,
  }));

  try {
    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key, undefined, { structuredOutputs: true })(
        "google/gemini-2.5-flash",
      ),
      system:
        "You are Taylor, a South African shopping and cooking companion. Create exactly seven practical dinners, one per forecast day. Match each meal to that day's temperature and rain, respect food restrictions absolutely, vary proteins and cooking styles, and favour affordable seasonal food. Use a followed-store special only when it genuinely suits the meal; never invent a price or special. If there is no relevant verified special, set matching_special to null. Dates must exactly match the supplied forecast dates.",
      prompt: [
        `Location: ${wx.location}`,
        `Seven-day forecast: ${JSON.stringify(forecast)}`,
        `Followed stores: ${(stores ?? []).map((store) => store.name).join(", ") || "None saved"}`,
        `Active specials at followed stores: ${JSON.stringify(specials).slice(0, 5000) || "None"}`,
        `Food profile: ${JSON.stringify(foodProfile).slice(0, 1200)}`,
        `Household: ${JSON.stringify(household).slice(0, 800)}`,
        `Lifestyle: ${JSON.stringify(lifestyle).slice(0, 600)}`,
      ].join("\n"),
      output: Output.object({ schema: WeeklyPlanSchema }),
    });

    void (await import("@/lib/ai-usage.server")).logAiUsage({
      operation: "chat",
      model: "google/gemini-2.5-flash",
      userId: input.userId,
      route: "recipes.weeklyWeatherPlan",
    });
    return { ...output, location: wx.location };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error("Taylor couldn't finish the weekly plan. Please try again shortly.");
    }
    throw error;
  }
}

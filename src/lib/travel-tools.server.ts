// Taylor's restaurant + road-trip tools (Google Maps Platform).
import { tool } from "ai";
import { z } from "zod";
import {
  computeRoute,
  decodePolyline,
  getPlaceDetails,
  samplePath,
  searchNearbyRestaurants,
  searchRestaurants,
  type PlaceSummary,
} from "@/lib/maps.server";
import { lookupSouthAfricanWeather, type SouthAfricanWeather } from "@/lib/weather.server";

function err(e: unknown) {
  return { ok: false as const, error: (e as Error).message };
}

export function buildTravelTools() {
  return {
    find_restaurants: tool({
      description:
        "Find restaurants, takeaways, cafés or places to eat anywhere in South Africa, with their Google star rating, number of Google reviews, price level and whether they're open now. Call this whenever the subscriber asks where to eat, for restaurant recommendations, ratings, reviews, or 'best/cheapest place for X in Y'.",
      inputSchema: z.object({
        query: z
          .string()
          .min(2)
          .max(160)
          .describe("What and where, e.g. 'best seafood restaurants in Durban North'"),
        limit: z.number().int().min(1).max(15).optional(),
        open_now: z.boolean().optional(),
        min_rating: z.number().min(1).max(5).optional(),
      }),
      execute: async ({ query, limit, open_now, min_rating }) => {
        try {
          const places = await searchRestaurants(query, {
            limit,
            openNow: open_now,
            minRating: min_rating,
          });
          return {
            ok: true,
            count: places.length,
            restaurants: places,
            instruction:
              "Rank by Google rating and review count. Always mention the star rating out of 5 and how many Google reviews it has, plus the suburb. Say the ratings come from Google reviews.",
          };
        } catch (e) {
          return err(e);
        }
      },
    }),

    get_restaurant_reviews: tool({
      description:
        "Get full details and the top Google reviews for ONE specific restaurant, using the place id returned by find_restaurants. Call this when the subscriber asks 'what do people say about…' or wants reviews for a specific place.",
      inputSchema: z.object({
        place_id: z.string().min(3).describe("Place id from find_restaurants"),
      }),
      execute: async ({ place_id }) => {
        try {
          return { ok: true, restaurant: await getPlaceDetails(place_id) };
        } catch (e) {
          return err(e);
        }
      },
    }),

    plan_road_trip: tool({
      description:
        "Plan a drive between two South African places (e.g. Johannesburg to Durban). Returns live traffic-aware driving time, distance, and well-rated restaurants/food stops spaced along the actual route. Call this whenever the subscriber asks about travelling/driving somewhere, how long the road takes, or where to eat on the way.",
      inputSchema: z.object({
        origin: z.string().min(2).max(120).describe("Starting town/city/address"),
        destination: z.string().min(2).max(120).describe("Destination town/city/address"),
        include_food_stops: z.boolean().optional().describe("Default true"),
        stops: z
          .number()
          .int()
          .min(2)
          .max(6)
          .optional()
          .describe("How many points along the road to check for food (default 4)"),
      }),
      execute: async ({ origin, destination, include_food_stops = true, stops = 4 }) => {
        try {
          const [route, originWeather, destinationWeather] = await Promise.all([
            computeRoute(origin, destination),
            lookupSouthAfricanWeather(origin).catch(() => null),
            lookupSouthAfricanWeather(destination).catch(() => null),
          ]);
          const result: {
            ok: true;
            origin: string;
            destination: string;
            distance_km: number;
            driving_time: string;
            route_summary?: string;
            warnings?: string[];
            weather: {
              origin: SouthAfricanWeather | null;
              destination: SouthAfricanWeather | null;
            };
            food_stops?: Array<{
              approx_progress: string;
              coordinates: { lat: number; lng: number };
              restaurants: PlaceSummary[];
            }>;
            instruction: string;
          } = {
            ok: true,
            origin,
            destination,
            distance_km: route.distance_km,
            driving_time: route.duration_text,
            route_summary: route.summary,
            warnings: route.warnings,
            weather: { origin: originWeather, destination: destinationWeather },
            instruction:
              "Give the distance and traffic-aware driving time first. Then report the supplied live origin and destination temperatures, conditions and rain probabilities before the food stops. If one weather value is null, say that location could not be checked; never invent it. Remind them to rest every two hours.",
          };

          if (include_food_stops && route.polyline) {
            const path = decodePolyline(route.polyline);
            // Drop the very start and very end — the shopper wants stops on the way.
            const inner = path.slice(Math.floor(path.length * 0.1), Math.floor(path.length * 0.9));
            const points = samplePath(inner.length ? inner : path, stops);
            const found = await Promise.all(
              points.map(async ([lat, lng], i) => ({
                approx_progress: `${Math.round(((i + 1) / (points.length + 1)) * 100)}% of the way`,
                coordinates: { lat, lng },
                restaurants: await searchNearbyRestaurants(lat, lng, 20000, 4).catch(
                  () => [] as PlaceSummary[],
                ),
              })),
            );
            result.food_stops = found.filter((f) => f.restaurants.length > 0);
          }

          return result;
        } catch (e) {
          return err(e);
        }
      },
    }),
  };
}
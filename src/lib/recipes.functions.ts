import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function pub() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listPublishedRecipes = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = pub();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, slug, title, description, hero_image_url, cooking_time_minutes, servings, difficulty, cuisine_tags, is_sponsored",
    )
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getRecipeBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = pub();
    const { data: recipe } = await supabase
      .from("recipes")
      .select(
        "id, slug, title, description, hero_image_url, cooking_time_minutes, servings, difficulty, cuisine_tags, instructions, nutrition, is_sponsored",
      )
      .eq("slug", data.slug)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (!recipe) return null;
    const { data: ingredients } = await supabase
      .from("recipe_ingredients")
      .select("id, name, quantity, unit, notes, is_sponsored, sort_order")
      .eq("recipe_id", recipe.id)
      .order("sort_order", { ascending: true });
    return { recipe, ingredients: ingredients ?? [] };
  });

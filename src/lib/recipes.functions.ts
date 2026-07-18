import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const listMyRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("recipes")
      .select(
        "id, slug, title, description, hero_image_url, cooking_time_minutes, servings, difficulty, cuisine_tags, source, created_at",
      )
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyRecipeBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: recipe } = await context.supabase
      .from("recipes")
      .select(
        "id, slug, title, description, hero_image_url, cooking_time_minutes, servings, difficulty, cuisine_tags, instructions, nutrition, is_sponsored, source",
      )
      .eq("slug", data.slug)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!recipe) return null;
    const { data: ingredients } = await context.supabase
      .from("recipe_ingredients")
      .select("id, name, quantity, unit, notes, is_sponsored, sort_order")
      .eq("recipe_id", recipe.id)
      .order("sort_order", { ascending: true });
    return { recipe, ingredients: ingredients ?? [] };
  });

export const deleteMyRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recipes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
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

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Turn a recipe into a shopping list. Scales ingredients by desired servings
 * and optionally skips items already in the user's pantry (by name match).
 */
export const addRecipeToShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        recipe_id: z.string().uuid(),
        servings: z.number().int().positive().max(50).optional(),
        list_id: z.string().uuid().optional(),
        skip_pantry: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Fetch recipe + ingredients via public client (recipes are public read).
    const supa = pub();
    const { data: recipe, error: rErr } = await supa
      .from("recipes")
      .select("id, title, servings")
      .eq("id", data.recipe_id)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (rErr || !recipe) throw new Error("Recipe not found");
    const { data: ingredients } = await supa
      .from("recipe_ingredients")
      .select("name, quantity, unit, notes, sort_order")
      .eq("recipe_id", recipe.id)
      .order("sort_order", { ascending: true });

    const baseServings = Math.max(1, Number(recipe.servings ?? 1));
    const wantServings = Math.max(1, Number(data.servings ?? baseServings));
    const scale = wantServings / baseServings;

    // Optional pantry filter — case-insensitive substring match on name.
    let pantryNames: string[] = [];
    if (data.skip_pantry) {
      const { data: pantry } = await context.supabase
        .from("pantry_items")
        .select("name")
        .eq("user_id", context.userId);
      pantryNames = (pantry ?? []).map((p: { name: string }) => normalize(p.name));
    }

    // Resolve or create the target list.
    let listId = data.list_id;
    if (listId) {
      const { data: owned } = await context.supabase
        .from("shopping_lists")
        .select("id")
        .eq("id", listId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!owned) throw new Error("List not found");
    } else {
      const name =
        wantServings === baseServings
          ? recipe.title
          : `${recipe.title} · ${wantServings} servings`;
      const { data: row, error: cErr } = await context.supabase
        .from("shopping_lists")
        .insert({
          user_id: context.userId,
          name,
          is_ai_generated: true,
          currency_code: "ZAR",
        })
        .select("id")
        .single();
      if (cErr || !row) throw new Error(cErr?.message ?? "Could not create list");
      listId = row.id;
    }

    let added = 0;
    let skipped = 0;
    const rows: {
      list_id: string;
      name: string;
      quantity: number | null;
      unit: string | null;
      notes: string | null;
    }[] = [];
    for (const ing of ingredients ?? []) {
      const n = normalize(ing.name);
      if (pantryNames.some((p) => p === n || p.includes(n) || n.includes(p))) {
        skipped++;
        continue;
      }
      const q = ing.quantity == null ? null : Number((Number(ing.quantity) * scale).toFixed(2));
      rows.push({
        list_id: listId,
        name: ing.name,
        quantity: q,
        unit: ing.unit ?? null,
        notes: ing.notes ?? null,
      });
      added++;
    }
    if (rows.length) {
      const { error: iErr } = await context.supabase.from("shopping_list_items").insert(rows);
      if (iErr) throw new Error(iErr.message);
    }
    return { list_id: listId, added, skipped };
  });

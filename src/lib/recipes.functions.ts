import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildMeasurementNote, cleanRecipeIngredientName } from "@/lib/shopping-list-utils";

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

export const generateRecipeIdeaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        style: z.string().min(1).max(60),
        brief: z.string().max(600).optional(),
        servings: z.number().int().min(1).max(20).optional(),
        max_minutes: z.number().int().min(5).max(240).optional(),
        use_pantry: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { rateLimit } = await import("@/lib/rate-limit.server");
    const rl = rateLimit(`recipe-idea:u:${context.userId}`, 20, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new Error(
        `You've generated a lot of recipes — try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`,
      );
    }
    const { generateRecipeIdea } = await import("@/lib/recipe-ideas.server");
    return generateRecipeIdea({
      supabase: context.supabase,
      userId: context.userId,
      style: data.style,
      brief: data.brief ?? null,
      servings: data.servings ?? null,
      maxMinutes: data.max_minutes ?? null,
      usePantry: data.use_pantry ?? false,
    });
  });

export const generateRecipePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recipe_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: recipe } = await context.supabase
      .from("recipes")
      .select("id, title, description, cuisine_tags, user_id")
      .eq("id", data.recipe_id)
      .maybeSingle();
    if (!recipe) throw new Error("Recipe not found");
    if (recipe.user_id !== context.userId) throw new Error("Not allowed");
    const { generateAndAttachRecipeHero } = await import("@/lib/recipe-image.server");
    const url = await generateAndAttachRecipeHero({
      recipeId: recipe.id,
      title: recipe.title,
      description: recipe.description,
      cuisineTags: recipe.cuisine_tags,
    });
    if (!url) throw new Error("Could not generate photo — please try again in a moment.");
    return { hero_image_url: url };
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
      .is("deleted_at", null)
      .or("is_published.eq.true,is_shareable.eq.true")
      .maybeSingle();
    if (!recipe) return null;
    const { data: ingredients } = await supabase
      .from("recipe_ingredients")
      .select("id, name, quantity, unit, notes, is_sponsored, sort_order")
      .eq("recipe_id", recipe.id)
      .order("sort_order", { ascending: true });
    return { recipe, ingredients: ingredients ?? [] };
  });

export const markRecipeShareable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recipe_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: owned, error: ownErr } = await context.supabase
      .from("recipes")
      .select("id, slug, is_shareable")
      .eq("id", data.recipe_id)
      .eq("user_id", context.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (ownErr) throw new Error(ownErr.message);
    if (!owned) throw new Error("Recipe not found in your recipes");
    if (owned.is_shareable) return { ok: true, slug: owned.slug };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("recipes")
      .update({ is_shareable: true })
      .eq("id", data.recipe_id)
      .select("slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Could not prepare this recipe for sharing");
    return { ok: true, slug: updated.slug };
  });

export const recordRecipeShareEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        recipe_id: z.string().uuid(),
        event_type: z.enum(["share_click", "share_success", "link_copy", "open"]),
        channel: z.string().max(60).optional(),
        referrer: z.string().max(500).optional(),
        user_agent: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = pub();
    const { error } = await supabase.from("recipe_share_events").insert({
      recipe_id: data.recipe_id,
      event_type: data.event_type,
      channel: data.channel ?? null,
      referrer: data.referrer ?? null,
      user_agent: data.user_agent ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Clone a public (or shareable) recipe into the signed-in user's own recipes.
 * Returns the new slug so the client can navigate there.
 */
export const saveRecipeToMine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recipe_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supa = pub();
    // Source recipe must be either published or shareable.
    const { data: src, error: sErr } = await supa
      .from("recipes")
      .select(
        "id, title, description, hero_image_url, cooking_time_minutes, servings, difficulty, cuisine_tags, weather_tags, instructions, nutrition",
      )
      .eq("id", data.recipe_id)
      .is("deleted_at", null)
      .or("is_published.eq.true,is_shareable.eq.true")
      .maybeSingle();
    if (sErr || !src) throw new Error("Recipe not available");

    // Prevent duplicates — reuse existing saved copy if present.
    const { data: existing } = await context.supabase
      .from("recipes")
      .select("id, slug")
      .eq("user_id", context.userId)
      .eq("title", src.title)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) return { id: existing.id, slug: existing.slug, existed: true };

    const rand = Math.random().toString(36).slice(2, 8);
    const baseSlug = (src.title || "recipe")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
    const slug = `${baseSlug || "recipe"}-${rand}`;

    const { data: inserted, error: iErr } = await context.supabase
      .from("recipes")
      .insert({
        user_id: context.userId,
        title: src.title,
        slug,
        description: src.description,
        hero_image_url: src.hero_image_url,
        cooking_time_minutes: src.cooking_time_minutes,
        servings: src.servings,
        difficulty: src.difficulty,
        cuisine_tags: src.cuisine_tags ?? [],
        weather_tags: src.weather_tags ?? [],
        instructions: src.instructions ?? [],
        nutrition: src.nutrition ?? {},
        source: "saved",
        is_published: false,
        is_shareable: false,
      })
      .select("id, slug")
      .single();
    if (iErr || !inserted) throw new Error(iErr?.message ?? "Could not save recipe");

    // Copy ingredients.
    const { data: ings } = await supa
      .from("recipe_ingredients")
      .select("name, quantity, unit, notes, sort_order, is_sponsored")
      .eq("recipe_id", src.id)
      .order("sort_order", { ascending: true });
    if (ings && ings.length > 0) {
      const rows = ings.map((i) => ({
        recipe_id: inserted.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
        sort_order: i.sort_order,
        is_sponsored: i.is_sponsored ?? false,
      }));
      const { error: ingErr } = await context.supabase.from("recipe_ingredients").insert(rows);
      if (ingErr) throw new Error(ingErr.message);
    }
    return { id: inserted.id, slug: inserted.slug, existed: false };
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
    // Fetch recipe + ingredients. Public recipes are available anonymously;
    // Taylor-generated personal recipes are visible only to the owner.
    const supa = pub();
    let { data: recipe, error: rErr } = await supa
      .from("recipes")
      .select("id, title, servings")
      .eq("id", data.recipe_id)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();
    let ingredientClient = supa;
    if (rErr || !recipe) {
      const mine = await context.supabase
        .from("recipes")
        .select("id, title, servings")
        .eq("id", data.recipe_id)
        .eq("user_id", context.userId)
        .is("deleted_at", null)
        .maybeSingle();
      recipe = mine.data;
      rErr = mine.error;
      ingredientClient = context.supabase;
    }
    if (rErr || !recipe) throw new Error("Recipe not found");
    const { data: ingredients } = await ingredientClient
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
      // Intentionally omit quantity/unit on shopping list rows so price
      // comparison matches on the product name only (e.g. "Mutton chops")
      // instead of multiplying a per-pack price by the recipe quantity.
      // Keep the measurement in notes for the shopper's reference.
      const q = ing.quantity == null ? null : Number((Number(ing.quantity) * scale).toFixed(2));
      const cleanedName = cleanRecipeIngredientName(ing.name) || ing.name;
      rows.push({
        list_id: listId,
        name: cleanedName,
        quantity: null,
        unit: null,
        notes: buildMeasurementNote(q, ing.unit, ing.notes),
      });
      added++;
    }
    if (rows.length) {
      const { error: iErr } = await context.supabase.from("shopping_list_items").insert(rows);
      if (iErr) throw new Error(iErr.message);
    }
    return { list_id: listId, added, skipped };
  });

import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildMeasurementNote, cleanRecipeIngredientName } from "@/lib/shopping-list-utils";

export const RECIPE_STYLES = [
  "Surprise me",
  "Traditional South African",
  "Heritage Day braai",
  "English classic",
  "Indian / Durban curry",
  "Cape Malay",
  "Portuguese / Peri-peri",
  "Italian comfort",
  "Asian stir-fry",
  "Mexican",
  "Vegetarian",
  "Vegan",
  "Halaal-friendly",
  "Budget weeknight",
  "Healthy & light",
  "Baking & dessert",
  "Kids' favourite",
  "Slow cooker / potjie",
] as const;

const IdeaSchema = z.object({
  title: z.string(),
  description: z.string(),
  cooking_time_minutes: z.number().int(),
  servings: z.number().int(),
  difficulty: z.string(),
  cuisine_tags: z.array(z.string()),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
    }),
  ),
  instructions: z.array(z.string()),
  tip: z.string().nullable(),
});

export type GeneratedIdea = z.infer<typeof IdeaSchema>;

function slugify(title: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  const base = (title || "recipe")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return `${base || "recipe"}-${rand}`;
}

export async function generateRecipeIdea(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
  style: string;
  brief?: string | null;
  servings?: number | null;
  maxMinutes?: number | null;
  usePantry?: boolean;
}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  let pantry: string[] = [];
  if (input.usePantry) {
    const { data } = await input.supabase
      .from("pantry_items")
      .select("name")
      .eq("user_id", input.userId)
      .limit(80);
    pantry = (data ?? []).map((p: { name: string }) => p.name);
  }

  const gateway = createLovableAiGatewayProvider(key, undefined, { structuredOutputs: true });
  const model = gateway("google/gemini-2.5-flash");

  const brief = (input.brief ?? "").trim();
  const promptLines = [
    `Style: ${input.style}`,
    brief ? `What the cook asked for: ${brief}` : "The cook wants you to be creative and surprise them.",
    `Servings: ${input.servings ?? 4}`,
    input.maxMinutes ? `Must be ready in about ${input.maxMinutes} minutes or less.` : "",
    pantry.length ? `Try to use what they already have: ${pantry.join(", ")}.` : "",
  ].filter(Boolean);

  let idea: GeneratedIdea;
  try {
    const { output } = await generateText({
      model,
      system:
        "You are Taylor, a South African home-cooking companion. Invent one practical, affordable recipe " +
        "achievable in a normal South African home kitchen with ingredients available at Checkers, Pick n Pay, " +
        "Shoprite or Woolworths. Use simple everyday language and metric measures. Keep the ingredient 'name' " +
        "as a plain shoppable item (e.g. 'beef mince', 'basmati rice') with quantity and unit kept separate. " +
        "Return 5-14 ingredients and 4-10 clear numbered steps. Never include allergens the cook rules out.",
      prompt: promptLines.join("\n"),
      output: Output.object({ schema: IdeaSchema }),
    });
    idea = output;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      throw new Error("Taylor couldn't plate that idea — try describing it a little differently.");
    }
    throw e;
  }

  void (await import("@/lib/ai-usage.server")).logAiUsage({
    operation: "recipe_idea",
    model: "google/gemini-2.5-flash",
    userId: input.userId,
    route: "recipes.generateIdea",
  });

  const instructions = idea.instructions.filter(Boolean);
  if (idea.tip) instructions.push(`Tip: ${idea.tip}`);

  const { data: inserted, error } = await input.supabase
    .from("recipes")
    .insert({
      user_id: input.userId,
      title: idea.title,
      slug: slugify(idea.title),
      description: idea.description,
      cooking_time_minutes: Math.max(1, Math.min(600, idea.cooking_time_minutes || 30)),
      servings: Math.max(1, Math.min(50, idea.servings || input.servings || 4)),
      difficulty: idea.difficulty || "easy",
      cuisine_tags: idea.cuisine_tags ?? [],
      instructions,
      nutrition: {},
      source: "taylor",
      is_published: false,
      is_shareable: false,
    })
    .select("id, slug, title")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "Could not save the recipe");

  const rows = idea.ingredients.slice(0, 30).map((ing, i) => ({
    recipe_id: inserted.id,
    name: cleanRecipeIngredientName(ing.name),
    quantity: ing.quantity,
    unit: ing.unit,
    notes: buildMeasurementNote(ing.quantity, ing.unit, null),
    sort_order: i,
    is_sponsored: false,
  }));
  if (rows.length) {
    const { error: ingErr } = await input.supabase.from("recipe_ingredients").insert(rows);
    if (ingErr) throw new Error(ingErr.message);
  }

  // Best-effort hero photo; never block the recipe on image generation.
  try {
    const { generateAndAttachRecipeHero } = await import("@/lib/recipe-image.server");
    await generateAndAttachRecipeHero({
      recipeId: inserted.id,
      title: inserted.title,
      description: idea.description,
      cuisineTags: idea.cuisine_tags ?? [],
    });
  } catch {
    /* photo is optional */
  }

  return { id: inserted.id, slug: inserted.slug, title: inserted.title };
}

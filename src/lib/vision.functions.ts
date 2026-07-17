import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { rateLimit } from "@/lib/rate-limit.server";

const DetectedItemSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  estimated_expiry_days: z.number().int().nullable(),
  confidence: z.number(),
});

const VisionResultSchema = z.object({
  items: z.array(DetectedItemSchema),
});

export type DetectedItem = z.infer<typeof DetectedItemSchema>;
export type MatchedItem = DetectedItem & {
  matched_product?: {
    id: string;
    name: string;
    base_price: number | null;
    currency_code: string;
  } | null;
};

const STORAGE_BUCKET = "vision-uploads";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

export const analyzeVisionScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storagePath: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Rate limit: 30 vision analyses per hour per subscriber.
    const rl = rateLimit(`vision:u:${context.userId}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new Error(
        `Vision limit reached. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`,
      );
    }

    // Only allow analysis of the user's own uploads.
    const expectedPrefix = `${context.userId}/`;
    if (!data.storagePath.startsWith(expectedPrefix)) {
      throw new Error("Invalid storage path");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(data.storagePath, SIGNED_URL_TTL);
    if (signError || !signed?.signedUrl) {
      throw new Error(signError?.message ?? "Could not access uploaded image");
    }

    const gateway = createLovableAiGatewayProvider(key, undefined, {
      structuredOutputs: true,
    });
    const model = gateway("openai/gpt-5.5");

    let items: DetectedItem[] = [];
    try {
      const { output } = await generateText({
        model,
        system:
          "You are a kitchen inventory assistant. Look at the photo and identify food and household items. " +
          "Return each item with name, quantity, unit, category, brand (if visible), estimated expiry days, and confidence. " +
          "Only include items you are reasonably sure about. Do not invent prices or brands you cannot see.",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What do you see in this photo?" },
              { type: "image", image: signed.signedUrl },
            ],
          },
        ],
        output: Output.object({ schema: VisionResultSchema }),
      });
      items = output.items ?? [];
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const fallback = parseFallback(error.text ?? "");
        items = fallback.items ?? [];
      } else {
        throw error;
      }
    }

    // Match detected items against real available products.
    const { data: products } = await context.supabase
      .from("products")
      .select("id, name, base_price, currency_code")
      .eq("is_available", true)
      .is("deleted_at", null)
      .limit(1000);

    const productList = products ?? [];
    const matchedItems: MatchedItem[] = items.map((item) => ({
      ...item,
      matched_product: findBestProductMatch(item.name, productList),
    }));

    const { data: scan, error: insertError } = await context.supabase
      .from("vision_scans")
      .insert({
        user_id: context.userId,
        image_url: signed.signedUrl,
        detected: {
          storage_path: data.storagePath,
          items: matchedItems,
        },
      })
      .select("id, detected")
      .single();
    if (insertError || !scan) {
      throw new Error(insertError?.message ?? "Failed to save scan");
    }

    return {
      scanId: scan.id,
      items: matchedItems,
      imageUrl: signed.signedUrl,
    };
  });

export const listMyVisionScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vision_scans")
      .select("id, image_url, detected, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteVisionScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: scan } = await context.supabase
      .from("vision_scans")
      .select("detected")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!scan) return { ok: true };

    const detected = scan.detected as { storage_path?: string } | null;
    const storagePath = detected?.storage_path;

    const { error } = await context.supabase
      .from("vision_scans")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    if (storagePath) {
      const { error: storageError } = await context.supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);
      if (storageError) console.error("[vision] remove upload failed", storageError.message);
    }

    return { ok: true };
  });

const RecipeNamesInput = z.object({ names: z.array(z.string().min(1)).max(20) });

export const suggestRecipesFromItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RecipeNamesInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("recipe_ingredients")
      .select("recipe_id")
      .in("name", data.names)
      .limit(200);
    const recipeIds = [...new Set((rows ?? []).map((r) => r.recipe_id))];
    if (recipeIds.length === 0) return [];

    const { data: recipes } = await context.supabase
      .from("recipes")
      .select("id, title, hero_image_url, cooking_time_minutes, servings")
      .in("id", recipeIds)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    return recipes ?? [];
  });

function findBestProductMatch(
  name: string,
  products: { id: string; name: string; base_price: number | null; currency_code: string }[],
): { id: string; name: string; base_price: number | null; currency_code: string } | null {
  const query = name.toLowerCase();
  let best: { product: (typeof products)[number]; score: number } | null = null;

  for (const product of products) {
    const pn = product.name.toLowerCase();
    let score = 0;
    if (pn === query) score = 100;
    else if (pn.includes(query) || query.includes(pn)) score = 60;
    else {
      const qTokens = tokenSet(query);
      const pTokens = tokenSet(pn);
      const intersection = qTokens.filter((t) => pTokens.includes(t));
      const union = [...new Set([...qTokens, ...pTokens])];
      if (union.length > 0) score = (intersection.length / union.length) * 40;
    }
    if (score > 30 && (!best || score > best.score)) {
      best = { product, score };
    }
  }

  return best ? best.product : null;
}

function tokenSet(text: string): string[] {
  return text.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

function parseFallback(text: string): { items: DetectedItem[] } {
  try {
    const json = JSON.parse(text);
    const parsed = VisionResultSchema.safeParse(json);
    return parsed.success ? parsed.data : { items: [] };
  } catch {
    return { items: [] };
  }
}

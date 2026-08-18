import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { watermarkPng } from "@/lib/png-watermark.server";

const BUCKET = "recipe-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5; // ~5 years

/**
 * Generate a photorealistic recipe photo via the Lovable AI Gateway (Gemini
 * image model), upload the PNG to the private recipe-images bucket, and set
 * the recipe's hero_image_url to a long-lived signed URL. Best-effort — any
 * failure is logged and swallowed so it never blocks recipe creation.
 */
export async function generateAndAttachRecipeHero(input: {
  recipeId: string;
  title: string;
  description?: string | null;
  cuisineTags?: string[] | null;
}): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;

  try {
    const cuisine = input.cuisineTags?.length ? ` (${input.cuisineTags.join(", ")})` : "";
    const prompt =
      `A beautiful overhead food photograph of "${input.title}"${cuisine}. ` +
      (input.description ? `${input.description}. ` : "") +
      "Restaurant-quality plating, natural daylight, shallow depth of field, " +
      "styled on a rustic wooden or linen surface, soft shadows, appetising and inviting. " +
      "No text, logos or watermarks anywhere in the scene. Keep the bottom right " +
      "corner visually simple and uncluttered."

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error("[recipe-image] gateway failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const body = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[recipe-image] no image in response");
      return null;
    }

    const original = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    // Burn the watermark into the pixels so it survives download/share/re-upload.
    let bytes = original;
    try {
      bytes = watermarkPng(original, "Hey Taylor!");
    } catch (e) {
      console.error("[recipe-image] watermark failed, storing original", e);
    }
    const admin = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const path = `${input.recipeId}/hero.png`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.error("[recipe-image] upload failed", upErr.message);
      return null;
    }
    const { data: signed, error: sErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (sErr || !signed?.signedUrl) {
      console.error("[recipe-image] sign failed", sErr?.message);
      return null;
    }

    await admin
      .from("recipes")
      .update({ hero_image_url: signed.signedUrl })
      .eq("id", input.recipeId);

    return signed.signedUrl;
  } catch (e) {
    console.error("[recipe-image] unexpected", e);
    return null;
  }
}
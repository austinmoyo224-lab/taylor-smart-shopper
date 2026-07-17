import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyPantry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pantry_items")
      .select("id, name, quantity, unit, expires_at, purchased_at, updated_at")
      .eq("user_id", context.userId)
      .order("expires_at", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addPantryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        quantity: z.number().positive().optional(),
        unit: z.string().max(20).optional(),
        expiresAt: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pantry_items").insert({
      user_id: context.userId,
      name: data.name,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      expires_at: data.expiresAt || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePantryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pantry_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

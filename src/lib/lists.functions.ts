import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyShoppingLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shopping_lists")
      .select("id, name, status, is_ai_generated, estimated_total, estimated_savings, currency_code, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(120), isAi: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("shopping_lists")
      .insert({
        user_id: context.userId,
        name: data.name,
        is_ai_generated: data.isAi ?? false,
        currency_code: "ZAR",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteShoppingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shopping_lists")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getShoppingList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: list, error } = await context.supabase
      .from("shopping_lists")
      .select("id, name, status, estimated_total, estimated_savings, currency_code, is_ai_generated")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!list) return null;
    const { data: items } = await context.supabase
      .from("shopping_list_items")
      .select("id, name, quantity, unit, is_checked, estimated_price, notes, sort_order")
      .eq("list_id", list.id)
      .order("sort_order", { ascending: true });
    return { list, items: items ?? [] };
  });

export const addListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        listId: z.string().uuid(),
        name: z.string().min(1).max(200),
        quantity: z.number().positive().optional(),
        unit: z.string().max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: parent } = await context.supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!parent) throw new Error("List not found");
    const { error } = await context.supabase.from("shopping_list_items").insert({
      list_id: data.listId,
      name: data.name,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), checked: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shopping_list_items")
      .update({ is_checked: data.checked })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

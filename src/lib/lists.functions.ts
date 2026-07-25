import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyShoppingLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shopping_lists")
      .select(
        "id, name, status, is_ai_generated, estimated_total, estimated_savings, currency_code, updated_at",
      )
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
      .select(
        "id, name, status, estimated_total, estimated_savings, currency_code, is_ai_generated",
      )
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
    const { error } = await context.supabase.from("shopping_list_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type StoreRow = { id: string; name: string; logo_url: string | null };
type PriceRow = { product_id: string; store_id: string; price: number };

export const compareBasket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;

    const { data: list } = await sb
      .from("shopping_lists")
      .select("id, name, currency_code")
      .eq("id", data.listId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!list) throw new Error("List not found");

    const { data: rawItems } = await sb
      .from("shopping_list_items")
      .select("id, name, quantity, product_id")
      .eq("list_id", list.id)
      .order("sort_order", { ascending: true });
    const items = rawItems ?? [];

    // Resolve product_id for name-only items via fuzzy match
    const resolved = await Promise.all(
      items.map(async (it) => {
        if (it.product_id) return { ...it, resolvedProductId: it.product_id as string };
        const term = (it.name ?? "").trim();
        if (!term) return { ...it, resolvedProductId: null as string | null };
        const { data: match } = await sb
          .from("products")
          .select("id")
          .ilike("name", `%${term}%`)
          .eq("is_available", true)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        return { ...it, resolvedProductId: match?.id ?? null };
      }),
    );

    const productIds = Array.from(
      new Set(resolved.map((r) => r.resolvedProductId).filter(Boolean) as string[]),
    );

    let prices: PriceRow[] = [];
    let stores: StoreRow[] = [];
    if (productIds.length) {
      const nowIso = new Date().toISOString();
      const { data: priceRows } = await sb
        .from("product_prices")
        .select("product_id, store_id, price, effective_from, effective_to")
        .in("product_id", productIds)
        .lte("effective_from", nowIso);
      const active = (priceRows ?? []).filter(
        (p) => p.store_id && (!p.effective_to || p.effective_to > nowIso),
      );
      // Keep latest per (product, store) — assume rows sorted by effective_from desc
      active.sort((a, b) => (b.effective_from ?? "").localeCompare(a.effective_from ?? ""));
      const seen = new Set<string>();
      for (const p of active) {
        const storeId = p.store_id as string;
        const k = `${p.product_id}|${storeId}`;
        if (seen.has(k)) continue;
        seen.add(k);
        prices.push({ product_id: p.product_id, store_id: storeId, price: Number(p.price) });
      }
      const storeIds = Array.from(new Set(prices.map((p) => p.store_id)));
      if (storeIds.length) {
        const { data: storeRows } = await sb
          .from("stores")
          .select("id, name, logo_url")
          .in("id", storeIds);
        stores = (storeRows ?? []) as StoreRow[];
      }
    }

    const priceIndex = new Map<string, number>();
    for (const p of prices) priceIndex.set(`${p.product_id}|${p.store_id}`, p.price);

    const itemsOut = resolved.map((it) => {
      const qty = Number(it.quantity ?? 1) || 1;
      const perStore: Record<string, number | null> = {};
      let cheapest: { storeId: string; price: number } | null = null;
      for (const s of stores) {
        const unit = it.resolvedProductId
          ? priceIndex.get(`${it.resolvedProductId}|${s.id}`) ?? null
          : null;
        perStore[s.id] = unit == null ? null : unit * qty;
        if (unit != null && (cheapest == null || unit < cheapest.price)) {
          cheapest = { storeId: s.id, price: unit };
        }
      }
      return {
        id: it.id,
        name: it.name,
        quantity: qty,
        matched: !!it.resolvedProductId,
        perStore,
        cheapestStoreId: cheapest?.storeId ?? null,
      };
    });

    const storeTotals = stores.map((s) => {
      let total = 0;
      let matched = 0;
      for (const row of itemsOut) {
        const v = row.perStore[s.id];
        if (v != null) {
          total += v;
          matched += 1;
        }
      }
      return { storeId: s.id, name: s.name, logo_url: s.logo_url, total, matched };
    });
    storeTotals.sort((a, b) => {
      if (b.matched !== a.matched) return b.matched - a.matched;
      return a.total - b.total;
    });

    return {
      list: { id: list.id, name: list.name, currency: list.currency_code ?? "ZAR" },
      stores,
      items: itemsOut,
      storeTotals,
      totalItems: itemsOut.length,
    };
  });

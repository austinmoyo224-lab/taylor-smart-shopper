import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertCanManageStore(userId: string, storeId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("can_manage_store", {
    _user_id: userId,
    _store_id: storeId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: you cannot manage this store");
}

export const listStoreOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        status: z
          .enum(["pending", "paid", "assigned", "out_for_delivery", "delivered", "cancelled", "all"])
          .default("all"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageStore(context.userId, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("store_orders")
      .select(
        "id, store_id, user_id, items, subtotal, total, currency_code, delivery_type, delivery_address, delivery_notes, status, assigned_rider_id, assigned_at, paid_at, delivered_at, created_at, updated_at",
      )
      .eq("store_id", data.storeId)
      .order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const riderIds = Array.from(
      new Set((rows ?? []).map((r) => r.assigned_rider_id).filter(Boolean) as string[]),
    );
    const shoppers = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email, display_name, first_name")
        .in("id", userIds);
      for (const p of profs ?? [])
        shoppers.set(p.id, {
          name: p.display_name ?? p.first_name ?? null,
          email: p.email ?? null,
        });
    }
    const riders = new Map<string, { name: string; phone: string | null }>();
    if (riderIds.length) {
      const { data: rrs } = await supabaseAdmin
        .from("delivery_riders")
        .select("id, full_name, phone_e164")
        .in("id", riderIds);
      for (const r of rrs ?? []) riders.set(r.id, { name: r.full_name, phone: r.phone_e164 });
    }

    return (rows ?? []).map((r) => ({
      ...r,
      shopper: shoppers.get(r.user_id) ?? null,
      rider: r.assigned_rider_id ? riders.get(r.assigned_rider_id) ?? null : null,
    }));
  });

export const listAvailableRiders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageStore(context.userId, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("city")
      .eq("id", data.storeId)
      .single();
    let q = supabaseAdmin
      .from("delivery_riders")
      .select("id, full_name, phone_e164, vehicle_type, service_city, service_area, is_available, rating")
      .eq("verification_status", "approved")
      .eq("is_available", true)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(50);
    if (store?.city) q = q.ilike("service_city", store.city);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const assignRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        riderId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: oErr } = await supabaseAdmin
      .from("store_orders")
      .select("id, store_id, status, delivery_type")
      .eq("id", data.orderId)
      .single();
    if (oErr || !order) throw new Error("Order not found");
    await assertCanManageStore(context.userId, order.store_id);
    if (order.delivery_type !== "delivery")
      throw new Error("Only delivery orders need a rider");
    if (order.status !== "paid" && order.status !== "assigned")
      throw new Error(`Cannot assign a rider to a ${order.status} order`);

    if (data.riderId) {
      const { data: rider } = await supabaseAdmin
        .from("delivery_riders")
        .select("id, verification_status, is_available")
        .eq("id", data.riderId)
        .single();
      if (!rider || rider.verification_status !== "approved")
        throw new Error("Rider is not approved");
      if (!rider.is_available) throw new Error("Rider is not currently available");
    }

    const { error } = await supabaseAdmin
      .from("store_orders")
      .update({
        assigned_rider_id: data.riderId,
        assigned_at: data.riderId ? new Date().toISOString() : null,
        assigned_by: data.riderId ? context.userId : null,
        status: data.riderId ? "assigned" : "paid",
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      table_name: "store_orders",
      record_id: data.orderId,
      action: data.riderId ? "assign_rider" : "unassign_rider",
      changed_data: { rider_id: data.riderId } as never,
    });

    return { ok: true };
  });
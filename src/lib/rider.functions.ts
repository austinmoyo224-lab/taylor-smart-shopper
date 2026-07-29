import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const riderSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone_e164: z.string().trim().max(30).optional().or(z.literal("")),
  vehicle_type: z.enum(["motorbike", "scooter", "bicycle", "car", "on_foot"]),
  vehicle_registration: z.string().trim().max(30).optional().or(z.literal("")),
  id_number: z.string().trim().max(30).optional().or(z.literal("")),
  service_city: z.string().trim().max(120).optional().or(z.literal("")),
  service_area: z.string().trim().max(200).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

export const getMyRiderProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("delivery_riders")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data;
  });

export const upsertMyRiderProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => riderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      full_name: data.full_name,
      phone_e164: data.phone_e164 || null,
      vehicle_type: data.vehicle_type,
      vehicle_registration: data.vehicle_registration || null,
      id_number: data.id_number || null,
      service_city: data.service_city || null,
      service_area: data.service_area || null,
      bio: data.bio || null,
    };
    const { data: row, error } = await context.supabase
      .from("delivery_riders")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase
      .from("profiles")
      .update({
        account_type: "delivery_boy",
        onboarding_completed: true,
        display_name: data.full_name,
      })
      .eq("id", context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Idempotent grant (no unique constraint on (user_id, role, org) so check first)
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "delivery_boy")
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: context.userId, role: "delivery_boy" });
    }

    return row;
  });

export const setMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ is_available: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("delivery_riders")
      .update({ is_available: data.is_available })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDeliveryStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subs } = await context.supabase
      .from("subscriber_store_subs")
      .select("id, target_id, created_at")
      .eq("user_id", context.userId)
      .eq("target_type", "store")
      .eq("is_active", true);
    const ids = (subs ?? []).map((s) => s.target_id);
    if (!ids.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id, name, slug, city, region, logo_url, hero_image_url, status")
      .in("id", ids)
      .is("deleted_at", null);
    return stores ?? [];
  });

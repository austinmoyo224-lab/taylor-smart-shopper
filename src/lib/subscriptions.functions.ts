import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Public lookup: given a store qr_slug (or a qr_codes.slug),
 * return the store card content used on /join/:slug.
 */
export const getStoreByJoinSlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(3).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    // Server publishable client (public read via RLS anon policy on stores).
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Try the direct store qr_slug first (portal.stores.tsx uses slug === qr_slug on create).
    let store = null as
      | {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          hero_image_url: string | null;
          logo_url: string | null;
          city: string | null;
          country_code: string | null;
          is_public: boolean;
          organisation_id: string;
        }
      | null;

    const direct = await supabase
      .from("stores")
      .select(
        "id, name, slug, description, hero_image_url, logo_url, city, country_code, is_public, organisation_id, qr_slug",
      )
      .eq("qr_slug", data.slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (direct.data) store = direct.data;

    // Fallback: lookup via qr_codes table.
    if (!store) {
      const { data: qr } = await supabase
        .from("qr_codes")
        .select("target_id, type, is_active")
        .eq("slug", data.slug)
        .eq("type", "store_invite")
        .eq("is_active", true)
        .maybeSingle();
      if (qr?.target_id) {
        const { data: s } = await supabase
          .from("stores")
          .select(
            "id, name, slug, description, hero_image_url, logo_url, city, country_code, is_public, organisation_id",
          )
          .eq("id", qr.target_id)
          .is("deleted_at", null)
          .maybeSingle();
        store = s;
      }
    }
    if (!store) return null;
    return store;
  });

/** Increment scan counter (best-effort, never blocks the page). */
export const recordJoinScan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string().min(3).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only bump if a qr_codes row with that slug exists.
    const { data: qr } = await supabaseAdmin
      .from("qr_codes")
      .select("id, scan_count")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!qr) return { ok: true };
    await supabaseAdmin
      .from("qr_codes")
      .update({ scan_count: (qr.scan_count ?? 0) + 1 })
      .eq("id", qr.id);
    return { ok: true };
  });

/** Authenticated subscribe/unsubscribe. */
export const subscribeToStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid(),
        source: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Confirm store exists.
    const { data: store, error: storeErr } = await supabaseAdmin
      .from("stores")
      .select("id, organisation_id")
      .eq("id", data.storeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (storeErr || !store) throw new Error("Store not found");
    const { error } = await supabaseAdmin.from("subscriber_store_subs").upsert(
      {
        user_id: context.userId,
        target_type: "store",
        target_id: data.storeId,
        source: data.source ?? "app",
        is_active: true,
      },
      { onConflict: "user_id,target_type,target_id" },
    );
    if (error) throw new Error(error.message);

    // Bump conversion counter if a matching qr_code exists.
    const { data: qr } = await supabaseAdmin
      .from("qr_codes")
      .select("id, conversion_count")
      .eq("target_id", data.storeId)
      .eq("type", "store_invite")
      .maybeSingle();
    if (qr) {
      await supabaseAdmin
        .from("qr_codes")
        .update({ conversion_count: (qr.conversion_count ?? 0) + 1 })
        .eq("id", qr.id);
    }
    return { ok: true };
  });

export const unsubscribeFromStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ storeId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriber_store_subs")
      .update({ is_active: false })
      .eq("user_id", context.userId)
      .eq("target_type", "store")
      .eq("target_id", data.storeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("subscriber_store_subs")
      .select("target_id, created_at, source")
      .eq("user_id", context.userId)
      .eq("target_type", "store")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((s) => s.target_id);
    if (ids.length === 0) return [];
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id, name, slug, city, country_code, logo_url, qr_slug")
      .in("id", ids);
    return (stores ?? []).map((s) => ({
      ...s,
      subscribed_at:
        data?.find((r) => r.target_id === s.id)?.created_at ?? null,
    }));
  });

/** Portal: ensure a QR row exists for this store, return the join URL + slug. */
export const ensureStoreQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ storeId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verify caller owns access to the org this store belongs to.
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, organisation_id, name, qr_slug")
      .eq("id", data.storeId)
      .maybeSingle();
    if (!store) throw new Error("Store not found");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role, organisation_id")
      .eq("user_id", context.userId);
    const hasAccess = (roles ?? []).some(
      (r) =>
        r.role === "super_admin" ||
        ((r.role === "retailer_admin" || r.role === "store_manager") &&
          r.organisation_id === store.organisation_id),
    );
    if (!hasAccess) throw new Error("Forbidden");

    const { data: existing } = await supabaseAdmin
      .from("qr_codes")
      .select("id, slug, scan_count, conversion_count")
      .eq("target_id", store.id)
      .eq("type", "store_invite")
      .maybeSingle();
    if (existing) return { slug: existing.slug, scans: existing.scan_count, conversions: existing.conversion_count };

    const { data: created, error } = await supabaseAdmin
      .from("qr_codes")
      .insert({
        organisation_id: store.organisation_id,
        type: "store_invite",
        target_id: store.id,
        label: store.name,
      })
      .select("slug, scan_count, conversion_count")
      .single();
    if (error) throw new Error(error.message);
    return {
      slug: created.slug,
      scans: created.scan_count,
      conversions: created.conversion_count,
    };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Public lookup: given a store qr_slug (or a qr_codes.slug),
 * return the store card content used on /join/:slug.
 */
export const getStoreByJoinSlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(3).max(120) }).parse(d))
  .handler(async ({ data }) => {
    // Read via admin client so join links work even for stores that haven't
    // been marked is_public yet — the /join page only surfaces name + hero.
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

    let store = null as {
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
    } | null;

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
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(3).max(120) }).parse(d))
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
  .inputValidator((d: unknown) => z.object({ storeId: z.string().uuid() }).parse(d))
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
      subscribed_at: data?.find((r) => r.target_id === s.id)?.created_at ?? null,
    }));
  });

/** Portal: ensure a QR row exists for this store, return the join URL + slug. */
export const ensureStoreQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storeId: z.string().uuid() }).parse(d))
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      if (existing.slug !== store.qr_slug) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("qr_codes")
          .update({ slug: store.qr_slug, label: store.name, is_active: true })
          .eq("id", existing.id)
          .select("slug, scan_count, conversion_count")
          .single();
        if (updateError) throw new Error(updateError.message);
        return {
          slug: updated.slug,
          scans: updated.scan_count,
          conversions: updated.conversion_count,
        };
      }
      return {
        slug: existing.slug,
        scans: existing.scan_count,
        conversions: existing.conversion_count,
      };
    }

    const { data: created, error } = await supabaseAdmin
      .from("qr_codes")
      .insert({
        organisation_id: store.organisation_id,
        type: "store_invite",
        target_id: store.id,
        slug: store.qr_slug,
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

/**
 * Public feed of active, published promotions for the Stores landing carousel.
 * Returns a small list of promotions ordered by sponsored-first, most recent.
 */
export const listFeaturedAds = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("promotions")
      .select(
        "id, title, description, type, is_sponsored, original_price, sale_price, currency_code, hero_image_url, ends_at, store_id, stores(id, name, slug, logo_url, hero_image_url, qr_slug)",
      )
      .eq("is_published", true)
      .is("deleted_at", null)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("is_sponsored", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) return [];
    return data ?? [];
  });

/**
 * Shopper: full store profile for the public store page, including
 * published promotions and (if the caller is signed in and follows the
 * store) the active coupons they can redeem.
 */
export const getStorePublicProfile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ storeId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .select(
        "id, organisation_id, name, slug, qr_slug, description, logo_url, hero_image_url, city, region, country_code, address_line1, address_line2, postal_code, latitude, longitude, contact_email, contact_phone, trading_hours, status, is_public",
      )
      .eq("id", data.storeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!store) return null;

    const { data: promotions } = await supabaseAdmin
      .from("promotions")
      .select(
        "id, title, description, type, is_sponsored, original_price, sale_price, currency_code, hero_image_url, starts_at, ends_at, metadata",
      )
      .eq("store_id", store.id)
      .eq("is_published", true)
      .is("deleted_at", null)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("is_sponsored", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40);

    return { store, promotions: promotions ?? [] };
  });

/** Shopper: promotions from every store the caller currently follows. */
export const listMyDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { data: subs } = await supabaseAdmin
      .from("subscriber_store_subs")
      .select("target_id")
      .eq("user_id", context.userId)
      .eq("target_type", "store")
      .eq("is_active", true);
    const storeIds = (subs ?? []).map((s) => s.target_id);
    if (storeIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("promotions")
      .select(
        "id, title, description, type, is_sponsored, original_price, sale_price, currency_code, hero_image_url, ends_at, store_id, stores(id, name, logo_url, qr_slug)",
      )
      .in("store_id", storeIds)
      .eq("is_published", true)
      .is("deleted_at", null)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("is_sponsored", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Shopper: active coupons for every store the caller follows. */
export const listMyCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { data: subs } = await supabaseAdmin
      .from("subscriber_store_subs")
      .select("target_id")
      .eq("user_id", context.userId)
      .eq("target_type", "store")
      .eq("is_active", true);
    const storeIds = (subs ?? []).map((s) => s.target_id);
    if (storeIds.length === 0) return [];
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id, name, organisation_id, logo_url")
      .in("id", storeIds);
    const orgIds = Array.from(new Set((stores ?? []).map((s) => s.organisation_id)));
    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select(
        "id, code, title, description, discount_percent, discount_amount, currency_code, ends_at, starts_at, usage_limit_total, store_id, organisation_id, qr_payload",
      )
      .eq("status", "active")
      .is("deleted_at", null)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .or(
        `store_id.in.(${storeIds.join(",")}),and(store_id.is.null,organisation_id.in.(${orgIds.join(",")}))`,
      )
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw new Error(error.message);
    const storeMap = new Map((stores ?? []).map((s) => [s.id, s]));
    const orgToStore = new Map<string, { id: string; name: string; logo_url: string | null }>();
    for (const s of stores ?? []) if (!orgToStore.has(s.organisation_id)) orgToStore.set(s.organisation_id, s);
    return (data ?? []).map((c) => {
      const store =
        (c.store_id && storeMap.get(c.store_id)) || orgToStore.get(c.organisation_id) || null;
      return { ...c, store: store ? { id: store.id, name: store.name, logo_url: store.logo_url } : null };
    });
  });

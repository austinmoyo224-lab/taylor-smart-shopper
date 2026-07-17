import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PortalRole = "super_admin" | "retailer_admin" | "store_manager" | "staff";

/** Returns the caller's portal-relevant roles and the orgs they can act in. */
async function getPortalScope(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, organisation_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).filter(
    (r): r is { role: PortalRole; organisation_id: string | null } =>
      ["super_admin", "retailer_admin", "store_manager", "staff"].includes(r.role),
  );
  const isSuperAdmin = roles.some((r) => r.role === "super_admin");
  const orgIds = Array.from(
    new Set(roles.map((r) => r.organisation_id).filter((v): v is string => !!v)),
  );
  return { roles, isSuperAdmin, orgIds };
}

async function assertOrgAccess(userId: string, orgId: string) {
  const scope = await getPortalScope(userId);
  if (scope.isSuperAdmin) return scope;
  if (!scope.orgIds.includes(orgId)) throw new Error("Forbidden: no access to this organisation");
  return scope;
}

export const getPortalContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await getPortalScope(context.userId);
    if (scope.roles.length === 0) {
      return { hasAccess: false as const, organisations: [], stores: [] };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orgQuery = supabaseAdmin
      .from("organisations")
      .select("id, name, slug, type, default_currency, country_code")
      .is("deleted_at", null);
    const { data: orgs } = scope.isSuperAdmin
      ? await orgQuery.order("name")
      : await orgQuery
          .in("id", scope.orgIds.length ? scope.orgIds : ["00000000-0000-0000-0000-000000000000"])
          .order("name");
    const orgIds = (orgs ?? []).map((o) => o.id);
    const { data: stores } = orgIds.length
      ? await supabaseAdmin
          .from("stores")
          .select("id, name, slug, status, city, organisation_id")
          .in("organisation_id", orgIds)
          .is("deleted_at", null)
          .order("name")
      : { data: [] as never[] };
    return {
      hasAccess: true as const,
      isSuperAdmin: scope.isSuperAdmin,
      organisations: orgs ?? [],
      stores: stores ?? [],
    };
  });

// ---------- STORES ----------

const createStoreSchema = z.object({
  organisation_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  country_code: z.string().length(2).default("ZA"),
  status: z.enum(["draft", "active", "paused", "archived"]).default("draft"),
});

export const createStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createStoreSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("stores")
      .insert({
        organisation_id: data.organisation_id,
        name: data.name,
        slug: data.slug,
        city: data.city || null,
        country_code: data.country_code,
        status: data.status,
        qr_slug: data.slug,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------- PRODUCTS ----------

const orgIdInput = z.object({ organisation_id: z.string().uuid() });

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orgIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, slug, sku, unit, unit_amount, base_price, currency_code, is_available, created_at",
      )
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createProductSchema = z.object({
  organisation_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  sku: z.string().trim().max(80).optional().or(z.literal("")),
  unit: z.string().trim().max(20).optional().or(z.literal("")),
  unit_amount: z.number().nonnegative().optional().nullable(),
  base_price: z.number().nonnegative().optional().nullable(),
  currency_code: z.string().length(3).default("ZAR"),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .insert({
        organisation_id: data.organisation_id,
        name: data.name,
        slug: data.slug,
        sku: data.sku || null,
        unit: data.unit || null,
        unit_amount: data.unit_amount ?? null,
        base_price: data.base_price ?? null,
        currency_code: data.currency_code,
        description: data.description || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------- PROMOTIONS ----------

export const listPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orgIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("promotions")
      .select(
        "id, title, type, is_sponsored, is_published, original_price, sale_price, currency_code, starts_at, ends_at, store_id, stores(name)",
      )
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createPromotionSchema = z.object({
  organisation_id: z.string().uuid(),
  store_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  type: z.enum(["weekly_special", "flash_sale", "discount", "bundle", "seasonal", "sponsored"]),
  is_sponsored: z.boolean().default(false),
  original_price: z.number().nonnegative().optional().nullable(),
  sale_price: z.number().nonnegative().optional().nullable(),
  currency_code: z.string().length(3).default("ZAR"),
  starts_at: z.string().datetime().optional().or(z.literal("")),
  ends_at: z.string().datetime().optional().or(z.literal("")),
  is_published: z.boolean().default(false),
});

export const createPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createPromotionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("promotions")
      .insert({
        organisation_id: data.organisation_id,
        store_id: data.store_id || null,
        title: data.title,
        description: data.description || null,
        type: data.type,
        is_sponsored: data.is_sponsored,
        original_price: data.original_price ?? null,
        sale_price: data.sale_price ?? null,
        currency_code: data.currency_code,
        starts_at: data.starts_at || undefined,
        ends_at: data.ends_at || undefined,
        is_published: data.is_published,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------- COUPONS ----------

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orgIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("coupons")
      .select(
        "id, code, title, description, discount_percent, discount_amount, currency_code, status, starts_at, ends_at, usage_limit_total",
      )
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createCouponSchema = z.object({
  organisation_id: z.string().uuid(),
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9-]+$/, "Uppercase letters, numbers, hyphens only"),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  discount_percent: z.number().min(0).max(100).optional().nullable(),
  discount_amount: z.number().nonnegative().optional().nullable(),
  currency_code: z.string().length(3).default("ZAR"),
  usage_limit_total: z.number().int().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().or(z.literal("")),
  ends_at: z.string().datetime().optional().or(z.literal("")),
  status: z.enum(["draft", "active", "paused", "expired", "archived"]).default("draft"),
});

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createCouponSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .insert({
        organisation_id: data.organisation_id,
        code: data.code,
        title: data.title,
        description: data.description || null,
        discount_percent: data.discount_percent ?? null,
        discount_amount: data.discount_amount ?? null,
        currency_code: data.currency_code,
        usage_limit_total: data.usage_limit_total ?? null,
        starts_at: data.starts_at || undefined,
        ends_at: data.ends_at || undefined,
        status: data.status,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------- ANALYTICS ----------

const analyticsInput = z.object({
  organisation_id: z.string().uuid(),
  store_id: z.string().uuid().optional().nullable(),
  days: z.number().int().min(7).max(180).default(30),
});

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function emptySeries(days: number) {
  const out: { date: string; value: number }[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    out.push({ date: dayKey(d), value: 0 });
  }
  return out;
}

export const getStoreAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => analyticsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (data.days - 1));
    const sinceIso = since.toISOString();

    // scope to org stores (and optional single store)
    const storesQuery = supabaseAdmin
      .from("stores")
      .select("id, name")
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null);
    const { data: orgStores } = await storesQuery;
    const allStoreIds = (orgStores ?? []).map((s) => s.id);
    const storeIds =
      data.store_id && allStoreIds.includes(data.store_id) ? [data.store_id] : allStoreIds;
    const storeNameById = new Map((orgStores ?? []).map((s) => [s.id, s.name]));

    // --- followers ---
    const followerSeries = emptySeries(data.days);
    const followerIdx = new Map(followerSeries.map((p, i) => [p.date, i]));
    let followerTotal = 0;
    let followerNew = 0;

    if (storeIds.length) {
      const { count: totalCount } = await supabaseAdmin
        .from("subscriber_store_subs")
        .select("id", { count: "exact", head: true })
        .eq("target_type", "store")
        .eq("is_active", true)
        .in("target_id", storeIds);
      followerTotal = totalCount ?? 0;

      const { data: newSubs } = await supabaseAdmin
        .from("subscriber_store_subs")
        .select("created_at, target_id")
        .eq("target_type", "store")
        .in("target_id", storeIds)
        .gte("created_at", sinceIso)
        .limit(5000);
      for (const s of newSubs ?? []) {
        followerNew++;
        const key = dayKey(new Date(s.created_at));
        const i = followerIdx.get(key);
        if (i !== undefined) followerSeries[i].value++;
      }
    }

    // --- redemptions ---
    const redemptionSeries = emptySeries(data.days);
    const redemptionIdx = new Map(redemptionSeries.map((p, i) => [p.date, i]));
    let redemptionsTotal = 0;
    const perCoupon = new Map<string, number>();

    const { data: orgCoupons } = await supabaseAdmin
      .from("coupons")
      .select("id, code, title, store_id")
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null);
    const relevantCoupons = (orgCoupons ?? []).filter(
      (c) => !data.store_id || c.store_id === data.store_id || c.store_id === null,
    );
    const couponIds = relevantCoupons.map((c) => c.id);
    const couponMeta = new Map(relevantCoupons.map((c) => [c.id, c]));

    if (couponIds.length) {
      const { data: reds } = await supabaseAdmin
        .from("coupon_redemptions")
        .select("coupon_id, redeemed_at")
        .in("coupon_id", couponIds)
        .gte("redeemed_at", sinceIso)
        .limit(10000);
      for (const r of reds ?? []) {
        redemptionsTotal++;
        perCoupon.set(r.coupon_id, (perCoupon.get(r.coupon_id) ?? 0) + 1);
        const key = dayKey(new Date(r.redeemed_at));
        const i = redemptionIdx.get(key);
        if (i !== undefined) redemptionSeries[i].value++;
      }
    }

    const topCoupons = Array.from(perCoupon.entries())
      .map(([id, count]) => {
        const c = couponMeta.get(id);
        return {
          id,
          code: c?.code ?? "—",
          title: c?.title ?? "Coupon",
          store_name: c?.store_id ? (storeNameById.get(c.store_id) ?? null) : null,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // --- promotions & campaigns ---
    const promoQuery = supabaseAdmin
      .from("promotions")
      .select("id, is_published, ends_at, store_id", { count: "exact" })
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null);
    if (data.store_id) promoQuery.eq("store_id", data.store_id);
    const { data: promos } = await promoQuery;
    const nowMs = Date.now();
    const promotionsPublished = (promos ?? []).filter((p) => p.is_published).length;
    const promotionsActive = (promos ?? []).filter(
      (p) => p.is_published && (!p.ends_at || new Date(p.ends_at).getTime() > nowMs),
    ).length;

    const campQuery = supabaseAdmin
      .from("campaigns")
      .select("id, is_active, store_id")
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null);
    if (data.store_id) campQuery.eq("store_id", data.store_id);
    const { data: camps } = await campQuery;
    const campaignsActive = (camps ?? []).filter((c) => c.is_active).length;

    const activeCoupons = relevantCoupons.length;

    return {
      days: data.days,
      scope: data.store_id ? "store" : ("organisation" as const),
      totals: {
        followerTotal,
        followerNew,
        redemptionsTotal,
        activeCoupons,
        promotionsPublished,
        promotionsActive,
        campaignsActive,
      },
      series: {
        followers: followerSeries,
        redemptions: redemptionSeries,
      },
      topCoupons,
    };
  });

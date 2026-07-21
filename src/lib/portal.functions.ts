import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PortalRole = "super_admin" | "retailer_admin" | "store_manager" | "staff";

/** Returns the caller's portal-relevant roles and the orgs they can act in. */
async function getPortalScope(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data, error }, { data: staffRows, error: staffError }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role, organisation_id").eq("user_id", userId),
    supabaseAdmin
      .from("store_staff")
      .select("store_id, role")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);
  if (error) throw new Error(error.message);
  if (staffError) throw new Error(staffError.message);
  const roles = (data ?? []).filter(
    (r): r is { role: PortalRole; organisation_id: string | null } =>
      ["super_admin", "retailer_admin", "store_manager", "staff"].includes(r.role),
  );
  const isSuperAdmin = roles.some((r) => r.role === "super_admin");
  const orgRoleIds = Array.from(
    new Set(roles.map((r) => r.organisation_id).filter((v): v is string => !!v)),
  );
  const staffStoreIds = Array.from(new Set((staffRows ?? []).map((s) => s.store_id)));
  const { data: staffStores } = staffStoreIds.length
    ? await supabaseAdmin
        .from("stores")
        .select("id, organisation_id")
        .in("id", staffStoreIds)
        .is("deleted_at", null)
    : { data: [] as { id: string; organisation_id: string }[] };
  const staffOrgIds = Array.from(new Set((staffStores ?? []).map((s) => s.organisation_id)));
  const orgIds = Array.from(new Set([...orgRoleIds, ...staffOrgIds]));
  return { roles, isSuperAdmin, orgIds, orgRoleIds, staffStoreIds };
}

async function assertOrgAccess(userId: string, orgId: string) {
  const scope = await getPortalScope(userId);
  if (scope.isSuperAdmin) return scope;
  if (!scope.orgIds.includes(orgId)) throw new Error("Forbidden: no access to this organisation");
  return scope;
}

function slugSafe(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || randomSlug(8)
  );
}

async function makeUniqueStoreCode(supabaseAdmin: unknown, preferred: string) {
  const base = slugSafe(preferred).slice(0, 72);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSlug(4)}`;
    const client = supabaseAdmin as { from: (table: string) => unknown };
    const storeQuery = client.from("stores") as {
      select: (columns: string) => {
        eq: (column: string, value: string) => { maybeSingle: () => PromiseLike<{ data: unknown }> };
      };
    };
    const qrQuery = client.from("qr_codes") as {
      select: (columns: string) => {
        eq: (column: string, value: string) => { maybeSingle: () => PromiseLike<{ data: unknown }> };
      };
    };
    const [storeMatch, qrMatch] = await Promise.all([
      storeQuery.select("id").eq("qr_slug", candidate).maybeSingle(),
      qrQuery.select("id").eq("slug", candidate).maybeSingle(),
    ]);
    if (!storeMatch.data && !qrMatch.data) return candidate;
  }
  return `${base}-${randomSlug(8)}`;
}

export const getPortalContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await getPortalScope(context.userId);
    if (scope.roles.length === 0 && scope.staffStoreIds.length === 0) {
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
    const allStoreRows: {
      id: string;
      name: string;
      slug: string;
      status: string;
      city: string | null;
      country_code: string | null;
      qr_slug: string | null;
      is_public: boolean | null;
      organisation_id: string;
    }[] = [];
    if (scope.isSuperAdmin || scope.orgRoleIds.length > 0) {
      const allowedOrgIds = scope.isSuperAdmin ? orgIds : scope.orgRoleIds;
      const { data: roleStores } = allowedOrgIds.length
        ? await supabaseAdmin
            .from("stores")
            .select("id, name, slug, status, city, country_code, qr_slug, is_public, organisation_id")
            .in("organisation_id", allowedOrgIds)
            .is("deleted_at", null)
            .order("name")
        : { data: [] as never[] };
      allStoreRows.push(...(roleStores ?? []));
    }
    if (!scope.isSuperAdmin && scope.staffStoreIds.length > 0) {
      const { data: staffStores } = await supabaseAdmin
        .from("stores")
        .select("id, name, slug, status, city, country_code, qr_slug, is_public, organisation_id")
        .in("id", scope.staffStoreIds)
        .is("deleted_at", null)
        .order("name");
      allStoreRows.push(...(staffStores ?? []));
    }
    const stores = Array.from(new Map(allStoreRows.map((s) => [s.id, s])).values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return {
      hasAccess: true as const,
      isSuperAdmin: scope.isSuperAdmin,
      organisations: orgs ?? [],
      stores,
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
  status: z.enum(["draft", "pending", "active", "paused", "archived"]).default("pending"),
});

export const createStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createStoreSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const qrSlug = await makeUniqueStoreCode(supabaseAdmin, data.slug);
    const scope = await getPortalScope(context.userId);
    // Only super admins can create a store already live. Everyone else lands in pending.
    const status = scope.isSuperAdmin ? data.status : data.status === "active" ? "pending" : data.status;
    const { data: row, error } = await supabaseAdmin
      .from("stores")
      .insert({
        organisation_id: data.organisation_id,
        name: data.name,
        slug: data.slug,
        city: data.city || null,
        country_code: data.country_code,
        status,
        qr_slug: qrSlug,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: qrError } = await supabaseAdmin.from("qr_codes").insert({
      organisation_id: data.organisation_id,
      type: "store_invite",
      target_id: row.id,
      slug: qrSlug,
      label: data.name,
      is_active: true,
    });
    if (qrError) throw new Error(qrError.message);
    return { id: row.id };
  });

// ---------- STORE PROFILE (get / update / regenerate code) ----------

const storeIdInput = z.object({ store_id: z.string().uuid() });

async function assertStoreAccess(userId: string, storeId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select(
      "id, organisation_id, name, slug, qr_slug, status, description, logo_url, hero_image_url, brand_colors, address_line1, address_line2, city, region, postal_code, country_code, latitude, longitude, timezone, trading_hours, contact_email, contact_phone, is_public",
    )
    .eq("id", storeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!store) throw new Error("Store not found");
  const scope = await getPortalScope(userId);
  if (
    !scope.isSuperAdmin &&
    !scope.orgRoleIds.includes(store.organisation_id) &&
    !scope.staffStoreIds.includes(storeId)
  ) {
    throw new Error("Forbidden: no access to this store");
  }
  return store;
}

export const getStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeIdInput.parse(d))
  .handler(async ({ data, context }) => assertStoreAccess(context.userId, data.store_id));

const updateStoreSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(["draft", "pending", "active", "paused", "archived"]).optional(),
  description: z.string().max(2000).optional().nullable(),
  logo_url: z.string().url().max(2000).optional().nullable(),
  hero_image_url: z.string().url().max(2000).optional().nullable(),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country_code: z.string().length(2).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  timezone: z.string().max(60).optional(),
  contact_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  contact_phone: z.string().max(40).optional().nullable().or(z.literal("")),
  is_public: z.boolean().optional(),
  trading_hours: z.record(z.string(), z.any()).optional(),
  brand_colors: z.record(z.string(), z.any()).optional().nullable(),
});

export const updateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateStoreSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStoreAccess(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { store_id, ...rest } = data;
    const scope = await getPortalScope(context.userId);
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      patch[k] = v === "" ? null : v;
    }
    // Retailers cannot flip a store live — only a super admin approves it.
    if (!scope.isSuperAdmin && patch.status === "active") {
      patch.status = "pending";
    }
    const { error } = await supabaseAdmin
      .from("stores")
      .update(patch as never)
      .eq("id", store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const store = await assertStoreAccess(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("stores")
      .update({ status: "archived", deleted_at: now })
      .eq("id", data.store_id);
    if (error) throw new Error(error.message);
    await Promise.all([
      supabaseAdmin
        .from("qr_codes")
        .update({ is_active: false })
        .eq("target_id", data.store_id)
        .eq("type", "store_invite"),
      supabaseAdmin
        .from("subscriber_store_subs")
        .update({ is_active: false })
        .eq("target_id", data.store_id)
        .eq("target_type", "store"),
    ]);
    return { ok: true, organisation_id: store.organisation_id };
  });

// Super-admin-only: approve a pending store and take it live.
const approveStoreSchema = z.object({
  store_id: z.string().uuid(),
  status: z.enum(["active", "paused", "draft"]).default("active"),
});

export const approveStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => approveStoreSchema.parse(d))
  .handler(async ({ data, context }) => {
    const scope = await getPortalScope(context.userId);
    if (!scope.isSuperAdmin) throw new Error("Forbidden: only super admins can approve stores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("stores")
      .update({ status: data.status })
      .eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true, status: data.status };
  });

function randomSlug(len = 8) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const regenerateStoreCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const store = await assertStoreAccess(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const candidate = await makeUniqueStoreCode(supabaseAdmin, randomSlug(8));
    const { data: row, error } = await supabaseAdmin
      .from("stores")
      .update({ qr_slug: candidate })
      .eq("id", data.store_id)
      .select("qr_slug")
      .maybeSingle();
    if (error || !row) throw new Error(error?.message ?? "Could not generate a unique store code");

    const { data: existingQr } = await supabaseAdmin
      .from("qr_codes")
      .select("id")
      .eq("target_id", data.store_id)
      .eq("type", "store_invite")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const qrWrite = existingQr
      ? await supabaseAdmin
          .from("qr_codes")
          .update({ slug: candidate, label: store.name, is_active: true })
          .eq("id", existingQr.id)
      : await supabaseAdmin.from("qr_codes").insert({
          organisation_id: store.organisation_id,
          type: "store_invite",
          target_id: data.store_id,
          slug: candidate,
          label: store.name,
          is_active: true,
        });
    if (qrWrite.error) throw new Error(qrWrite.error.message);
    return { qr_slug: row.qr_slug };
  });

export const getStoreSubscriberDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => storeIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStoreAccess(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs, count, error } = await supabaseAdmin
      .from("subscriber_store_subs")
      .select("user_id, created_at, source", { count: "exact" })
      .eq("target_type", "store")
      .eq("target_id", data.store_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = (subs ?? []).map((s) => s.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, display_name, first_name, email, phone, avatar_url")
          .in("id", ids)
      : { data: [] as never[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      count: count ?? 0,
      recent: (subs ?? []).map((sub) => ({
        user_id: sub.user_id,
        subscribed_at: sub.created_at,
        source: sub.source,
        profile: byId.get(sub.user_id) ?? null,
      })),
    };
  });

// ---------- STORE ASSETS ----------

const assetListInput = z.object({
  organisation_id: z.string().uuid(),
  store_id: z.string().uuid().optional().nullable(),
});

export const listStoreAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assetListInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const prefix = data.store_id
      ? `${data.organisation_id}/${data.store_id}`
      : `${data.organisation_id}`;
    const { data: files, error } = await supabaseAdmin.storage
      .from("store-assets")
      .list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    const out: {
      name: string;
      path: string;
      size: number | null;
      created_at: string | null;
      url: string;
    }[] = [];
    for (const f of files ?? []) {
      if (!f.name || f.name.startsWith(".")) continue;
      const path = `${prefix}/${f.name}`;
      const { data: signed } = await supabaseAdmin.storage
        .from("store-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      out.push({
        name: f.name,
        path,
        size: (f.metadata as { size?: number } | null)?.size ?? null,
        created_at: f.created_at ?? null,
        url: signed?.signedUrl ?? "",
      });
    }
    return out;
  });

export const deleteStoreAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ organisation_id: z.string().uuid(), path: z.string().min(3) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    if (!data.path.startsWith(`${data.organisation_id}/`)) {
      throw new Error("Path outside organisation");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("store-assets").remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Uploads a file to store-assets and returns a long-lived signed URL that can
 *  be persisted in logo_url / hero_image_url / promotion image etc. Path must
 *  already exist in the bucket (client uploaded it first). */
export const signStoreAssetUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        organisation_id: z.string().uuid(),
        path: z.string().min(3).max(500),
        expires_in_seconds: z
          .number()
          .int()
          .positive()
          .max(60 * 60 * 24 * 365 * 20)
          .default(60 * 60 * 24 * 365 * 10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    if (!data.path.startsWith(`${data.organisation_id}/`)) {
      throw new Error("Path outside organisation");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("store-assets")
      .createSignedUrl(data.path, data.expires_in_seconds);
    if (error || !signed) throw new Error(error?.message ?? "Could not sign URL");
    return { url: signed.signedUrl, path: data.path };
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
        "id, title, type, is_sponsored, is_published, original_price, sale_price, currency_code, starts_at, ends_at, store_id, stores(name), promotion_products(products(name))",
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
  hero_image_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  product_ids: z.array(z.string().uuid()).max(80).optional().default([]),
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
        hero_image_url: data.hero_image_url || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.product_ids.length > 0) {
      const { error: linkError } = await supabaseAdmin.from("promotion_products").insert(
        data.product_ids.map((product_id) => ({
          promotion_id: row.id,
          product_id,
        })),
      );
      if (linkError) throw new Error(linkError.message);
    }
    return { id: row.id };
  });

const updatePromotionSchema = createPromotionSchema.extend({
  id: z.string().uuid(),
});

export const updatePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatePromotionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("promotions")
      .update({
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
        hero_image_url: data.hero_image_url || null,
      })
      .eq("id", data.id)
      .eq("organisation_id", data.organisation_id);
    if (error) throw new Error(error.message);
    // Replace product links
    await supabaseAdmin.from("promotion_products").delete().eq("promotion_id", data.id);
    if (data.product_ids.length > 0) {
      const { error: linkError } = await supabaseAdmin.from("promotion_products").insert(
        data.product_ids.map((product_id) => ({ promotion_id: data.id, product_id })),
      );
      if (linkError) throw new Error(linkError.message);
    }
    return { id: data.id };
  });

const deletePromotionSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
});

export const deletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deletePromotionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("promotions")
      .update({ deleted_at: new Date().toISOString(), is_published: false })
      .eq("id", data.id)
      .eq("organisation_id", data.organisation_id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
        "id, code, title, description, discount_percent, discount_amount, currency_code, status, starts_at, ends_at, usage_limit_total, store_id, qr_payload",
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
  store_id: z.string().uuid().optional().nullable(),
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
        store_id: data.store_id || null,
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
        qr_payload: `TAYLOR-COUPON:${data.code}`,
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

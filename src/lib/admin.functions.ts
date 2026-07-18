import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "super_admin" | "retailer_admin" | "store_manager" | "staff" | "subscriber";

async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden: super_admin role required");
}

/** Public-ish status for the profile page and admin gate. */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count }, { data: mine }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin"),
      supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "super_admin")
        .maybeSingle(),
    ]);
    return {
      isSuperAdmin: !!mine,
      superAdminCount: count ?? 0,
      canClaim: (count ?? 0) === 0,
    };
  });

/** First-run bootstrap: any authenticated user can claim super_admin
 *  if the platform has zero super_admins. Locked forever after that. */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) throw new Error("Super admin already claimed");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "super_admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [orgs, stores, subscribers, promos, conversations, msgs] = await Promise.all([
      supabaseAdmin
        .from("organisations")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabaseAdmin
        .from("stores")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "subscriber"),
      supabaseAdmin.from("promotions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("conversations").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
    ]);
    return {
      organisations: orgs.count ?? 0,
      stores: stores.count ?? 0,
      subscribers: subscribers.count ?? 0,
      promotions: promos.count ?? 0,
      conversations: conversations.count ?? 0,
      messages: msgs.count ?? 0,
    };
  });

export const listOrganisations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("organisations")
      .select(
        "id, name, slug, type, country_code, default_currency, is_active, contact_email, created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const createOrgSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  type: z.enum(["retail_group", "brand", "partner", "independent"]),
  country_code: z.string().length(2).default("ZA"),
  default_currency: z.string().length(3).default("ZAR"),
  contact_email: z.string().email().optional().or(z.literal("")),
});

export const createOrganisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createOrgSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("organisations")
      .insert({
        name: data.name,
        slug: data.slug,
        type: data.type,
        country_code: data.country_code,
        default_currency: data.default_currency,
        contact_email: data.contact_email || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select(
        "id, name, slug, qr_slug, status, city, region, country_code, contact_email, contact_phone, is_public, organisation_id, created_at, organisations(name)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data;
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, phone, display_name, first_name, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, organisation_id")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byUser = new Map<string, { role: AppRole; organisation_id: string | null }[]>();
    (roles ?? []).forEach((r) => {
      const list = byUser.get(r.user_id) ?? [];
      list.push({ role: r.role as AppRole, organisation_id: r.organisation_id });
      byUser.set(r.user_id, list);
    });
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: byUser.get(p.id) ?? [],
    }));
  });

const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["super_admin", "retailer_admin", "store_manager", "staff", "subscriber"]),
  organisationId: z.string().uuid().optional().nullable(),
  grant: z.boolean(),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => setRoleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    // Guardrail: prevent removing the last super_admin
    if (data.role === "super_admin" && !data.grant) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((count ?? 0) <= 1) {
        throw new Error("Cannot remove the last super admin");
      }
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: data.userId,
        role: data.role,
        organisation_id: data.organisationId ?? null,
      });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      let q = supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (data.organisationId) q = q.eq("organisation_id", data.organisationId);
      else q = q.is("organisation_id", null);
      const { error } = await q;
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .select("id, user_id, table_name, record_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data;
  });

// ---------------- Taylor settings & training ----------------

export const getTaylorSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("taylor_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const taylorSettingsSchema = z.object({
  display_name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(200).optional().nullable(),
  avatar_url: z.string().trim().max(1000).optional().nullable(),
  voice: z.string().trim().min(1).max(40),
  personality_traits: z.string().trim().max(2000).optional().nullable(),
  system_prompt_addon: z.string().trim().max(6000).optional().nullable(),
  temperature: z.number().min(0).max(2),
  is_active: z.boolean(),
});

export const updateTaylorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taylorSettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("taylor_settings")
      .update({
        display_name: data.display_name,
        tagline: data.tagline || null,
        avatar_url: data.avatar_url || null,
        voice: data.voice,
        personality_traits: data.personality_traits || null,
        system_prompt_addon: data.system_prompt_addon || null,
        temperature: data.temperature,
        is_active: data.is_active,
      })
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTaylorTraining = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("taylor_training_examples")
      .select("id, prompt, ideal_response, category, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const trainingSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  ideal_response: z.string().trim().min(1).max(4000),
  category: z.string().trim().max(60).optional().nullable(),
});

export const createTaylorTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => trainingSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("taylor_training_examples").insert({
      prompt: data.prompt,
      ideal_response: data.ideal_response,
      category: data.category || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleTaylorTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("taylor_training_examples")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTaylorTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("taylor_training_examples")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

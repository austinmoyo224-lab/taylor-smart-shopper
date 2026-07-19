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

const updateOrgSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  type: z.enum(["retail_group", "brand", "partner", "independent"]),
  country_code: z.string().length(2),
  default_currency: z.string().length(3),
  contact_email: z.string().email().optional().or(z.literal("")).nullable(),
  is_active: z.boolean(),
});

export const updateOrganisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateOrgSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("organisations")
      .update({
        name: data.name,
        slug: data.slug,
        type: data.type,
        country_code: data.country_code,
        default_currency: data.default_currency,
        contact_email: data.contact_email || null,
        is_active: data.is_active,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrganisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("organisations")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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

// ---------------- AI usage dashboard ----------------

const aiUsageRangeSchema = z
  .object({ days: z.number().int().min(1).max(90).optional().default(14) })
  .optional()
  .default({ days: 14 });

export const getAiUsageSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => aiUsageRangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = data?.days ?? 14;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("ai_usage_events")
      .select("operation, credits, created_at, user_id, model, audio_seconds, total_tokens")
      .gte("created_at", since)
      .limit(50000);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const totalCredits = list.reduce((a, r) => a + Number(r.credits ?? 0), 0);
    const byOp = new Map<string, { credits: number; count: number }>();
    const dailyMap = new Map<
      string,
      { date: string; chat: number; stt: number; tts: number; vision: number }
    >();
    const users = new Set<string>();
    for (const r of list) {
      const op = r.operation;
      const c = Number(r.credits ?? 0);
      const b = byOp.get(op) ?? { credits: 0, count: 0 };
      b.credits += c;
      b.count += 1;
      byOp.set(op, b);
      if (r.user_id) users.add(r.user_id);
      const day = new Date(r.created_at as string).toISOString().slice(0, 10);
      const d = dailyMap.get(day) ?? { date: day, chat: 0, stt: 0, tts: 0, vision: 0 };
      if (op === "chat" || op === "stt" || op === "tts" || op === "vision") {
        d[op] += c;
      }
      dailyMap.set(day, d);
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return {
      days,
      totalCredits,
      totalCalls: list.length,
      uniqueUsers: users.size,
      byOperation: Array.from(byOp.entries()).map(([operation, v]) => ({
        operation,
        credits: v.credits,
        count: v.count,
      })),
      daily,
    };
  });

export const getAiUsageTopUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => aiUsageRangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = data?.days ?? 14;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("ai_usage_events")
      .select("user_id, operation, credits")
      .gte("created_at", since)
      .not("user_id", "is", null)
      .limit(50000);
    if (error) throw new Error(error.message);
    const byUser = new Map<
      string,
      { userId: string; credits: number; calls: number; chat: number; stt: number; tts: number; vision: number }
    >();
    for (const r of rows ?? []) {
      if (!r.user_id) continue;
      const b =
        byUser.get(r.user_id) ??
        { userId: r.user_id, credits: 0, calls: 0, chat: 0, stt: 0, tts: 0, vision: 0 };
      const c = Number(r.credits ?? 0);
      b.credits += c;
      b.calls += 1;
      const op = r.operation;
      if (op === "chat" || op === "stt" || op === "tts" || op === "vision") {
        b[op] += c;
      }
      byUser.set(r.user_id, b);
    }
    const top = Array.from(byUser.values())
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 25);
    const ids = top.map((t) => t.userId);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, first_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const nameOf = new Map<string, string>();
    (profiles ?? []).forEach((p) =>
      nameOf.set(p.id, p.display_name || p.first_name || p.email || p.id.slice(0, 8)),
    );
    return top.map((t) => ({ ...t, name: nameOf.get(t.userId) ?? t.userId.slice(0, 8) }));
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

// ---------------- Taylor Knowledge Base ----------------

export const listTaylorKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("taylor_knowledge")
      .select("id, title, content, category, tags, source_url, is_active, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const knowledgeUpsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
  category: z.string().trim().max(60).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  source_url: z.string().trim().max(1000).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const upsertTaylorKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => knowledgeUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      title: data.title,
      content: data.content,
      category: data.category || null,
      tags: data.tags ?? [],
      source_url: data.source_url || null,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("taylor_knowledge")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("taylor_knowledge")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteTaylorKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("taylor_knowledge")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Document Vault ----------------

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

export const listVaultFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage
      .from("admin-vault")
      .list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    const files = (data ?? []).filter((f) => f.name && f.id);
    const paths = files.map((f) => f.name);
    let urls: Record<string, string> = {};
    if (paths.length) {
      const { data: signed, error: sErr } = await supabaseAdmin.storage
        .from("admin-vault")
        .createSignedUrls(paths, SIGNED_URL_TTL);
      if (sErr) throw new Error(sErr.message);
      urls = Object.fromEntries(
        (signed ?? [])
          .filter((s): s is { path: string; signedUrl: string; error: null } => !!s.path)
          .map((s) => [s.path, s.signedUrl]),
      );
    }
    return files.map((f) => ({
      name: f.name,
      size: (f.metadata as { size?: number } | null)?.size ?? 0,
      mime: (f.metadata as { mimetype?: string } | null)?.mimetype ?? "",
      created_at: f.created_at,
      url: urls[f.name] ?? "",
    }));
  });

const uploadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contentBase64: z.string().min(1),
  contentType: z.string().trim().min(1).max(200),
});

export const uploadVaultFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buffer = Buffer.from(data.contentBase64, "base64");
    if (buffer.byteLength > 50 * 1024 * 1024) throw new Error("File exceeds 50MB");
    const safe = data.name.replace(/[^\w.\-]+/g, "_");
    const path = `${Date.now()}-${safe}`;
    const { error } = await supabaseAdmin.storage
      .from("admin-vault")
      .upload(path, buffer, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("admin-vault")
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (sErr) throw new Error(sErr.message);
    return { name: path, url: signed.signedUrl };
  });

export const deleteVaultFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("admin-vault").remove([data.name]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

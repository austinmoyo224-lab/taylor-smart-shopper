import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: super_admin role required");
}

async function writeAudit(
  userId: string,
  recordId: string,
  action: string,
  changed: Record<string, unknown>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_log").insert({
    user_id: userId,
    table_name: "delivery_riders",
    record_id: recordId,
    action,
    changed_data: changed as never,
  });
}

export const listRiders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("delivery_riders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("verification_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const emails = new Map<string, string | null>();
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);
      for (const p of profs ?? []) emails.set(p.id, p.email ?? p.display_name ?? null);
    }
    return (rows ?? []).map((r) => ({ ...r, submitter_email: emails.get(r.user_id) ?? null }));
  });

export const approveRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), notes: z.string().max(1000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("delivery_riders")
      .update({
        verification_status: "approved",
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: context.userId,
        rejection_reason: null,
      })
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context.userId, row.id, "approve_rider", { notes: data.notes ?? null });
    return { ok: true };
  });

export const rejectRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), notes: z.string().max(1000).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("delivery_riders")
      .update({
        verification_status: "rejected",
        is_verified: false,
        rejection_reason: data.notes ?? null,
      })
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(context.userId, row.id, "reject_rider", { notes: data.notes ?? null });
    return { ok: true };
  });

export const listRiderAuditHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ riderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("audit_log")
      .select("id, user_id, action, changed_data, created_at")
      .eq("table_name", "delivery_riders")
      .eq("record_id", data.riderId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const reviewerIds = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean) as string[]));
    const emails = new Map<string, string | null>();
    if (reviewerIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email, display_name")
        .in("id", reviewerIds);
      for (const p of profs ?? []) emails.set(p.id, p.email ?? p.display_name ?? null);
    }
    return (rows ?? []).map((r) => ({
      ...r,
      reviewer_email: r.user_id ? emails.get(r.user_id) ?? null : null,
    }));
  });
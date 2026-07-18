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

const requestSchema = z.object({
  business_name: z.string().trim().min(2).max(200),
  trading_name: z.string().trim().max(200).optional().or(z.literal("")),
  business_type: z.enum(["independent", "retail_group", "brand", "partner"]).default("independent"),
  business_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().trim().max(30).optional().or(z.literal("")),
  proposed_slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  store_name: z.string().trim().min(2).max(200),
  store_address: z.string().trim().max(300).optional().or(z.literal("")),
  store_city: z.string().trim().max(120).optional().or(z.literal("")),
  store_province: z.string().trim().max(120).optional().or(z.literal("")),
  trading_hours: z.record(z.string(), z.string()).default({}),
  logo_url: z.string().url().optional().or(z.literal("")),
  brand_color: z.string().trim().max(20).optional().or(z.literal("")),
  short_description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const submitStoreOnboardingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reject if user already has a pending request
    const { data: existing } = await supabaseAdmin
      .from("store_onboarding_requests")
      .select("id, status")
      .eq("user_id", context.userId)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing?.status === "pending") throw new Error("You already have a pending request.");
    if (existing?.status === "approved")
      throw new Error("You've already been approved as a store owner.");

    const { data: row, error } = await supabaseAdmin
      .from("store_onboarding_requests")
      .insert({
        user_id: context.userId,
        business_name: data.business_name,
        trading_name: data.trading_name || null,
        business_type: data.business_type,
        business_email: data.business_email || null,
        contact_phone: data.contact_phone || null,
        proposed_slug: data.proposed_slug,
        store_name: data.store_name,
        store_address: data.store_address || null,
        store_city: data.store_city || null,
        store_province: data.store_province || null,
        trading_hours: data.trading_hours,
        logo_url: data.logo_url || null,
        brand_color: data.brand_color || null,
        short_description: data.short_description || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Flip caller's profile account_type to store_owner
    await supabaseAdmin
      .from("profiles")
      .update({ account_type: "store_owner" })
      .eq("id", context.userId);

    return { id: row.id };
  });

export const getMyStoreOnboardingRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("store_onboarding_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

export const listStoreOnboardingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("store_onboarding_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Enrich with submitter email
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const emails = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email, display_name")
        .in("id", ids);
      for (const p of profs ?? []) emails.set(p.id, p.email ?? p.display_name ?? null);
    }
    return (rows ?? []).map((r) => ({ ...r, submitter_email: emails.get(r.user_id) ?? null }));
  });

export const approveStoreOnboardingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), notes: z.string().max(1000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("store_onboarding_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (reqErr || !req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request is not pending");

    // Ensure slug is free
    const { data: slugTaken } = await supabaseAdmin
      .from("organisations")
      .select("id")
      .eq("slug", req.proposed_slug)
      .maybeSingle();
    if (slugTaken) throw new Error(`Organisation slug "${req.proposed_slug}" is already taken.`);

    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organisations")
      .insert({
        name: req.business_name,
        slug: req.proposed_slug,
        type: req.business_type as "independent" | "retail_group" | "brand" | "partner",
        country_code: "ZA",
        default_currency: "ZAR",
        contact_email: req.business_email,
      })
      .select("id")
      .single();
    if (orgErr) throw new Error(orgErr.message);

    const storeSlug = req.proposed_slug + "-main";
    const { data: store, error: storeErr } = await supabaseAdmin
      .from("stores")
      .insert({
        organisation_id: org.id,
        name: req.store_name,
        slug: storeSlug,
        city: req.store_city,
        country_code: "ZA",
        status: "active",
      })
      .select("id")
      .single();
    if (storeErr) throw new Error(storeErr.message);

    // Grant retailer_admin
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: req.user_id, role: "retailer_admin", organisation_id: org.id });

    await supabaseAdmin
      .from("store_onboarding_requests")
      .update({
        status: "approved",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        admin_notes: data.notes ?? null,
        organisation_id: org.id,
        store_id: store.id,
      })
      .eq("id", data.id);

    return { ok: true, organisationId: org.id, storeId: store.id };
  });

export const rejectStoreOnboardingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), notes: z.string().max(1000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("store_onboarding_requests")
      .update({
        status: "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        admin_notes: data.notes ?? null,
      })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
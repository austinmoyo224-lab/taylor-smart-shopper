import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Category =
  | "promotion"
  | "coupon"
  | "expiry_alert"
  | "weather"
  | "recipe"
  | "reminder"
  | "campaign"
  | "life_moment"
  | "system";

// ----------- SUBSCRIBER: read + mark ------------

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select(
        "id, category, channel, status, title, body, payload, related_store_id, related_promotion_id, related_coupon_id, delivered_at, read_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const countUnreadNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { unread: count ?? 0 };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString(), status: "read" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read_at: now, status: "read" })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------- PORTAL: campaigns + delivery ------------

async function assertOrgAccess(userId: string, orgId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role, organisation_id")
    .eq("user_id", userId);
  const ok = (data ?? []).some(
    (r) =>
      r.role === "super_admin" ||
      ((r.role === "retailer_admin" || r.role === "store_manager") && r.organisation_id === orgId),
  );
  if (!ok) throw new Error("Forbidden");
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ organisation_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("campaigns")
      .select(
        "id, name, scope, store_id, is_active, starts_at, ends_at, audience, schedule, metadata, created_at, stores(name)",
      )
      .eq("organisation_id", data.organisation_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createCampaignSchema = z.object({
  organisation_id: z.string().uuid(),
  store_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(200),
  scope: z.enum(["store", "brand", "promotion", "push"]).default("store"),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(500).optional().or(z.literal("")),
  category: z
    .enum(["promotion", "coupon", "campaign", "recipe", "reminder", "system"])
    .default("campaign"),
  send_now: z.boolean().default(false),
});

/** Creates a campaign row. If send_now, fans out an in-app notification to
 *  every currently-active subscriber of the campaign's store (or all subscribers
 *  when store_id is null). Returns the delivered count. */
export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createCampaignSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgAccess(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: camp, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        organisation_id: data.organisation_id,
        store_id: data.store_id ?? null,
        name: data.name,
        scope: data.scope,
        audience: {},
        schedule: { title: data.title, body: data.body ?? "", category: data.category },
        is_active: data.send_now,
        starts_at: data.send_now ? new Date().toISOString() : undefined,
      })
      .select("id")
      .single();
    if (error || !camp) throw new Error(error?.message ?? "Failed to create");

    let delivered = 0;
    if (data.send_now) {
      delivered = await deliverCampaign({
        campaignId: camp.id,
        orgId: data.organisation_id,
        storeId: data.store_id ?? null,
        title: data.title,
        body: data.body ?? "",
        category: data.category as Category,
      });
    }
    return { id: camp.id, delivered };
  });

async function deliverCampaign(opts: {
  campaignId: string;
  orgId: string;
  storeId: string | null;
  title: string;
  body: string;
  category: Category;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Find target subscribers.
  let subs: { user_id: string }[] = [];
  if (opts.storeId) {
    const { data } = await supabaseAdmin
      .from("subscriber_store_subs")
      .select("user_id")
      .eq("target_type", "store")
      .eq("target_id", opts.storeId)
      .eq("is_active", true);
    subs = data ?? [];
  } else {
    // Org-wide: everyone who follows ANY store of this org.
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("organisation_id", opts.orgId)
      .is("deleted_at", null);
    const storeIds = (stores ?? []).map((s) => s.id);
    if (storeIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("subscriber_store_subs")
        .select("user_id")
        .eq("target_type", "store")
        .in("target_id", storeIds)
        .eq("is_active", true);
      subs = data ?? [];
    }
  }
  // Dedup
  const users = Array.from(new Set(subs.map((s) => s.user_id)));
  if (users.length === 0) return 0;

  // Respect per-user in_app preference (default true when no row).
  const { data: prefs } = await supabaseAdmin
    .from("notification_prefs")
    .select("user_id, in_app")
    .in("user_id", users);
  const optedOut = new Set((prefs ?? []).filter((p) => p.in_app === false).map((p) => p.user_id));
  const targets = users.filter((u) => !optedOut.has(u));
  if (targets.length === 0) return 0;

  const now = new Date().toISOString();
  const rows = targets.map((uid) => ({
    user_id: uid,
    category: opts.category,
    channel: "in_app" as const,
    status: "delivered" as const,
    title: opts.title,
    body: opts.body || null,
    delivered_at: now,
    related_store_id: opts.storeId,
    payload: { campaign_id: opts.campaignId },
  }));
  // Insert in chunks to keep payload sane.
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

export const sendCampaignNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: camp } = await supabaseAdmin
      .from("campaigns")
      .select("id, organisation_id, store_id, schedule")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!camp) throw new Error("Campaign not found");
    await assertOrgAccess(context.userId, camp.organisation_id);
    const sched =
      (camp.schedule as {
        title?: string;
        body?: string;
        category?: Category;
      }) ?? {};
    const delivered = await deliverCampaign({
      campaignId: camp.id,
      orgId: camp.organisation_id,
      storeId: camp.store_id ?? null,
      title: sched.title ?? "New from Taylor",
      body: sched.body ?? "",
      category: (sched.category ?? "campaign") as Category,
    });
    await supabaseAdmin
      .from("campaigns")
      .update({ is_active: true, starts_at: new Date().toISOString() })
      .eq("id", camp.id);
    return { delivered };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOrgStaff(userId: string, orgId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role, organisation_id")
    .eq("user_id", userId);
  const ok = (data ?? []).some(
    (r) =>
      r.role === "super_admin" ||
      ((r.role === "retailer_admin" || r.role === "store_manager") &&
        r.organisation_id === orgId),
  );
  if (!ok) throw new Error("Forbidden");
}

function genCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

/** Credit/debit points and write a ledger row. Uses service role. */
async function awardPoints(opts: {
  user_id: string;
  organisation_id: string;
  points: number;
  reason: string;
  ref_type?: string | null;
  ref_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Ensure account exists
  await supabaseAdmin
    .from("loyalty_accounts")
    .upsert(
      { user_id: opts.user_id, organisation_id: opts.organisation_id, points: 0 },
      { onConflict: "user_id,organisation_id", ignoreDuplicates: true },
    );
  const { data: acc, error: aErr } = await supabaseAdmin
    .from("loyalty_accounts")
    .select("points")
    .eq("user_id", opts.user_id)
    .eq("organisation_id", opts.organisation_id)
    .maybeSingle();
  if (aErr || !acc) throw new Error(aErr?.message ?? "Loyalty account missing");
  const newBalance = Number(acc.points) + opts.points;
  if (newBalance < 0) throw new Error("Insufficient loyalty points");
  const { error: uErr } = await supabaseAdmin
    .from("loyalty_accounts")
    .update({ points: newBalance })
    .eq("user_id", opts.user_id)
    .eq("organisation_id", opts.organisation_id);
  if (uErr) throw new Error(uErr.message);
  const { error: tErr } = await supabaseAdmin.from("loyalty_transactions").insert({
    user_id: opts.user_id,
    organisation_id: opts.organisation_id,
    points: opts.points,
    balance_after: newBalance,
    reason: opts.reason,
    reference_type: opts.ref_type ?? null,
    reference_id: opts.ref_id ?? null,
    metadata: opts.metadata ?? {},
  });
  if (tErr) throw new Error(tErr.message);
  return newBalance;
}

// ---------- Shopper ----------

export const getMyLoyalty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: accounts } = await supabaseAdmin
      .from("loyalty_accounts")
      .select("id, organisation_id, points, tier, updated_at, organisations:organisation_id (name, slug, logo_url)")
      .eq("user_id", context.userId);
    const { data: tx } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("id, organisation_id, points, balance_after, reason, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      accounts: (accounts ?? []).map((a: any) => ({
        id: a.id,
        organisation_id: a.organisation_id,
        points: Number(a.points),
        tier: a.tier,
        org_name: a.organisations?.name ?? "Store",
        org_logo: a.organisations?.logo_url ?? null,
      })),
      transactions: tx ?? [],
    };
  });

export const listRewardsForOrg = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ organisation_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("rewards")
      .select("id, title, description, points_cost, image_url, stock, terms, is_active")
      .eq("organisation_id", data.organisation_id)
      .eq("is_active", true)
      .order("points_cost");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reward_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reward, error: rErr } = await supabaseAdmin
      .from("rewards")
      .select("id, organisation_id, points_cost, stock, is_active, title")
      .eq("id", data.reward_id)
      .maybeSingle();
    if (rErr || !reward) throw new Error("Reward not found");
    if (!reward.is_active) throw new Error("Reward unavailable");
    if (reward.stock !== null && reward.stock <= 0) throw new Error("Out of stock");

    await awardPoints({
      user_id: context.userId,
      organisation_id: reward.organisation_id,
      points: -Number(reward.points_cost),
      reason: `Redeemed: ${reward.title}`,
      ref_type: "reward",
      ref_id: reward.id,
    });

    const code = genCode();
    const { data: red, error: redErr } = await supabaseAdmin
      .from("reward_redemptions")
      .insert({
        reward_id: reward.id,
        user_id: context.userId,
        organisation_id: reward.organisation_id,
        points_spent: reward.points_cost,
        code,
      })
      .select("id, code")
      .single();
    if (redErr) throw new Error(redErr.message);

    if (reward.stock !== null) {
      await supabaseAdmin
        .from("rewards")
        .update({ stock: reward.stock - 1 })
        .eq("id", reward.id);
    }
    return red;
  });

export const listMyRedemptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("reward_redemptions")
      .select("id, code, status, points_spent, created_at, rewards:reward_id (title, image_url)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      points_spent: Number(r.points_spent),
      created_at: r.created_at,
      title: r.rewards?.title ?? "Reward",
      image_url: r.rewards?.image_url ?? null,
    }));
  });

// ---------- Retailer portal ----------

export const listOrgRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ organisation_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOrgStaff(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("rewards")
      .select("id, title, description, points_cost, stock, image_url, is_active, terms, created_at")
      .eq("organisation_id", data.organisation_id)
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

export const upsertReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        organisation_id: z.string().uuid(),
        title: z.string().min(1).max(160),
        description: z.string().max(1000).optional().nullable(),
        points_cost: z.number().positive(),
        stock: z.number().int().nonnegative().nullable().optional(),
        image_url: z.string().url().optional().nullable(),
        terms: z.string().max(1000).optional().nullable(),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOrgStaff(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      organisation_id: data.organisation_id,
      title: data.title,
      description: data.description ?? null,
      points_cost: data.points_cost,
      stock: data.stock ?? null,
      image_url: data.image_url ?? null,
      terms: data.terms ?? null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("rewards").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("rewards")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), organisation_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOrgStaff(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("rewards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const awardPointsToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        organisation_id: z.string().uuid(),
        user_query: z.string().min(3).max(200), // email or phone
        points: z.number(),
        reason: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOrgStaff(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.user_query.trim().toLowerCase();
    const { data: matches } = await supabaseAdmin
      .from("profiles")
      .select("id, email, phone, display_name")
      .or(`email.eq.${q},phone.eq.${data.user_query.trim()}`)
      .limit(1);
    const target = matches?.[0];
    if (!target) throw new Error("Shopper not found");

    await awardPoints({
      user_id: target.id,
      organisation_id: data.organisation_id,
      points: data.points,
      reason: data.reason,
      ref_type: "manual_award",
      metadata: { awarded_by: context.userId },
    });
    return { ok: true, user: { id: target.id, name: target.display_name ?? target.email } };
  });

export const listOrgLoyaltyLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ organisation_id: z.string().uuid(), limit: z.number().max(200).default(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOrgStaff(context.userId, data.organisation_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("id, user_id, points, balance_after, reason, created_at, profiles:user_id (display_name, email)")
      .eq("organisation_id", data.organisation_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.profiles?.display_name || r.profiles?.email || r.user_id.slice(0, 8),
      points: Number(r.points),
      balance_after: Number(r.balance_after),
      reason: r.reason,
      created_at: r.created_at,
    }));
  });
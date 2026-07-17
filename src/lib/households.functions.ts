import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const listMyHouseholds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: memberships, error } = await context.supabase
      .from("household_members")
      .select("household_id, role, households:household_id (id, name, owner_user_id, created_at)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (memberships ?? []).map((m: any) => ({
      id: m.households.id as string,
      name: m.households.name as string,
      role: m.role as string,
      isOwner: m.households.owner_user_id === context.userId,
    }));
  });

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: hh, error } = await context.supabase
      .from("households")
      .insert({ name: data.name, owner_user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: memErr } = await context.supabase
      .from("household_members")
      .insert({ household_id: hh.id, user_id: context.userId, role: "owner" });
    if (memErr) throw new Error(memErr.message);
    return { id: hh.id };
  });

export const getHousehold = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: hh }, { data: members }, { data: invites }] = await Promise.all([
      context.supabase
        .from("households")
        .select("id, name, owner_user_id, created_at")
        .eq("id", data.id)
        .maybeSingle(),
      context.supabase
        .from("household_members")
        .select("user_id, role, created_at, profiles:user_id (display_name, first_name, email)")
        .eq("household_id", data.id),
      context.supabase
        .from("household_invites")
        .select("id, code, expires_at, used_at, used_by, created_at")
        .eq("household_id", data.id)
        .is("used_at", null)
        .order("created_at", { ascending: false }),
    ]);
    if (!hh) return null;
    return {
      household: hh,
      isOwner: hh.owner_user_id === context.userId,
      members: (members ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        name:
          m.profiles?.display_name ||
          m.profiles?.first_name ||
          m.profiles?.email ||
          "Member",
      })),
      invites: invites ?? [],
    };
  });

export const createHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ householdId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const code = genCode() + genCode().slice(0, 2);
    const { data: row, error } = await context.supabase
      .from("household_invites")
      .insert({
        household_id: data.householdId,
        code,
        invited_by: context.userId,
      })
      .select("id, code, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const acceptHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(4).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Look up invite with admin (invite is scoped to a household the user isn't in yet).
    const { data: invite, error } = await supabaseAdmin
      .from("household_invites")
      .select("id, household_id, expires_at, used_at")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.used_at) throw new Error("Invite already used");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite expired");

    const { error: joinErr } = await supabaseAdmin
      .from("household_members")
      .insert({ household_id: invite.household_id, user_id: context.userId, role: "member" });
    if (joinErr && !joinErr.message.includes("duplicate")) throw new Error(joinErr.message);

    await supabaseAdmin
      .from("household_invites")
      .update({ used_at: new Date().toISOString(), used_by: context.userId })
      .eq("id", invite.id);

    return { householdId: invite.household_id };
  });

export const leaveHousehold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ householdId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("household_members")
      .delete()
      .eq("household_id", data.householdId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeHouseholdMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ householdId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS ensures only the owner can remove others
    const { error } = await context.supabase
      .from("household_members")
      .delete()
      .eq("household_id", data.householdId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const shareListWithHousehold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        listId: z.string().uuid(),
        householdId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shopping_lists")
      .update({ household_id: data.householdId })
      .eq("id", data.listId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sharePantryWithHousehold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ householdId: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Move ALL of my personal pantry items into (or out of) the household
    const { error } = await context.supabase
      .from("pantry_items")
      .update({ household_id: data.householdId })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
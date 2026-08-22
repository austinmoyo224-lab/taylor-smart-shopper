import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in user's account and all personal data.
 * The caller must type DELETE to confirm.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;

    // Tables keyed by user_id, deleted child-first where relevant.
    const userTables = [
      "messages",
      "conversations",
      "shopping_lists",
      "pantry_items",
      "recipes",
      "recipe_share_events",
      "vision_scans",
      "life_moments",
      "subscriber_memory",
      "subscriber_store_subs",
      "notifications",
      "notification_prefs",
      "push_subscriptions",
      "taylor_reminders",
      "loyalty_transactions",
      "loyalty_accounts",
      "coupon_redemptions",
      "reward_redemptions",
      "store_broadcast_recipients",
      "store_conversation_messages",
      "store_conversations",
      "store_orders",
      "store_onboarding_requests",
      "store_staff",
      "household_members",
      "delivery_riders",
      "whatsapp_bindings",
      "payments",
      "ai_usage_events",
      "audit_log",
      "user_roles",
    ] as const;

    for (const table of userTables) {
      await (supabaseAdmin as any).from(table).delete().eq("user_id", uid);
    }

    // Households owned by the user
    await (supabaseAdmin as any).from("households").delete().eq("owner_user_id", uid);

    // Profile row is keyed by the auth user id
    await (supabaseAdmin as any).from("profiles").delete().eq("id", uid);

    // Stored avatars / uploads
    try {
      const { data: files } = await supabaseAdmin.storage.from("avatars").list(uid);
      if (files?.length) {
        await supabaseAdmin.storage
          .from("avatars")
          .remove(files.map((f) => `${uid}/${f.name}`));
      }
    } catch {
      // storage cleanup is best-effort
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

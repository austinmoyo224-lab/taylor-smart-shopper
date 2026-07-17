import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const VAPID_PUBLIC_KEY =
  "BBADZBDkVV8_UozNna5Kd8Ylo5Mg9cMiXQo1INJmCmAr9kQVh5NFM9LEpJEN8yyifjKwpX1M5hlV3yG7bgOYXlo";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  key: VAPID_PUBLIC_KEY,
}));

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  user_agent: z.string().max(500).optional().nullable(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.user_agent ?? null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyPushSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("push_subscriptions")
      .select("id, endpoint, user_agent, created_at, last_used_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/** Send a test push to the caller. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("./push.server");
    const n = await sendPushToUser(context.userId, {
      title: "Taylor is connected",
      body: "You'll now get deal alerts and reminders on this device.",
      url: "/notifications",
    });
    return { sent: n };
  });
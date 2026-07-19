import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Attachment = {
  type: "catalog_pdf" | "flyer_image" | "coupon" | "promotion";
  url?: string | null;
  name?: string | null;
  coupon_id?: string | null;
  promotion_id?: string | null;
};

const attachmentSchema = z.object({
  type: z.enum(["catalog_pdf", "flyer_image", "coupon", "promotion"]),
  url: z.string().url().max(2000).optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  coupon_id: z.string().uuid().optional().nullable(),
  promotion_id: z.string().uuid().optional().nullable(),
});

async function assertCanManageStore(userId: string, storeId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("can_manage_store", {
    _user_id: userId,
    _store_id: storeId,
  });
  if (!data) throw new Error("Forbidden");
}

// ---------- STORE SIDE ----------

export const listStoreBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageStore(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("store_broadcasts")
      .select("id, title, body, attachments, sent_at, created_at")
      .eq("store_id", data.store_id)
      .is("deleted_at", null)
      .order("sent_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    // recipient stats per broadcast
    const ids = (rows ?? []).map((r) => r.id);
    let stats: Record<string, { total: number; read: number; clicked: number; redeemed: number }> = {};
    if (ids.length > 0) {
      const { data: recs } = await supabaseAdmin
        .from("store_broadcast_recipients")
        .select("broadcast_id, read_at, clicked_at, redeemed_at")
        .in("broadcast_id", ids);
      for (const r of recs ?? []) {
        const s = stats[r.broadcast_id] ?? { total: 0, read: 0, clicked: 0, redeemed: 0 };
        s.total++;
        if (r.read_at) s.read++;
        if (r.clicked_at) s.clicked++;
        if (r.redeemed_at) s.redeemed++;
        stats[r.broadcast_id] = s;
      }
    }
    return (rows ?? []).map((r) => ({ ...r, stats: stats[r.id] ?? { total: 0, read: 0, clicked: 0, redeemed: 0 } }));
  });

export const createStoreBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        store_id: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        body: z.string().max(2000).optional().or(z.literal("")),
        attachments: z.array(attachmentSchema).max(10).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageStore(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: store, error: sErr } = await supabaseAdmin
      .from("stores")
      .select("id, organisation_id")
      .eq("id", data.store_id)
      .single();
    if (sErr || !store) throw new Error("Store not found");

    const { data: bc, error } = await supabaseAdmin
      .from("store_broadcasts")
      .insert({
        store_id: data.store_id,
        organisation_id: store.organisation_id,
        sender_user_id: context.userId,
        title: data.title,
        body: data.body || null,
        attachments: data.attachments,
      })
      .select("id")
      .single();
    if (error || !bc) throw new Error(error?.message ?? "Failed");

    // fanout to followers
    const { data: subs } = await supabaseAdmin
      .from("subscriber_store_subs")
      .select("user_id")
      .eq("target_type", "store")
      .eq("target_id", data.store_id)
      .eq("is_active", true);
    const users = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
    if (users.length > 0) {
      const rows = users.map((uid) => ({
        broadcast_id: bc.id,
        user_id: uid,
        store_id: data.store_id,
      }));
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await supabaseAdmin.from("store_broadcast_recipients").insert(rows.slice(i, i + CHUNK));
      }

      // Push notification (best-effort)
      try {
        const { sendPushToUsers } = await import("./push.server");
        await sendPushToUsers(users, {
          title: data.title,
          body: data.body || "New from your store",
          url: `/inbox/${data.store_id}`,
          tag: `broadcast-${bc.id}`,
          data: { broadcast_id: bc.id, store_id: data.store_id },
        });
      } catch (e) {
        console.error("[push] broadcast fanout failed", e);
      }
    }
    return { id: bc.id, delivered: users.length };
  });

export const getBroadcastRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ broadcast_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bc } = await supabaseAdmin
      .from("store_broadcasts")
      .select("store_id, title, sent_at")
      .eq("id", data.broadcast_id)
      .single();
    if (!bc) throw new Error("Not found");
    await assertCanManageStore(context.userId, bc.store_id);
    const { data: recs } = await supabaseAdmin
      .from("store_broadcast_recipients")
      .select("user_id, delivered_at, read_at, clicked_at, redeemed_at")
      .eq("broadcast_id", data.broadcast_id)
      .order("delivered_at", { ascending: false });

    const userIds = (recs ?? []).map((r) => r.user_id);
    const profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      for (const p of profs ?? []) {
        profiles[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      }
    }
    return {
      broadcast: bc,
      recipients: (recs ?? []).map((r) => ({ ...r, profile: profiles[r.user_id] ?? null })),
    };
  });

export const listStoreConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageStore(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("store_conversations")
      .select("id, user_id, last_message_at, last_message_preview, unread_for_store")
      .eq("store_id", data.store_id)
      .order("last_message_at", { ascending: false })
      .limit(200);
    const userIds = (rows ?? []).map((r) => r.user_id);
    const profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      for (const p of profs ?? []) {
        profiles[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      }
    }
    return (rows ?? []).map((r) => ({ ...r, profile: profiles[r.user_id] ?? null }));
  });

export const getStoreConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversation_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv } = await supabaseAdmin
      .from("store_conversations")
      .select("id, store_id, user_id, last_message_at")
      .eq("id", data.conversation_id)
      .single();
    if (!conv) throw new Error("Not found");
    await assertCanManageStore(context.userId, conv.store_id);
    const { data: msgs } = await supabaseAdmin
      .from("store_conversation_messages")
      .select("id, sender_type, body, attachments, created_at, read_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true });
    // Mark all user-sent messages read
    await supabaseAdmin
      .from("store_conversation_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversation_id)
      .eq("sender_type", "user")
      .is("read_at", null);
    await supabaseAdmin
      .from("store_conversations")
      .update({ unread_for_store: 0 })
      .eq("id", data.conversation_id);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", conv.user_id)
      .maybeSingle();
    return { conversation: conv, messages: msgs ?? [], profile: prof ?? null };
  });

// ---------- SHARED SEND MESSAGE (store OR user) ----------

/** Store replies to a specific follower. Creates the conversation if needed. */
export const storeReplyToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        store_id: z.string().uuid(),
        user_id: z.string().uuid(),
        body: z.string().max(2000).optional().or(z.literal("")),
        attachments: z.array(attachmentSchema).max(10).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageStore(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const conv = await upsertConversation(supabaseAdmin, data.store_id, data.user_id);
    const preview = (data.body || summarizeAttachments(data.attachments)).slice(0, 140);
    const { error } = await supabaseAdmin.from("store_conversation_messages").insert({
      conversation_id: conv.id,
      store_id: data.store_id,
      user_id: data.user_id,
      sender_type: "store",
      sender_user_id: context.userId,
      body: data.body || null,
      attachments: data.attachments,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("store_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        unread_for_user: (conv.unread_for_user ?? 0) + 1,
      })
      .eq("id", conv.id);

    // Push
    try {
      const { sendPushToUsers } = await import("./push.server");
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("name")
        .eq("id", data.store_id)
        .single();
      await sendPushToUsers([data.user_id], {
        title: store?.name ?? "Store message",
        body: preview,
        url: `/inbox/${data.store_id}`,
        tag: `store-msg-${data.store_id}`,
      });
    } catch (e) {
      console.error("[push] store reply failed", e);
    }
    return { conversation_id: conv.id };
  });

/** Follower replies to a store. */
export const userReplyToStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        store_id: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const conv = await upsertConversation(supabaseAdmin, data.store_id, context.userId);
    const { error } = await supabaseAdmin.from("store_conversation_messages").insert({
      conversation_id: conv.id,
      store_id: data.store_id,
      user_id: context.userId,
      sender_type: "user",
      sender_user_id: context.userId,
      body: data.body,
      attachments: [],
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("store_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: data.body.slice(0, 140),
        unread_for_store: (conv.unread_for_store ?? 0) + 1,
      })
      .eq("id", conv.id);
    return { conversation_id: conv.id };
  });

// ---------- SUBSCRIBER INBOX ----------

export const listMyInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Broadcasts I received
    const { data: recs } = await supabaseAdmin
      .from("store_broadcast_recipients")
      .select("broadcast_id, store_id, delivered_at, read_at, clicked_at")
      .eq("user_id", context.userId)
      .order("delivered_at", { ascending: false })
      .limit(100);
    const bcIds = (recs ?? []).map((r) => r.broadcast_id);
    const storeIds = new Set<string>((recs ?? []).map((r) => r.store_id));

    let broadcasts: Array<{
      id: string;
      store_id: string;
      title: string;
      body: string | null;
      attachments: Attachment[];
      sent_at: string;
      read_at: string | null;
    }> = [];
    if (bcIds.length > 0) {
      const { data: bcs } = await supabaseAdmin
        .from("store_broadcasts")
        .select("id, store_id, title, body, attachments, sent_at")
        .in("id", bcIds)
        .is("deleted_at", null);
      const readMap = new Map((recs ?? []).map((r) => [r.broadcast_id, r.read_at]));
      broadcasts = (bcs ?? []).map((b) => ({
        ...b,
        attachments: (b.attachments as unknown as Attachment[]) ?? [],
        read_at: readMap.get(b.id) ?? null,
      }));
      broadcasts.sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
    }

    // Conversations I have
    const { data: convs } = await supabaseAdmin
      .from("store_conversations")
      .select("id, store_id, last_message_at, last_message_preview, unread_for_user")
      .eq("user_id", context.userId)
      .order("last_message_at", { ascending: false });
    for (const c of convs ?? []) storeIds.add(c.store_id);

    const storeInfo: Record<string, { name: string; logo_url: string | null; slug: string }> = {};
    if (storeIds.size > 0) {
      const { data: stores } = await supabaseAdmin
        .from("stores")
        .select("id, name, logo_url, slug")
        .in("id", Array.from(storeIds));
      for (const s of stores ?? [])
        storeInfo[s.id] = { name: s.name, logo_url: s.logo_url, slug: s.slug };
    }
    return {
      broadcasts: broadcasts.map((b) => ({ ...b, store: storeInfo[b.store_id] ?? null })),
      conversations: (convs ?? []).map((c) => ({ ...c, store: storeInfo[c.store_id] ?? null })),
    };
  });

export const getInboxThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const conv = await upsertConversation(supabaseAdmin, data.store_id, context.userId);
    // Broadcasts I received from this store
    const { data: recs } = await supabaseAdmin
      .from("store_broadcast_recipients")
      .select("broadcast_id, delivered_at, read_at")
      .eq("user_id", context.userId)
      .eq("store_id", data.store_id);
    const bcIds = (recs ?? []).map((r) => r.broadcast_id);
    const readMap = new Map((recs ?? []).map((r) => [r.broadcast_id, r.read_at]));
    let broadcasts: Array<{
      id: string;
      title: string;
      body: string | null;
      attachments: Attachment[];
      sent_at: string;
      kind: "broadcast";
      read_at: string | null;
    }> = [];
    if (bcIds.length > 0) {
      const { data: bcs } = await supabaseAdmin
        .from("store_broadcasts")
        .select("id, title, body, attachments, sent_at")
        .in("id", bcIds)
        .is("deleted_at", null);
      broadcasts = (bcs ?? []).map((b) => ({
        ...b,
        attachments: (b.attachments as unknown as Attachment[]) ?? [],
        kind: "broadcast" as const,
        read_at: readMap.get(b.id) ?? null,
      }));
    }
    // Thread messages
    const { data: msgs } = await supabaseAdmin
      .from("store_conversation_messages")
      .select("id, sender_type, body, attachments, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    // Mark store-sent messages as read for user
    await supabaseAdmin
      .from("store_conversation_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conv.id)
      .eq("sender_type", "store")
      .is("read_at", null);
    await supabaseAdmin
      .from("store_conversations")
      .update({ unread_for_user: 0 })
      .eq("id", conv.id);

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, name, logo_url, slug")
      .eq("id", data.store_id)
      .single();

    return {
      store,
      conversation_id: conv.id,
      broadcasts,
      messages: (msgs ?? []).map((m) => ({ ...m, kind: "message" as const })),
    };
  });

export const markBroadcastRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ broadcast_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("store_broadcast_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("broadcast_id", data.broadcast_id)
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { ok: true };
  });

export const markBroadcastClicked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ broadcast_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("store_broadcast_recipients")
      .update({ clicked_at: new Date().toISOString() })
      .eq("broadcast_id", data.broadcast_id)
      .eq("user_id", context.userId)
      .is("clicked_at", null);
    return { ok: true };
  });

// ---------- helpers ----------

async function upsertConversation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  storeId: string,
  userId: string,
) {
  const { data: existing } = await admin
    .from("store_conversations")
    .select("id, unread_for_store, unread_for_user")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await admin
    .from("store_conversations")
    .insert({ store_id: storeId, user_id: userId })
    .select("id, unread_for_store, unread_for_user")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Failed to create conversation");
  return created;
}

function summarizeAttachments(atts: Array<{ type: string; name?: string | null }>) {
  if (!atts || atts.length === 0) return "";
  const kinds = atts.map((a) => a.type.replace("_", " ")).join(", ");
  return `Sent: ${kinds}`;
}
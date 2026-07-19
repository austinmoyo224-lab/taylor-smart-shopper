import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { usePortal } from "@/lib/portal-context";
import {
  createStoreBroadcast,
  listStoreBroadcasts,
  listStoreConversations,
  getStoreConversation,
  getBroadcastRecipients,
  storeReplyToUser,
} from "@/lib/store-messages.functions";
import { supabase } from "@/integrations/supabase/client";
import { StoreImageUploader } from "@/components/StoreImageUploader";
import { signStoreAssetUrl } from "@/lib/portal.functions";
import { Megaphone, Users, Send, Paperclip, FileText, ImageIcon, Ticket, Tag, X } from "lucide-react";

export const Route = createFileRoute("/portal/messages")({
  ssr: false,
  component: MessagesPage,
});

type Attachment = {
  type: "catalog_pdf" | "flyer_image" | "coupon" | "promotion";
  url?: string | null;
  name?: string | null;
  coupon_id?: string | null;
  promotion_id?: string | null;
};

function MessagesPage() {
  const { activeOrgId, stores } = usePortal();
  const orgStores = useMemo(
    () => stores.filter((s) => s.organisation_id === activeOrgId),
    [stores, activeOrgId],
  );
  const [storeId, setStoreId] = useState<string>(orgStores[0]?.id ?? "");
  const [tab, setTab] = useState<"broadcasts" | "threads">("broadcasts");
  const [openBroadcastId, setOpenBroadcastId] = useState<string | null>(null);
  const [openConvId, setOpenConvId] = useState<string | null>(null);

  if (!storeId && orgStores[0]) setStoreId(orgStores[0].id);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Reach</p>
          <h1 className="text-4xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Messages
          </h1>
          <p className="mt-1 text-sm text-muted">
            Broadcast catalogs, flyers, coupons and specials to your followers, or reply 1:1.
          </p>
        </div>
        {orgStores.length > 1 && (
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {orgStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        <TabBtn active={tab === "broadcasts"} onClick={() => setTab("broadcasts")}>
          <Megaphone className="size-4" /> Broadcasts
        </TabBtn>
        <TabBtn active={tab === "threads"} onClick={() => setTab("threads")}>
          <Users className="size-4" /> Threads
        </TabBtn>
      </div>

      {!storeId ? (
        <p className="text-sm text-muted">Select a store to start messaging your followers.</p>
      ) : tab === "broadcasts" ? (
        <BroadcastsTab
          storeId={storeId}
          orgId={activeOrgId}
          openId={openBroadcastId}
          setOpenId={setOpenBroadcastId}
        />
      ) : (
        <ThreadsTab storeId={storeId} openId={openConvId} setOpenId={setOpenConvId} />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition " +
        (active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function BroadcastsTab({
  storeId,
  orgId,
  openId,
  setOpenId,
}: {
  storeId: string;
  orgId: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["portal", "broadcasts", storeId],
    queryFn: () => listStoreBroadcasts({ data: { store_id: storeId } }),
    enabled: !!storeId,
  });

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <Send className="size-4" />
            New broadcast
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Read</th>
                <th className="px-4 py-3">Clicked</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted">
                    No broadcasts yet. Send your first catalog or flyer to your followers.
                  </td>
                </tr>
              )}
              {(data ?? []).map((b) => (
                <tr
                  key={b.id}
                  className="cursor-pointer border-t border-border hover:bg-accent/40"
                  onClick={() => setOpenId(b.id)}
                >
                  <td className="px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3 text-[11px] text-muted">
                    {new Date(b.sent_at).toLocaleString("en-ZA")}
                  </td>
                  <td className="px-4 py-3">{b.stats.total}</td>
                  <td className="px-4 py-3">
                    {b.stats.read}
                    {b.stats.total > 0 && (
                      <span className="ml-1 text-[10px] text-muted">
                        ({Math.round((b.stats.read / b.stats.total) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{b.stats.clicked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-5">
        {openId ? (
          <RecipientsPanel broadcastId={openId} onClose={() => setOpenId(null)} />
        ) : (
          <p className="text-xs text-muted">
            Click a broadcast to see the per-recipient delivery log.
          </p>
        )}
      </aside>

      {composing && (
        <ComposeBroadcastModal
          storeId={storeId}
          orgId={orgId}
          onClose={() => setComposing(false)}
          onSent={() => {
            setComposing(false);
            void qc.invalidateQueries({ queryKey: ["portal", "broadcasts", storeId] });
          }}
        />
      )}
    </div>
  );
}

function RecipientsPanel({
  broadcastId,
  onClose,
}: {
  broadcastId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal", "broadcast-recipients", broadcastId],
    queryFn: () => getBroadcastRecipients({ data: { broadcast_id: broadcastId } }),
  });
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Delivery log</h3>
        <button onClick={onClose} className="text-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      {isLoading && <p className="text-xs text-muted">Loading…</p>}
      {data && (
        <>
          <p className="mb-3 text-xs text-muted">{data.recipients.length} recipients</p>
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {data.recipients.map((r) => (
              <li
                key={r.user_id}
                className="flex items-start gap-2 rounded-lg border border-border p-2 text-xs"
              >
                <div className="size-7 shrink-0 overflow-hidden rounded-full bg-background">
                  {r.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.profile?.display_name ?? "Follower"}
                  </p>
                  <p className="text-[10px] text-muted">
                    Delivered {timeAgo(r.delivered_at)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                    {r.read_at && <Badge>Read</Badge>}
                    {r.clicked_at && <Badge>Clicked</Badge>}
                    {r.redeemed_at && <Badge>Redeemed</Badge>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-primary">
      {children}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ComposeBroadcastModal({
  storeId,
  orgId,
  onClose,
  onSent,
}: {
  storeId: string;
  orgId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createStoreBroadcast({
        data: {
          store_id: storeId,
          title,
          body,
          attachments: computedAttachments(),
        },
      }),
    onSuccess: onSent,
  });

  function computedAttachments(): Attachment[] {
    const list = [...attachments];
    if (flyerUrl) list.push({ type: "flyer_image", url: flyerUrl, name: "Promotional flyer" });
    return list;
  }

  async function uploadCatalog(file: File) {
    setCatalogUploading(true);
    setCatalogError(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${orgId}/${storeId}/catalogs/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("store-assets")
        .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });
      if (error) throw error;
      const { url } = await signStoreAssetUrl({
        data: { organisation_id: orgId, path },
      });
      setAttachments((prev) => [...prev, { type: "catalog_pdf", url, name: file.name }]);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCatalogUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium">New broadcast</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="This weekend: 30% off pantry staples"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Hi shopper! Our new specials are live…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <StoreImageUploader
                organisationId={orgId}
                storeId={storeId}
                folder="flyers"
                value={flyerUrl}
                onChange={setFlyerUrl}
                label="Promotional flyer (image)"
                aspect="wide"
                recommendedSize="1600×900px"
              />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Catalog (PDF)
              </span>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-6 text-xs text-muted hover:text-foreground">
                <FileText className="mb-2 size-6 text-primary/70" />
                <span>{catalogUploading ? "Uploading…" : "Click to upload PDF"}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadCatalog(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {catalogError && (
                <p className="mt-1 text-[11px] text-destructive">{catalogError}</p>
              )}
            </div>
          </div>

          {attachments.length > 0 && (
            <div>
              <span className="mb-1 block text-[11px] font-medium text-muted">Attached</span>
              <ul className="space-y-1">
                {attachments.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <AttachmentIcon type={a.type} />
                      <span className="truncate">{a.name ?? a.type}</span>
                    </span>
                    <button
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-muted hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CouponPromoPicker
            orgId={orgId}
            storeId={storeId}
            onAdd={(a) => setAttachments((prev) => [...prev, a])}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            disabled={!title || mut.isPending}
            onClick={() => mut.mutate()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
          >
            <Send className="size-4" />
            {mut.isPending ? "Sending…" : "Send to followers"}
          </button>
        </div>
        {mut.error && (
          <p className="border-t border-border px-5 py-2 text-xs text-destructive">
            {(mut.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}

function AttachmentIcon({ type }: { type: Attachment["type"] }) {
  if (type === "catalog_pdf") return <FileText className="size-3.5 text-primary" />;
  if (type === "flyer_image") return <ImageIcon className="size-3.5 text-primary" />;
  if (type === "coupon") return <Ticket className="size-3.5 text-primary" />;
  return <Tag className="size-3.5 text-primary" />;
}

function CouponPromoPicker({
  orgId,
  storeId,
  onAdd,
}: {
  orgId: string;
  storeId: string;
  onAdd: (a: Attachment) => void;
}) {
  const coupons = useQuery({
    queryKey: ["portal", "coupons-list", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("coupons")
        .select("id, code, title")
        .eq("organisation_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  const promos = useQuery({
    queryKey: ["portal", "promos-list", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotions")
        .select("id, title")
        .eq("store_id", storeId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <span className="mb-1 block text-[11px] font-medium text-muted">Attach coupon</span>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          onChange={(e) => {
            const c = (coupons.data ?? []).find((x) => x.id === e.target.value);
            if (c) onAdd({ type: "coupon", coupon_id: c.id, name: c.title ?? c.code });
            e.currentTarget.value = "";
          }}
        >
          <option value="">Select coupon…</option>
          {(coupons.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title ?? c.code}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="mb-1 block text-[11px] font-medium text-muted">Attach special</span>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          onChange={(e) => {
            const p = (promos.data ?? []).find((x) => x.id === e.target.value);
            if (p) onAdd({ type: "promotion", promotion_id: p.id, name: p.title });
            e.currentTarget.value = "";
          }}
        >
          <option value="">Select special…</option>
          {(promos.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ---------- THREADS TAB ----------
function ThreadsTab({
  storeId,
  openId,
  setOpenId,
}: {
  storeId: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal", "conversations", storeId],
    queryFn: () => listStoreConversations({ data: { store_id: storeId } }),
    enabled: !!storeId,
  });
  return (
    <div className="grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-border bg-card">
        {isLoading && <p className="p-4 text-xs text-muted">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="p-4 text-xs text-muted">
            No conversations yet. Followers can reply to any broadcast to start a thread.
          </p>
        )}
        <ul className="divide-y divide-border">
          {(data ?? []).map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setOpenId(c.id)}
                className={
                  "flex w-full items-start gap-3 p-3 text-left hover:bg-accent/40 " +
                  (openId === c.id ? "bg-accent/40" : "")
                }
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-full bg-background">
                  {c.profile?.avatar_url ? (
                    <img
                      src={c.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {c.profile?.display_name ?? "Follower"}
                    </p>
                    {c.unread_for_store > 0 && (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                        {c.unread_for_store}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {c.last_message_preview ?? "New thread"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-h-[60vh] rounded-2xl border border-border bg-card">
        {openId ? (
          <ThreadView conversationId={openId} storeId={storeId} />
        ) : (
          <p className="p-6 text-sm text-muted">Select a follower to view your conversation.</p>
        )}
      </div>
    </div>
  );
}

function ThreadView({ conversationId, storeId }: { conversationId: string; storeId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["portal", "conv", conversationId],
    queryFn: () => getStoreConversation({ data: { conversation_id: conversationId } }),
  });
  const [body, setBody] = useState("");
  const reply = useMutation({
    mutationFn: () =>
      storeReplyToUser({
        data: {
          store_id: storeId,
          user_id: data?.conversation.user_id ?? "",
          body,
          attachments: [],
        },
      }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["portal", "conv", conversationId] });
      void qc.invalidateQueries({ queryKey: ["portal", "conversations", storeId] });
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <p className="text-sm font-medium">{data?.profile?.display_name ?? "Follower"}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {(data?.messages ?? []).map((m) => (
          <div
            key={m.id}
            className={m.sender_type === "store" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm " +
                (m.sender_type === "store"
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-foreground")
              }
            >
              {m.body}
              <div className="mt-1 text-[10px] opacity-70">
                {new Date(m.created_at).toLocaleString("en-ZA")}
              </div>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) reply.mutate();
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply to your follower…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
        />
        <button
          disabled={!body.trim() || reply.isPending}
          className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

// Keep unused imports from tree-shaking warnings
void Paperclip;
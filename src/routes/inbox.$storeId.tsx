import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getInboxThread,
  markBroadcastRead,
  markBroadcastClicked,
  userReplyToStore,
} from "@/lib/store-messages.functions";
import { ArrowLeft, Send, FileText, ImageIcon, Ticket, Tag, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/inbox/$storeId")({
  ssr: false,
  component: ThreadScreen,
});

type Attachment = {
  type: "catalog_pdf" | "flyer_image" | "coupon" | "promotion";
  url?: string | null;
  name?: string | null;
  coupon_id?: string | null;
  promotion_id?: string | null;
};

function ThreadScreen() {
  const { storeId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["inbox", "thread", storeId],
    queryFn: () => getInboxThread({ data: { store_id: storeId } }),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markBroadcastRead({ data: { broadcast_id: id } }),
  });
  const markClick = useMutation({
    mutationFn: (id: string) => markBroadcastClicked({ data: { broadcast_id: id } }),
  });

  useEffect(() => {
    for (const b of data?.broadcasts ?? []) {
      if (!b.read_at) markRead.mutate(b.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.broadcasts?.length]);

  const [body, setBody] = useState("");
  const reply = useMutation({
    mutationFn: () => userReplyToStore({ data: { store_id: storeId, body } }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["inbox", "thread", storeId] });
    },
  });

  const timeline = [
    ...(data?.broadcasts ?? []).map((b) => ({
      key: `b-${b.id}`,
      at: b.sent_at,
      kind: "broadcast" as const,
      broadcast: b,
    })),
    ...(data?.messages ?? []).map((m) => ({
      key: `m-${m.id}`,
      at: m.created_at,
      kind: "message" as const,
      message: m,
    })),
  ].sort((a, b) => (a.at < b.at ? -1 : 1));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [timeline.length]);

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/inbox" className="text-muted hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="size-9 overflow-hidden rounded-full bg-background">
          {data?.store?.logo_url ? (
            <img src={data.store.logo_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{data?.store?.name ?? "Store"}</p>
          <p className="text-[10px] text-muted">Messages & specials</p>
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoading && <p className="text-xs text-muted">Loading…</p>}
        {!isLoading && timeline.length === 0 && (
          <p className="text-center text-xs text-muted">
            No messages yet. Say hi to your store.
          </p>
        )}
        {timeline.map((t) =>
          t.kind === "broadcast" ? (
            <BroadcastCard
              key={t.key}
              broadcast={t.broadcast}
              onClickAttachment={() => markClick.mutate(t.broadcast.id)}
            />
          ) : (
            <MessageBubble key={t.key} message={t.message} />
          ),
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) reply.mutate();
        }}
        className="flex items-center gap-2 border-t border-border bg-card px-3 py-3 pb-6"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply to your store…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
        />
        <button
          disabled={!body.trim() || reply.isPending}
          className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

function BroadcastCard({
  broadcast,
  onClickAttachment,
}: {
  broadcast: {
    id: string;
    title: string;
    body: string | null;
    attachments: Attachment[];
    sent_at: string;
  };
  onClickAttachment: () => void;
}) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-4">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
        Broadcast
      </p>
      <h3 className="text-base font-medium">{broadcast.title}</h3>
      {broadcast.body && <p className="mt-1 whitespace-pre-wrap text-sm">{broadcast.body}</p>}
      {(broadcast.attachments ?? []).length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {(broadcast.attachments ?? []).map((a, i) => (
            <li key={i}>
              <AttachmentLink attachment={a} onOpen={onClickAttachment} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-muted">
        {new Date(broadcast.sent_at).toLocaleString("en-ZA")}
      </p>
    </div>
  );
}

function AttachmentLink({ attachment, onOpen }: { attachment: Attachment; onOpen: () => void }) {
  const cls =
    "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-primary";
  const Icon =
    attachment.type === "catalog_pdf"
      ? FileText
      : attachment.type === "flyer_image"
        ? ImageIcon
        : attachment.type === "coupon"
          ? Ticket
          : Tag;
  const label = attachment.name ?? attachment.type.replace("_", " ");

  if (attachment.type === "flyer_image" && attachment.url) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" onClick={onOpen} className="block">
        <img
          src={attachment.url}
          alt={label}
          className="w-full rounded-lg border border-border"
          onLoad={onOpen}
        />
      </a>
    );
  }
  if (attachment.type === "coupon" && attachment.coupon_id) {
    return (
      <a href="/coupons" onClick={onOpen} className={cls}>
        <Icon className="size-4 text-primary" />
        <span className="flex-1 truncate">{label}</span>
        <span className="text-[10px] text-primary">View coupon</span>
      </a>
    );
  }
  if (attachment.type === "promotion" && attachment.promotion_id) {
    return (
      <a href="/deals" onClick={onOpen} className={cls}>
        <Icon className="size-4 text-primary" />
        <span className="flex-1 truncate">{label}</span>
        <span className="text-[10px] text-primary">View special</span>
      </a>
    );
  }
  return (
    <a href={attachment.url ?? "#"} target="_blank" rel="noreferrer" onClick={onOpen} className={cls}>
      <Icon className="size-4 text-primary" />
      <span className="flex-1 truncate">{label}</span>
      <ExternalLink className="size-3.5 text-muted" />
    </a>
  );
}

function MessageBubble({
  message,
}: {
  message: { sender_type: string; body: string | null; created_at: string };
}) {
  const mine = message.sender_type === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
          (mine ? "bg-primary text-primary-foreground" : "bg-accent text-foreground")
        }
      >
        {message.body}
        <div className="mt-1 text-[10px] opacity-70">
          {new Date(message.created_at).toLocaleString("en-ZA")}
        </div>
      </div>
    </div>
  );
}
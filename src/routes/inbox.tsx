import { createFileRoute, Link, Outlet, useNavigate, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { listMyInbox } from "@/lib/store-messages.functions";
import { Megaphone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Store inbox - Taylor Intelligence" },
      {
        name: "description",
        content: "Messages, catalogs, flyers and specials sent to you by your stores.",
      },
    ],
  }),
  component: InboxLayout,
});

function InboxLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const inChild = !!matchRoute({ to: "/inbox/$storeId" });

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (inChild) {
    return (
      <AppShell hideNav>
        <Outlet />
      </AppShell>
    );
  }
  return (
    <AppShell>
      <InboxIndex />
    </AppShell>
  );
}

function InboxIndex() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["inbox", "mine"],
    queryFn: () => listMyInbox(),
    enabled: !!user,
  });

  const items = (data?.broadcasts ?? []).map((b) => ({
    kind: "broadcast" as const,
    id: b.id,
    storeId: b.store_id,
    title: b.title,
    preview: b.body ?? "",
    at: b.sent_at,
    unread: !b.read_at,
    store: b.store,
  }));
  const threads = (data?.conversations ?? []).map((c) => ({
    kind: "thread" as const,
    id: c.id,
    storeId: c.store_id,
    title: c.store?.name ?? "Store",
    preview: c.last_message_preview ?? "",
    at: c.last_message_at,
    unread: c.unread_for_user > 0,
    store: c.store,
  }));
  const merged = [...items, ...threads].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          From your stores
        </p>
        <h1 className="text-3xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Inbox
        </h1>
        <p className="mt-1 text-xs text-muted">
          Catalogs, flyers, coupons and specials from stores you follow.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && <p className="text-sm text-muted">Loading…</p>}
        {!isLoading && merged.length === 0 && (
          <p className="text-sm text-muted">
            No messages yet. Follow stores to receive their catalogs and specials.
          </p>
        )}
        <ul className="space-y-2">
          {merged.map((m) => (
            <li key={`${m.kind}-${m.id}`}>
              <Link
                to="/inbox/$storeId"
                params={{ storeId: m.storeId }}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary"
              >
                <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-background">
                  {m.store?.logo_url ? (
                    <img src={m.store.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary/60">
                      {m.kind === "broadcast" ? (
                        <Megaphone className="size-5" />
                      ) : (
                        <MessageCircle className="size-5" />
                      )}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {m.store?.name ?? "Store"}
                      <span className="ml-2 text-[10px] font-normal text-muted">
                        {m.kind === "broadcast" ? "Broadcast" : "Direct"}
                      </span>
                    </p>
                    {m.unread && <span className="size-2 rounded-full bg-primary" />}
                  </div>
                  <p className="truncate text-sm">{m.title}</p>
                  {m.preview && <p className="mt-0.5 truncate text-xs text-muted">{m.preview}</p>}
                  <p className="mt-0.5 text-[10px] text-muted">
                    {new Date(m.at).toLocaleString("en-ZA")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
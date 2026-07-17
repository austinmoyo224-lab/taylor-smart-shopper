import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getStoreByJoinSlug,
  recordJoinScan,
  subscribeToStore,
} from "@/lib/subscriptions.functions";
import { AppShell, BottomNav } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/join/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Join on Taylor - ${params.slug}` },
      {
        name: "description",
        content:
          "Follow this store on Taylor Intelligence to get its specials, coupons and recipes personalised for you.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinPage,
});

type Store = Awaited<ReturnType<typeof getStoreByJoinSlug>>;

function JoinPage() {
  const { slug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getStoreByJoinSlug({ data: { slug } });
        if (!cancelled) setStore(s);
        void recordJoinScan({ data: { slug } }).catch(() => {});
      } finally {
        if (!cancelled) setLoadingStore(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function follow() {
    if (!store) return;
    if (!user) {
      // Save intent and route to /auth. Auth page redirects to /chat by default;
      // for now we drop them back here after sign-in via localStorage hint.
      try {
        localStorage.setItem("taylor.join.pending", `/join/${slug}`);
      } catch {
        // ignore storage failure — worst case they land on /chat.
      }
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await subscribeToStore({
        data: { storeId: store.id, source: "qr" },
      });
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not follow this store.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto px-6 py-10">
        {loadingStore ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : !store ? (
          <div className="text-center">
            <h1
              className="text-3xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Not found
            </h1>
            <p className="mt-3 text-sm text-muted">
              This invite link isn't active. Ask the store to share their current QR code.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
              You're invited
            </p>
            <h1
              className="text-balance text-3xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Follow {store.name} on Taylor
            </h1>
            {store.city && (
              <p className="mt-1 text-xs text-muted">
                {store.city}, {store.country_code}
              </p>
            )}

            {store.hero_image_url && (
              <img
                src={store.hero_image_url}
                alt={store.name}
                className="mt-6 aspect-[3/2] w-full rounded-2xl object-cover"
              />
            )}

            <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted">
              {store.description ??
                "Taylor will keep you updated on their weekly specials, exclusive coupons and recipe ideas — only what matches what you actually buy."}
            </div>

            {subscribed ? (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                <CheckCircle2 className="size-4" />
                You're following {store.name}. Taylor will start looking out for their deals.
              </div>
            ) : (
              <button
                onClick={follow}
                disabled={busy || authLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                <Sparkles className="size-4" />
                {busy ? "One moment…" : user ? "Follow this store" : "Sign in and follow"}
              </button>
            )}
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
            <p className="mt-6 text-center text-[10px] leading-relaxed text-muted">
              You can unfollow any time. Taylor only uses what you choose to share.
            </p>
          </>
        )}
      </main>
      <BottomNav />
    </AppShell>
  );
}

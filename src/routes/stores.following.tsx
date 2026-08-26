import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, X, QrCode } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { listMySubscriptions, unsubscribeFromStore } from "@/lib/subscriptions.functions";
import { Paginator, usePaged } from "@/components/Paginator";

export const Route = createFileRoute("/stores/following")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Stores you follow - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Every store you follow on Taylor Intelligence in one place — open a store profile or unfollow at any time.",
      },
      { property: "og:title", content: "Stores you follow - Taylor Intelligence" },
      {
        property: "og:description",
        content: "Manage the South African stores you follow on Taylor Intelligence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FollowingScreen,
});

function FollowingScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const subs = useQuery({
    queryKey: ["subs", "mine"],
    queryFn: () => listMySubscriptions(),
    enabled: !!user,
  });

  const unsub = useMutation({
    mutationFn: (storeId: string) => unsubscribeFromStore({ data: { storeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subs", "mine"] }),
  });

  const stores = subs.data ?? [];
  const pager = usePaged(subs.data ?? undefined);

  return (
    <AppShell>
      <header className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background px-6 pb-5 pt-8">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
          Following
        </p>
        <h1
          className="text-2xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your stores
        </h1>
        <p className="mt-1 text-xs text-muted">
          {stores.length} store{stores.length === 1 ? "" : "s"} you follow.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {!user || subs.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : stores.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <QrCode className="size-5" />
              </div>
              <p>
                You're not following any stores yet. Scan a store's QR code in their shop, or open
                the join link they've shared with you.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {pager.paged.map((s, i) => (
                <motion.li
                  key={s.id}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <Link
                    to="/stores/$storeId"
                    params={{ storeId: s.id }}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="size-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                        <MapPin className="size-3" />
                        {s.city ?? "—"}
                        {s.country_code ? `, ${s.country_code}` : ""}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => unsub.mutate(s.id)}
                    aria-label={`Unfollow ${s.name}`}
                    className="flex size-8 items-center justify-center rounded-full border border-border text-muted hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.li>
              ))}
            </ul>
            <Paginator
              page={pager.page}
              pageCount={pager.pageCount}
              total={pager.total}
              start={pager.start}
              end={pager.end}
              onPageChange={pager.setPage}
            />
          </>
        )}
      </main>
    </AppShell>
  );
}

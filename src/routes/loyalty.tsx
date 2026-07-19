import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyLoyalty,
  listRewardsForOrg,
  listMyRedemptions,
  redeemReward,
} from "@/lib/loyalty.functions";
import { Gift, Sparkles, ChevronLeft, Ticket } from "lucide-react";

export const Route = createFileRoute("/loyalty")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Points & Rewards - Taylor Intelligence" },
      {
        name: "description",
        content: "Your points balance and rewards you can redeem at your favourite stores.",
      },
    ],
  }),
  component: LoyaltyScreen,
});

function LoyaltyScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeOrg, setActiveOrg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const loyalty = useQuery({
    queryKey: ["loyalty", "me"],
    queryFn: () => getMyLoyalty(),
    enabled: !!user,
  });

  const redemptions = useQuery({
    queryKey: ["loyalty", "redemptions"],
    queryFn: () => listMyRedemptions(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!activeOrg && loyalty.data?.accounts.length) {
      setActiveOrg(loyalty.data.accounts[0].organisation_id);
    }
  }, [loyalty.data, activeOrg]);

  const rewards = useQuery({
    queryKey: ["loyalty", "rewards", activeOrg],
    queryFn: () => listRewardsForOrg({ data: { organisation_id: activeOrg! } }),
    enabled: !!activeOrg,
  });

  const redeem = useMutation({
    mutationFn: (id: string) => redeemReward({ data: { reward_id: id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["loyalty"] });
    },
  });

  const activeAccount = loyalty.data?.accounts.find((a) => a.organisation_id === activeOrg);

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <div className="flex items-center justify-between">
          <Link to="/profile" className="flex items-center gap-1 text-xs text-muted">
            <ChevronLeft className="size-3.5" />
            Back
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Rewards</p>
          <div className="w-12" />
        </div>
        <h1
          className="mt-4 text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Points & Rewards
        </h1>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto px-6 py-6 pb-24">
        {(loyalty.data?.accounts.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <Gift className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-sm font-medium">No points yet</p>
            <p className="mt-1 text-xs text-muted">
              Follow a store to start earning. Retailers award points for scans, purchases and
              community moments.
            </p>
            <Link
              to="/stores"
              className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
            >
              Discover stores
            </Link>
          </div>
        ) : (
          <>
            <div className="scroll-hidden -mx-6 flex gap-3 overflow-x-auto px-6">
              {loyalty.data!.accounts.map((a) => {
                const active = a.organisation_id === activeOrg;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActiveOrg(a.organisation_id)}
                    className={
                      "min-w-[220px] rounded-2xl border p-4 text-left transition " +
                      (active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40")
                    }
                  >
                    <p className="text-[10px] uppercase tracking-widest text-muted">
                      {a.org_name}
                    </p>
                    <p
                      className="mt-1 text-3xl italic tracking-tight text-foreground"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {a.points.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted">points{a.tier ? ` · ${a.tier}` : ""}</p>
                  </button>
                );
              })}
            </div>

            {activeOrg && (
              <section>
                <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                  Rewards at {activeAccount?.org_name}
                </h2>
                {rewards.isLoading ? (
                  <p className="text-sm text-muted">Loading rewards…</p>
                ) : (rewards.data?.length ?? 0) === 0 ? (
                  <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                    No rewards live yet — check back soon.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rewards.data!.map((r) => {
                      const affordable =
                        (activeAccount?.points ?? 0) >= Number(r.points_cost);
                      return (
                        <div
                          key={r.id}
                          className="flex flex-col rounded-2xl border border-border bg-card p-4"
                        >
                          {r.image_url && (
                            <img
                              src={r.image_url}
                              alt=""
                              className="mb-3 h-32 w-full rounded-xl object-cover"
                            />
                          )}
                          <p className="text-sm font-medium">{r.title}</p>
                          {r.description && (
                            <p className="mt-1 text-xs text-muted">{r.description}</p>
                          )}
                          <div className="mt-3 flex items-end justify-between">
                            <p
                              className="text-2xl italic tracking-tight text-primary"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {Number(r.points_cost).toLocaleString()} pts
                            </p>
                            <button
                              disabled={!affordable || redeem.isPending}
                              onClick={() => redeem.mutate(r.id)}
                              className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
                            >
                              {affordable ? "Redeem" : "Not enough"}
                            </button>
                          </div>
                          {r.stock !== null && r.stock !== undefined && (
                            <p className="mt-1 text-[10px] text-muted">
                              {r.stock} left
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {redeem.error && (
                  <p className="mt-2 text-xs text-destructive">
                    {(redeem.error as Error).message}
                  </p>
                )}
              </section>
            )}
          </>
        )}

        {(redemptions.data?.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
              Your redemption codes
            </h2>
            <ul className="space-y-2">
              {redemptions.data!.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="size-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-[11px] text-muted">
                        {r.points_spent.toLocaleString()} pts ·{" "}
                        {new Date(r.created_at).toLocaleDateString("en-ZA")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">{r.code}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted">
                      {r.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(loyalty.data?.transactions.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
              Recent activity
            </h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {loyalty.data!.transactions.slice(0, 15).map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{t.reason}</p>
                    <p className="text-[11px] text-muted">
                      {new Date(t.created_at).toLocaleString("en-ZA")}
                    </p>
                  </div>
                  <p
                    className={
                      "font-medium " +
                      (Number(t.points) >= 0 ? "text-primary" : "text-destructive")
                    }
                  >
                    {Number(t.points) >= 0 ? "+" : ""}
                    {Number(t.points).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-[10px] text-muted">
          <Sparkles className="mr-1 inline size-3" />
          Points are managed by each store. No cash value.
        </p>
      </main>

      <BottomNav />
    </AppShell>
  );
}
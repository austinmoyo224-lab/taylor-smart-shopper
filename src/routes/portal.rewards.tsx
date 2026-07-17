import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  awardPointsToUser,
  deleteReward,
  listOrgLoyaltyLedger,
  listOrgRewards,
  upsertReward,
} from "@/lib/loyalty.functions";
import { usePortal } from "@/lib/portal-context";
import { Gift, Plus, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/portal/rewards")({
  ssr: false,
  component: PortalRewards,
});

function PortalRewards() {
  const { activeOrgId } = usePortal();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const rewards = useQuery({
    queryKey: ["portal", "rewards", activeOrgId],
    queryFn: () => listOrgRewards({ data: { organisation_id: activeOrgId } }),
    enabled: !!activeOrgId,
  });
  const ledger = useQuery({
    queryKey: ["portal", "loyalty-ledger", activeOrgId],
    queryFn: () => listOrgLoyaltyLedger({ data: { organisation_id: activeOrgId, limit: 50 } }),
    enabled: !!activeOrgId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteReward({ data: { id, organisation_id: activeOrgId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "rewards", activeOrgId] }),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            Loyalty
          </p>
          <h1
            className="text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Rewards & Points
          </h1>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {showNew ? "Close" : "New reward"}
        </button>
      </div>

      {showNew && activeOrgId && (
        <RewardForm
          orgId={activeOrgId}
          onDone={() => {
            setShowNew(false);
            void qc.invalidateQueries({ queryKey: ["portal", "rewards", activeOrgId] });
          }}
        />
      )}

      <div className="mb-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
            Catalogue
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rewards.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-muted">
                      Loading…
                    </td>
                  </tr>
                )}
                {!rewards.isLoading && (rewards.data?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-muted">
                      No rewards yet.
                    </td>
                  </tr>
                )}
                {(rewards.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.title}</p>
                      {r.description && (
                        <p className="text-[11px] text-muted">{r.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{Number(r.points_cost).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted">{r.stock ?? "∞"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] " +
                          (r.is_active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/20 text-muted")
                        }
                      >
                        {r.is_active ? "active" : "hidden"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => del.mutate(r.id)}
                        className="text-muted hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <AwardCard orgId={activeOrgId} />
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Recent ledger
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3">Shopper</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {(ledger.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted">
                    No activity yet.
                  </td>
                </tr>
              )}
              {(ledger.data ?? []).map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3">{t.user_name}</td>
                  <td className="px-4 py-3">{t.reason}</td>
                  <td
                    className={
                      "px-4 py-3 font-medium " +
                      (t.points >= 0 ? "text-primary" : "text-destructive")
                    }
                  >
                    {t.points >= 0 ? "+" : ""}
                    {t.points.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{t.balance_after.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-muted">
                    {new Date(t.created_at).toLocaleString("en-ZA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RewardForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [terms, setTerms] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      upsertReward({
        data: {
          organisation_id: orgId,
          title,
          description: description || null,
          points_cost: Number(cost),
          stock: stock ? Number(stock) : null,
          image_url: imageUrl || null,
          terms: terms || null,
          is_active: true,
        },
      }),
    onSuccess: onDone,
    onError: (e: Error) => setError(e.message),
  });

  const cls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mut.mutate();
      }}
      className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-2"
    >
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={cls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted">Points cost</span>
        <input
          type="number"
          min="1"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          required
          className={cls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted">
          Stock (leave empty for unlimited)
        </span>
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={cls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted">Image URL</span>
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={cls} />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={cls}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1 block text-[11px] font-medium text-muted">Terms & conditions</span>
        <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} className={cls} />
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Saving…" : "Save reward"}
        </button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </form>
  );
}

function AwardCard({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [pts, setPts] = useState("");
  const [reason, setReason] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const award = useMutation({
    mutationFn: () =>
      awardPointsToUser({
        data: {
          organisation_id: orgId,
          user_query: q,
          points: Number(pts),
          reason,
        },
      }),
    onSuccess: (r) => {
      setOk(`Awarded ${pts} pts to ${r.user.name ?? "shopper"}`);
      setErr(null);
      setPts("");
      setReason("");
      void qc.invalidateQueries({ queryKey: ["portal", "loyalty-ledger", orgId] });
    },
    onError: (e: Error) => {
      setErr(e.message);
      setOk(null);
    },
  });

  const cls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gift className="size-4 text-primary" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Award points</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          award.mutate();
        }}
        className="space-y-3"
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">
            Shopper email or phone
          </span>
          <input value={q} onChange={(e) => setQ(e.target.value)} required className={cls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">
            Points (negative to deduct)
          </span>
          <input
            type="number"
            value={pts}
            onChange={(e) => setPts(e.target.value)}
            required
            className={cls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">Reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Grand opening bonus"
            className={cls}
          />
        </label>
        <button
          type="submit"
          disabled={award.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {award.isPending ? "Awarding…" : "Award points"}
        </button>
        {ok && <p className="text-xs text-primary">{ok}</p>}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </form>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createCampaign, listCampaigns, sendCampaignNow } from "@/lib/notifications.functions";
import { usePortal } from "@/lib/portal-context";
import { Plus, Send } from "lucide-react";
import { StoreImageUploader } from "@/components/StoreImageUploader";

export const Route = createFileRoute("/portal/campaigns")({
  ssr: false,
  component: CampaignsPage,
});

function CampaignsPage() {
  const { activeOrgId, stores } = usePortal();
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);
  const qc = useQueryClient();
  const [show, setShow] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "campaigns", activeOrgId],
    queryFn: () => listCampaigns({ data: { organisation_id: activeOrgId } }),
    enabled: !!activeOrgId,
  });

  const send = useMutation({
    mutationFn: (campaignId: string) => sendCampaignNow({ data: { campaignId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "campaigns", activeOrgId] }),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Reach</p>
          <h1
            className="text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Campaigns
          </h1>
        </div>
        <button
          onClick={() => setShow((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {show ? "Close" : "New campaign"}
        </button>
      </div>

      {show && activeOrgId && (
        <NewCampaignForm
          orgId={activeOrgId}
          stores={orgStores}
          onDone={() => {
            setShow(false);
            void qc.invalidateQueries({
              queryKey: ["portal", "campaigns", activeOrgId],
            });
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Sent</th>
              <th className="px-4 py-3">Actions</th>
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
                  No campaigns yet. Create one to reach followers of your stores.
                </td>
              </tr>
            )}
            {(data ?? []).map((c) => {
              const s = (c as { stores?: { name: string } | null }).stores;
              const sched = (c.schedule ?? {}) as {
                title?: string;
                body?: string;
              };
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{s?.name ?? "All stores"}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium">{sched.title ?? "—"}</div>
                    <div className="text-muted">{sched.body ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted">
                    {c.starts_at ? new Date(c.starts_at).toLocaleString("en-ZA") : "Not sent"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => send.mutate(c.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] hover:border-primary"
                    >
                      <Send className="size-3" />
                      Send now
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {send.data && (
        <p className="mt-3 text-xs text-muted">Delivered to {send.data.delivered} subscribers.</p>
      )}
    </div>
  );
}

function NewCampaignForm({
  orgId,
  stores,
  onDone,
}: {
  orgId: string;
  stores: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [storeId, setStoreId] = useState<string>("");
  const [category, setCategory] = useState<
    "promotion" | "coupon" | "campaign" | "recipe" | "reminder" | "system"
  >("campaign");
  const [sendNow, setSendNow] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ delivered: number } | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createCampaign({
        data: {
          organisation_id: orgId,
          store_id: storeId || null,
          name,
          scope: "store",
          title,
          body,
          category,
          send_now: sendNow,
          image_url: imageUrl,
        },
      }),
    onSuccess: (res) => {
      setResult(res);
      if (!sendNow) onDone();
    },
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
      <F label="Internal name">
        <input value={name} onChange={(e) => setName(e.target.value)} required className={cls} />
      </F>
      <F label="Store audience">
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={cls}>
          <option value="">All followers of my stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              Followers of {s.name}
            </option>
          ))}
        </select>
      </F>
      <div className="md:col-span-2">
        <F label="Title (what the subscriber sees)">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={160}
            className={cls}
          />
        </F>
      </div>
      <div className="md:col-span-2">
        <F label="Message">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={500}
            className={cls}
          />
        </F>
      </div>
      <div className="md:col-span-2">
        <StoreImageUploader
          organisationId={orgId}
          storeId={storeId || null}
          folder="campaigns"
          value={imageUrl}
          onChange={setImageUrl}
          label="Campaign image"
          aspect="wide"
        />
      </div>
      <F label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className={cls}
        >
          <option value="campaign">Campaign</option>
          <option value="promotion">Promotion</option>
          <option value="coupon">Coupon</option>
          <option value="recipe">Recipe</option>
          <option value="reminder">Reminder</option>
        </select>
      </F>
      <label className="flex items-end gap-2 text-xs">
        <input
          type="checkbox"
          checked={sendNow}
          onChange={(e) => setSendNow(e.target.checked)}
          className="size-4 accent-primary"
        />
        Send now (otherwise saved as draft)
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Working…" : sendNow ? "Create & send" : "Save draft"}
        </button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        {result && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
            Delivered to {result.delivered} subscribers.
            <button type="button" onClick={onDone} className="ml-3 underline">
              Close
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

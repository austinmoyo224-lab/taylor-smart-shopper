import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createPromotion, listPromotions } from "@/lib/portal.functions";
import { usePortal } from "@/lib/portal-context";
import { Plus } from "lucide-react";
import { StoreImageUploader } from "@/components/StoreImageUploader";

export const Route = createFileRoute("/portal/promotions")({
  ssr: false,
  component: PromotionsPage,
});

const TYPES = [
  "weekly_special",
  "flash_sale",
  "discount",
  "bundle",
  "seasonal",
  "sponsored",
] as const;
type PromoType = (typeof TYPES)[number];

function PromotionsPage() {
  const { activeOrgId, organisations, stores } = usePortal();
  const org = organisations.find((o) => o.id === activeOrgId);
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);
  const qc = useQueryClient();
  const [show, setShow] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "promotions", activeOrgId],
    queryFn: () => listPromotions({ data: { organisation_id: activeOrgId } }),
    enabled: !!activeOrgId,
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Deals</p>
          <h1
            className="text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Promotions
          </h1>
        </div>
        <button
          onClick={() => setShow((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {show ? "Close" : "New promotion"}
        </button>
      </div>

      {show && activeOrgId && (
        <NewPromoForm
          orgId={activeOrgId}
          currency={org?.default_currency ?? "ZAR"}
          stores={orgStores}
          onDone={() => {
            setShow(false);
            void qc.invalidateQueries({ queryKey: ["portal", "promotions", activeOrgId] });
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted">
                  No promotions yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((p) => {
              const s = (p as { stores?: { name: string } | null }).stores;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {p.title}
                    {p.is_sponsored && (
                      <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-primary">
                        Sponsored
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{p.type.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-muted">{s?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.sale_price != null ? `${p.currency_code} ${p.sale_price}` : "—"}
                    {p.original_price && (
                      <span className="ml-1 text-[10px] text-muted line-through">
                        {p.original_price}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted">
                    {p.starts_at ? new Date(p.starts_at).toLocaleDateString("en-ZA") : "—"}
                    {" → "}
                    {p.ends_at ? new Date(p.ends_at).toLocaleDateString("en-ZA") : "—"}
                  </td>
                  <td className="px-4 py-3">{p.is_published ? "Live" : "Draft"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewPromoForm({
  orgId,
  currency,
  stores,
  onDone,
}: {
  orgId: string;
  currency: string;
  stores: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PromoType>("weekly_special");
  const [storeId, setStoreId] = useState<string>("");
  const [isSponsored, setIsSponsored] = useState(false);
  const [original, setOriginal] = useState("");
  const [sale, setSale] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [publish, setPublish] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createPromotion({
        data: {
          organisation_id: orgId,
          store_id: storeId || null,
          title,
          description,
          type,
          is_sponsored: isSponsored,
          original_price: original ? Number(original) : null,
          sale_price: sale ? Number(sale) : null,
          currency_code: currency,
          starts_at: startsAt ? new Date(startsAt).toISOString() : "",
          ends_at: endsAt ? new Date(endsAt).toISOString() : "",
          is_published: publish,
          hero_image_url: heroImageUrl,
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
      <F label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={cls} />
      </F>
      <F label="Type">
        <select value={type} onChange={(e) => setType(e.target.value as PromoType)} className={cls}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </F>
      <F label="Store (optional)">
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={cls}>
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </F>
      <F label={`Original price (${currency})`}>
        <input
          type="number"
          step="0.01"
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          className={cls}
        />
      </F>
      <F label={`Sale price (${currency})`}>
        <input
          type="number"
          step="0.01"
          value={sale}
          onChange={(e) => setSale(e.target.value)}
          className={cls}
        />
      </F>
      <F label="Starts">
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className={cls}
        />
      </F>
      <F label="Ends">
        <input
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className={cls}
        />
      </F>
      <div className="md:col-span-2">
        <F label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={cls}
          />
        </F>
      </div>
      <div className="md:col-span-2">
        <StoreImageUploader
          organisationId={orgId}
          storeId={storeId || null}
          folder="promotions"
          value={heroImageUrl}
          onChange={setHeroImageUrl}
          label="Promotion image"
          aspect="wide"
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={isSponsored}
          onChange={(e) => setIsSponsored(e.target.checked)}
          className="size-4 accent-primary"
        />
        Sponsored (Taylor labels this to subscribers)
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="size-4 accent-primary"
        />
        Publish immediately
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Creating…" : "Create promotion"}
        </button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
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

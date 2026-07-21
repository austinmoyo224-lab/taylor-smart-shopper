import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createPromotion,
  deletePromotion,
  listProducts,
  listPromotions,
  updatePromotion,
} from "@/lib/portal.functions";
import { usePortal } from "@/lib/portal-context";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StoreImageUploader } from "@/components/StoreImageUploader";
import { X } from "lucide-react";

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

type PromoRow = {
  id: string;
  title: string;
  type: PromoType;
  store_id: string | null;
  is_sponsored: boolean;
  is_published: boolean;
  original_price: number | null;
  sale_price: number | null;
  currency_code: string;
  starts_at: string | null;
  ends_at: string | null;
  description?: string | null;
  hero_image_url?: string | null;
  metadata?: { gallery?: string[] } | null;
  promotion_products?: { product_id: string }[] | null;
};

function PromotionsPage() {
  const { activeOrgId, organisations, stores } = usePortal();
  const org = organisations.find((o) => o.id === activeOrgId);
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<PromoRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "promotions", activeOrgId],
    queryFn: () => listPromotions({ data: { organisation_id: activeOrgId } }),
    enabled: !!activeOrgId,
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Deals</p>
          <h1
            className="text-3xl italic tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Promotions
          </h1>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShow((v) => !v);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {show ? "Close" : "New promotion"}
        </button>
      </div>

      {(show || editing) && activeOrgId && (
        <PromoForm
          key={editing?.id ?? "new"}
          orgId={activeOrgId}
          currency={org?.default_currency ?? "ZAR"}
          stores={orgStores}
          initial={editing}
          onDone={() => {
            setShow(false);
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["portal", "promotions", activeOrgId] });
          }}
          onCancel={() => {
            setShow(false);
            setEditing(null);
          }}
        />
      )}

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {isLoading && <p className="text-sm text-muted">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted">No promotions yet.</p>
        )}
        {(data ?? []).map((p) => {
          const s = (p as { stores?: { name: string } | null }).stores;
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-[11px] capitalize text-muted">
                    {p.type.replace("_", " ")} · {s?.name ?? "All stores"}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] " +
                    (p.is_published
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/20 text-muted")
                  }
                >
                  {p.is_published ? "Live" : "Draft"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                {p.sale_price != null && (
                  <span className="text-foreground">
                    {p.currency_code} {p.sale_price}
                    {p.original_price && (
                      <span className="ml-1 text-[10px] line-through">{p.original_price}</span>
                    )}
                  </span>
                )}
                <span className="text-[11px]">
                  {p.starts_at ? new Date(p.starts_at).toLocaleDateString("en-ZA") : "—"} →{" "}
                  {p.ends_at ? new Date(p.ends_at).toLocaleDateString("en-ZA") : "—"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setShow(false);
                    setEditing(p as PromoRow);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                >
                  <Pencil className="size-3" /> Edit
                </button>
                <DeleteButton id={p.id} orgId={activeOrgId} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-muted">
                  No promotions yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((p) => {
              const s = (p as { stores?: { name: string } | null }).stores;
              const items = ((p as { promotion_products?: { products?: { name?: string | null } | { name?: string | null }[] | null }[] }).promotion_products ?? [])
                .flatMap((row) => {
                  const products = row.products;
                  if (!products) return [];
                  return Array.isArray(products) ? products : [products];
                })
                .map((product) => product.name)
                .filter(Boolean);
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
                  <td className="px-4 py-3 text-xs text-muted">
                    {items.length ? items.slice(0, 4).join(", ") : "—"}
                    {items.length > 4 ? ` +${items.length - 4}` : ""}
                  </td>
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
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShow(false);
                          setEditing(p as PromoRow);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] hover:bg-accent"
                      >
                        <Pencil className="size-3" /> Edit
                      </button>
                      <DeleteButton id={p.id} orgId={activeOrgId} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeleteButton({ id, orgId }: { id: string; orgId: string }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => deletePromotion({ data: { id, organisation_id: orgId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "promotions", orgId] }),
  });
  return (
    <button
      onClick={() => {
        if (confirm("Delete this promotion?")) mut.mutate();
      }}
      disabled={mut.isPending}
      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
    >
      <Trash2 className="size-3" /> {mut.isPending ? "…" : "Delete"}
    </button>
  );
}

function PromoForm({
  orgId,
  currency,
  stores,
  initial,
  onDone,
  onCancel,
}: {
  orgId: string;
  currency: string;
  stores: { id: string; name: string }[];
  initial?: PromoRow | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toLocal = (iso: string | null | undefined) =>
    iso ? new Date(iso).toISOString().slice(0, 16) : "";
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<PromoType>(initial?.type ?? "weekly_special");
  const [storeId, setStoreId] = useState<string>(initial?.store_id ?? "");
  const [isSponsored, setIsSponsored] = useState(initial?.is_sponsored ?? false);
  const [original, setOriginal] = useState(initial?.original_price?.toString() ?? "");
  const [sale, setSale] = useState(initial?.sale_price?.toString() ?? "");
  const [startsAt, setStartsAt] = useState(toLocal(initial?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocal(initial?.ends_at));
  const [publish, setPublish] = useState(initial?.is_published ?? false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initial?.hero_image_url ?? null);
  const [gallery, setGallery] = useState<string[]>(initial?.metadata?.gallery ?? []);
  const [productIds, setProductIds] = useState<string[]>(
    initial?.promotion_products?.map((row) => row.product_id).filter(Boolean) ?? [],
  );
  const [productIdsDirty, setProductIdsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;

  const products = useQuery({
    queryKey: ["portal", "products", orgId],
    queryFn: () => listProducts({ data: { organisation_id: orgId } }),
  });

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
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
          gallery_image_urls: gallery,
          // On edit, only send product_ids if the user actually changed the selection,
          // so we never wipe existing links when they just tweak the title/price.
          product_ids: isEdit && !productIdsDirty ? undefined : productIds,
      };
      return isEdit
        ? updatePromotion({ data: { ...payload, id: initial!.id } })
        : createPromotion({ data: payload });
    },
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
      className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 md:mb-8 md:grid-cols-2 md:p-5"
    >
      <div className="md:col-span-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {isEdit ? "Edit promotion" : "New promotion"}
        </p>
      </div>
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
          recommendedSize="1600×900px advert or 1080×1350px social card"
        />
      </div>
      <div className="md:col-span-2">
        <span className="mb-2 block text-[11px] font-medium text-muted">
          Additional images ({gallery.length}/20)
        </span>
        {gallery.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {gallery.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-background"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setGallery((g) => g.filter((_, i) => i !== idx))}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-muted shadow hover:text-destructive"
                  aria-label="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {gallery.length < 20 && (
          <StoreImageUploader
            key={`gallery-slot-${gallery.length}`}
            organisationId={orgId}
            storeId={storeId || null}
            folder="promotions"
            value={null}
            onChange={(url) => {
              if (url) setGallery((g) => [...g, url]);
            }}
            label="Add another image"
            aspect="wide"
            recommendedSize="Upload multiple — one at a time"
          />
        )}
      </div>
      <div className="md:col-span-2">
        <F label="Promotion items Taylor can use in recipes">
          <select
            multiple
            value={productIds}
            onChange={(e) => {
              setProductIds(
                Array.from(e.currentTarget.selectedOptions).map((option) => option.value),
              );
              setProductIdsDirty(true);
            }}
            className={cls + " min-h-32"}
          >
            {(products.data ?? []).map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.unit_amount && product.unit ? ` · ${product.unit_amount}${product.unit}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted">
            Hold Ctrl/Cmd to select multiple items. Taylor reads these when suggesting meals.
          </p>
        </F>
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
          {mut.isPending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
            ? "Save changes"
            : "Create promotion"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="ml-2 rounded-full border border-border px-4 py-2 text-sm"
        >
          Cancel
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

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/lib/portal.functions";
import { usePortal } from "@/lib/portal-context";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { StoreImageUploader } from "@/components/StoreImageUploader";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  unit: string | null;
  unit_amount: number | null;
  base_price: number | null;
  currency_code: string;
  is_available: boolean;
  description: string | null;
  images: unknown;
};

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0] as string;
  }
  return null;
}

export const Route = createFileRoute("/portal/products")({
  ssr: false,
  component: ProductsPage,
});

function ProductsPage() {
  const { activeOrgId, organisations } = usePortal();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const org = organisations.find((o) => o.id === activeOrgId);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "products", activeOrgId],
    queryFn: () => listProducts({ data: { organisation_id: activeOrgId } }),
    enabled: !!activeOrgId,
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      deleteProduct({ data: { id, organisation_id: activeOrgId! } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["portal", "products", activeOrgId] }),
  });

  const fmt = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: org?.default_currency ?? "ZAR",
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            Catalogue
          </p>
          <h1
            className="text-3xl md:text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Products
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
          {show ? "Close" : "New product"}
        </button>
      </div>

      {(show || editing) && activeOrgId && (
        <ProductForm
          orgId={activeOrgId}
          currency={org?.default_currency ?? "ZAR"}
          initial={editing}
          onDone={() => {
            setShow(false);
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["portal", "products", activeOrgId] });
          }}
        />
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-muted">
                  No products yet.
                </td>
              </tr>
            )}
            {((data as ProductRow[] | undefined) ?? []).map((p) => {
              const img = firstImage(p.images);
              return (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="size-12 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="size-12 rounded-lg border border-dashed border-border bg-background/60" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {p.name}
                  <div className="font-mono text-[10px] text-muted">{p.slug}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{p.sku ?? "—"}</td>
                <td className="px-4 py-3 text-muted">
                  {p.unit_amount && p.unit ? `${p.unit_amount} ${p.unit}` : (p.unit ?? "—")}
                </td>
                <td className="px-4 py-3">
                  {p.base_price != null ? fmt.format(Number(p.base_price)) : "—"}
                </td>
                <td className="px-4 py-3">{p.is_available ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setShow(false);
                        setEditing(p);
                      }}
                      className="inline-flex size-8 items-center justify-center rounded-full border border-border hover:bg-accent"
                      aria-label="Edit product"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id);
                      }}
                      className="inline-flex size-8 items-center justify-center rounded-full border border-border text-muted hover:text-destructive"
                      aria-label="Delete product"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
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

function ProductForm({
  orgId,
  currency,
  initial,
  onDone,
}: {
  orgId: string;
  currency: string;
  initial: ProductRow | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [unitAmount, setUnitAmount] = useState(
    initial?.unit_amount != null ? String(initial.unit_amount) : "",
  );
  const [basePrice, setBasePrice] = useState(
    initial?.base_price != null ? String(initial.base_price) : "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial ? firstImage(initial.images) : null,
  );
  const [available, setAvailable] = useState<boolean>(initial?.is_available ?? true);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation<unknown, Error, void>({
    mutationFn: () =>
      initial
        ? updateProduct({
            data: {
              id: initial.id,
              organisation_id: orgId,
              name,
              slug,
              sku,
              unit,
              unit_amount: unitAmount ? Number(unitAmount) : null,
              base_price: basePrice ? Number(basePrice) : null,
              currency_code: currency,
              description,
              image_url: imageUrl ?? "",
              is_available: available,
            },
          })
        : createProduct({
            data: {
              organisation_id: orgId,
              name,
              slug,
              sku,
              unit,
              unit_amount: unitAmount ? Number(unitAmount) : null,
              base_price: basePrice ? Number(basePrice) : null,
              currency_code: currency,
              description,
              image_url: imageUrl ?? "",
            },
          }),
    onSuccess: onDone,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mut.mutate();
      }}
      className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <StoreImageUploader
          organisationId={orgId}
          folder="products"
          label="Product picture"
          aspect="square"
          recommendedSize="1000×1000"
          accept="image/*"
          value={imageUrl}
          onChange={setImageUrl}
          className="max-w-xs"
        />
      </div>
      <F label="Name">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug)
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, ""),
              );
          }}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </F>
      <F label="Slug">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          pattern="[a-z0-9-]+"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
        />
      </F>
      <F label="SKU">
        <input
          value={sku ?? ""}
          onChange={(e) => setSku(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </F>
      <F label="Unit (e.g. g, ml, ea)">
        <input
          value={unit ?? ""}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </F>
      <F label="Unit amount">
        <input
          type="number"
          step="0.01"
          value={unitAmount}
          onChange={(e) => setUnitAmount(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </F>
      <F label={`Base price (${currency})`}>
        <input
          type="number"
          step="0.01"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </F>
      <div className="md:col-span-2">
        <F label="Description">
          <textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </F>
      </div>
      {initial && (
        <label className="md:col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="size-4 accent-primary"
          />
          Available for sale
        </label>
      )}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending
            ? initial
              ? "Saving…"
              : "Creating…"
            : initial
              ? "Save changes"
              : "Create product"}
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

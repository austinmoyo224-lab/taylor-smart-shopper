import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createProduct, listProducts } from "@/lib/portal.functions";
import { usePortal } from "@/lib/portal-context";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/portal/products")({
  ssr: false,
  component: ProductsPage,
});

function ProductsPage() {
  const { activeOrgId, organisations } = usePortal();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const org = organisations.find((o) => o.id === activeOrgId);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "products", activeOrgId],
    queryFn: () => listProducts({ data: { organisation_id: activeOrgId } }),
    enabled: !!activeOrgId,
  });

  const fmt = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: org?.default_currency ?? "ZAR",
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            Catalogue
          </p>
          <h1
            className="text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Products
          </h1>
        </div>
        <button
          onClick={() => setShow((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {show ? "Close" : "New product"}
        </button>
      </div>

      {show && activeOrgId && (
        <NewProductForm
          orgId={activeOrgId}
          currency={org?.default_currency ?? "ZAR"}
          onDone={() => {
            setShow(false);
            void qc.invalidateQueries({ queryKey: ["portal", "products", activeOrgId] });
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Available</th>
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
                  No products yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewProductForm({
  orgId,
  currency,
  onDone,
}: {
  orgId: string;
  currency: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [unitAmount, setUnitAmount] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createProduct({
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
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </F>
      <F label="Unit (e.g. g, ml, ea)">
        <input
          value={unit}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </F>
      </div>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Creating…" : "Create product"}
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

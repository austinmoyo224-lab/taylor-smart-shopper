import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createStore } from "@/lib/portal.functions";
import { usePortal } from "@/lib/portal-context";
import { Plus, Copy, Edit3 } from "lucide-react";

export const Route = createFileRoute("/portal/stores/")({
  ssr: false,
  component: StoresPage,
});

function StoresPage() {
  const { stores, organisations, activeOrgId } = usePortal();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);
  const org = organisations.find((o) => o.id === activeOrgId);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            {org?.name}
          </p>
          <h1
            className="text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Stores
          </h1>
        </div>
        <button
          onClick={() => setShow((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {show ? "Close" : "New store"}
        </button>
      </div>

      {show && activeOrgId && (
        <NewStoreForm
          orgId={activeOrgId}
          onDone={() => {
            setShow(false);
            void qc.invalidateQueries({ queryKey: ["portal", "context"] });
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Store ID</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Public</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orgStores.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-muted">
                  No stores yet. Add your first one.
                </td>
              </tr>
            )}
            {orgStores.map((s) => {
              const row = s as typeof s & {
                qr_slug?: string | null;
                city?: string | null;
                country_code?: string | null;
                is_public?: boolean | null;
              };
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {s.name}
                    <div className="font-mono text-[10px] text-muted">{s.slug}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(s.id)}
                      className="inline-flex max-w-[150px] items-center gap-1 truncate hover:text-primary"
                      title="Copy Store ID"
                    >
                      <Copy className="size-3 shrink-0" />
                      <span className="truncate">{s.id}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.qr_slug ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {[row.city, row.country_code].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{s.status}</td>
                  <td className="px-4 py-3">{row.is_public ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/portal/stores/$storeId"
                      params={{ storeId: s.id }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
                    >
                      <Edit3 className="size-3" /> Control
                    </Link>
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

function NewStoreForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"draft" | "pending" | "active" | "paused" | "archived">("pending");
  const [error, setError] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () =>
      createStore({
        data: { organisation_id: orgId, name, slug, city, country_code: "ZA", status },
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
      <Field label="Name">
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
      </Field>
      <Field label="Slug">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          pattern="[a-z0-9-]+"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
        />
      </Field>
      <Field label="City">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Status">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="pending">Pending review</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Creating…" : "Create store"}
        </button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

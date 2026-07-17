import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listStores, listOrganisations } from "@/lib/admin.functions";
import { createStore } from "@/lib/portal.functions";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/stores")({
  ssr: false,
  component: StoresPage,
});

function StoresPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: () => listStores(),
  });
  const orgs = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => listOrganisations(),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Retail</p>
          <h1
            className="text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Stores
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          disabled={(orgs.data?.length ?? 0) === 0}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          title={
            (orgs.data?.length ?? 0) === 0 ? "Create an organisation first" : "Create a new store"
          }
        >
          <Plus className="size-4" />
          {showForm ? "Close" : "New store"}
        </button>
      </div>

      {showForm && (orgs.data?.length ?? 0) > 0 && (
        <NewStoreForm
          organisations={orgs.data ?? []}
          onCreated={() => {
            setShowForm(false);
            void qc.invalidateQueries({ queryKey: ["admin", "stores"] });
            void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
            void qc.invalidateQueries({ queryKey: ["portal", "context"] });
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Public</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  No stores yet. Use “New store” above to create one, or manage from the Store
                  Portal.
                </td>
              </tr>
            )}
            {(data ?? []).map((s) => {
              const org = (s as { organisations?: { name: string } | null }).organisations;
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {s.name}
                    <div className="font-mono text-[10px] text-muted">{s.slug}</div>
                  </td>
                  <td className="px-4 py-3">{org?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {[s.city, s.country_code].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{s.status}</td>
                  <td className="px-4 py-3">{s.is_public ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewStoreForm({
  organisations,
  onCreated,
}: {
  organisations: { id: string; name: string; country_code: string }[];
  onCreated: () => void;
}) {
  const [orgId, setOrgId] = useState(organisations[0]?.id ?? "");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "paused" | "archived">("draft");
  const [error, setError] = useState<string | null>(null);
  const country =
    organisations.find((o) => o.id === orgId)?.country_code?.toUpperCase() || "ZA";
  const mut = useMutation({
    mutationFn: () =>
      createStore({
        data: {
          organisation_id: orgId,
          name,
          slug,
          city,
          country_code: country,
          status,
        },
      }),
    onSuccess: onCreated,
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
      <Field label="Organisation">
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          required
        >
          {organisations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
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
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending || !orgId}
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
      <span className="mb-1 block text-[11px] font-mono uppercase tracking-widest text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createOrganisation, listOrganisations } from "@/lib/admin.functions";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/organisations")({
  ssr: false,
  component: OrganisationsPage,
});

function OrganisationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => listOrganisations(),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Tenants</p>
          <h1
            className="text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Organisations
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {showForm ? "Close" : "New organisation"}
        </button>
      </div>

      {showForm && (
        <NewOrgForm
          onCreated={() => {
            setShowForm(false);
            void qc.invalidateQueries({ queryKey: ["admin", "orgs"] });
            void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={7}>
                  No organisations yet. Create the first one to onboard a retailer, brand or
                  partner.
                </td>
              </tr>
            )}
            {(data ?? []).map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{o.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{o.slug}</td>
                <td className="px-4 py-3 capitalize">{o.type.replace("_", " ")}</td>
                <td className="px-4 py-3">{o.country_code}</td>
                <td className="px-4 py-3">{o.default_currency}</td>
                <td className="px-4 py-3 text-muted">{o.contact_email ?? "—"}</td>
                <td className="px-4 py-3">
                  {o.is_active ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] text-muted">
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewOrgForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"retail_group" | "brand" | "partner" | "independent">(
    "retail_group",
  );
  const [contactEmail, setContactEmail] = useState("");
  const [country, setCountry] = useState("ZA");
  const [currency, setCurrency] = useState("ZAR");
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createOrganisation({
        data: {
          name,
          slug,
          type,
          country_code: country,
          default_currency: currency,
          contact_email: contactEmail,
        },
      }),
    onSuccess: () => {
      setName("");
      setSlug("");
      setContactEmail("");
      onCreated();
    },
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
      <FormField label="Name">
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
      </FormField>
      <FormField label="Slug">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          pattern="[a-z0-9-]+"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
        />
      </FormField>
      <FormField label="Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="retail_group">Retail group</option>
          <option value="brand">Brand</option>
          <option value="partner">Partner</option>
          <option value="independent">Independent</option>
        </select>
      </FormField>
      <FormField label="Contact email">
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Country">
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
          maxLength={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Currency">
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          maxLength={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </FormField>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Creating…" : "Create organisation"}
        </button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

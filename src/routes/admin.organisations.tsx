import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createOrganisation,
  listOrganisations,
  updateOrganisation,
  deleteOrganisation,
} from "@/lib/admin.functions";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Paginator, usePaged } from "@/components/Paginator";

export const Route = createFileRoute("/admin/organisations")({
  ssr: false,
  component: OrganisationsPage,
});

function OrganisationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OrgRow | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => listOrganisations(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "orgs"] });
    void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => deleteOrganisation({ data: { id } }),
    onSuccess: invalidate,
  });
  const pager = usePaged(data ?? undefined);

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
            invalidate();
          }}
        />
      )}

      {editing && (
        <EditOrgForm
          org={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
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
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={8}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={8}>
                  No organisations yet. Create the first one to onboard a retailer, brand or
                  partner.
                </td>
              </tr>
            )}
            {pager.paged.map((o) => (
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
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditing(o as OrgRow)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-accent"
                    >
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Delete organisation "${o.name}"? This archives it and hides it from the platform.`,
                          )
                        )
                          del.mutate(o.id);
                      }}
                      disabled={del.isPending}
                      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    >
                      <Trash2 className="size-3" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginator
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        start={pager.start}
        end={pager.end}
        onPageChange={pager.setPage}
      />
    </div>
  );
}

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  type: "retail_group" | "brand" | "partner" | "independent";
  country_code: string;
  default_currency: string;
  contact_email: string | null;
  is_active: boolean;
};

function EditOrgForm({
  org,
  onSaved,
  onClose,
}: {
  org: OrgRow;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [type, setType] = useState<OrgRow["type"]>(org.type);
  const [contactEmail, setContactEmail] = useState(org.contact_email ?? "");
  const [country, setCountry] = useState(org.country_code);
  const [currency, setCurrency] = useState(org.default_currency);
  const [isActive, setIsActive] = useState(org.is_active);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      updateOrganisation({
        data: {
          id: org.id,
          name,
          slug,
          type,
          country_code: country,
          default_currency: currency,
          contact_email: contactEmail,
          is_active: isActive,
        },
      }),
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mut.mutate();
      }}
      className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 md:grid-cols-2"
    >
      <div className="md:col-span-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Editing · {org.name}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <FormField label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          onChange={(e) => setType(e.target.value as OrgRow["type"])}
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
      <label className="flex items-center gap-2 text-xs md:col-span-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Saving…" : "Save changes"}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </form>
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

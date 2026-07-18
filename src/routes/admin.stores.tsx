import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listStores, listOrganisations } from "@/lib/admin.functions";
import {
  createStore,
  deleteStore,
  getStore,
  getStoreSubscriberDashboard,
  regenerateStoreCode,
  updateStore,
  approveStore,
} from "@/lib/portal.functions";
import { BarChart3, Copy, Edit3, LayoutDashboard, MapPin, Plus, QrCode, Trash2, Users } from "lucide-react";
import QRCode from "qrcode";
import { StoreImageUploader } from "@/components/StoreImageUploader";
import { downloadBrandedStoreQr } from "@/lib/qr-composer";

export const Route = createFileRoute("/admin/stores")({
  ssr: false,
  component: StoresPage,
});

function StoresPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: () => listStores(),
  });
  const orgs = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => listOrganisations(),
  });

  useEffect(() => {
    if (!selectedStoreId && data?.[0]) setSelectedStoreId(data[0].id);
  }, [data, selectedStoreId]);

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
          onCreated={(id) => {
            setSelectedStoreId(id);
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
              <th className="px-4 py-3">Store ID</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Public</th>
              <th className="px-4 py-3"></th>
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
                  No stores yet. Use “New store” above to create one, or manage from the Store
                  Portal.
                </td>
              </tr>
            )}
            {(data ?? []).map((s) => {
              const org = (s as { organisations?: { name: string } | null }).organisations;
              const active = selectedStoreId === s.id;
              return (
                <tr key={s.id} className={"border-t border-border " + (active ? "bg-primary/5" : "")}>
                  <td className="px-4 py-3 font-medium">
                    {s.name}
                    <div className="font-mono text-[10px] text-muted">{s.slug}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(s.id)}
                      className="max-w-[150px] truncate hover:text-primary"
                      title="Copy Store ID"
                    >
                      {s.id}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.qr_slug ?? "—"}</td>
                  <td className="px-4 py-3">{org?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {[s.city, s.country_code].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3">{s.is_public ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {s.status === "pending" && (
                        <ApproveButton
                          storeId={s.id}
                          onDone={() => {
                            void qc.invalidateQueries({ queryKey: ["admin", "stores"] });
                            void qc.invalidateQueries({ queryKey: ["admin", "store", s.id] });
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedStoreId(s.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
                      >
                        <Edit3 className="size-3" /> Control
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedStoreId && (
        <StoreControlPanel
          storeId={selectedStoreId}
          onDeleted={() => {
            setSelectedStoreId(null);
            void qc.invalidateQueries({ queryKey: ["admin", "stores"] });
            void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
            void qc.invalidateQueries({ queryKey: ["portal", "context"] });
          }}
        />
      )}
    </div>
  );
}

function NewStoreForm({
  organisations,
  onCreated,
}: {
  organisations: { id: string; name: string; country_code: string }[];
  onCreated: (id: string) => void;
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
    onSuccess: (r) => onCreated(r.id),
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

type StoreData = Awaited<ReturnType<typeof getStore>>;

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function StoreControlPanel({ storeId, onDeleted }: { storeId: string; onDeleted: () => void }) {
  const qc = useQueryClient();
  const store = useQuery({
    queryKey: ["admin", "store", storeId],
    queryFn: () => getStore({ data: { store_id: storeId } }),
  });
  const subscribers = useQuery({
    queryKey: ["admin", "store", storeId, "subscribers"],
    queryFn: () => getStoreSubscriberDashboard({ data: { store_id: storeId } }),
  });

  if (store.isLoading) {
    return <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted">Loading store controls…</div>;
  }
  if (store.error || !store.data) {
    return <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-destructive">Could not load this store.</div>;
  }

  return (
    <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <StoreProfileForm
          store={store.data}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["admin", "store", storeId] });
            void qc.invalidateQueries({ queryKey: ["admin", "stores"] });
            void qc.invalidateQueries({ queryKey: ["portal", "context"] });
          }}
        />
      </div>
      <div className="space-y-6">
        <StoreIdentityPanel
          store={store.data}
          onChanged={() => {
            void qc.invalidateQueries({ queryKey: ["admin", "store", storeId] });
            void qc.invalidateQueries({ queryKey: ["admin", "stores"] });
          }}
        />
        <DashboardLinks store={store.data} />
        <SubscriberSummary count={subscribers.data?.count ?? 0} loading={subscribers.isLoading} />
        <DeleteStore store={store.data} onDeleted={onDeleted} />
      </div>
    </section>
  );
}

function StoreProfileForm({ store, onSaved }: { store: StoreData; onSaved: () => void }) {
  const [form, setForm] = useState(store);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(store), [store]);

  const save = useMutation({
    mutationFn: () =>
      updateStore({
        data: {
          store_id: store.id,
          name: form.name,
          slug: form.slug,
          status: form.status as "draft" | "active" | "paused" | "archived",
          description: form.description ?? null,
          logo_url: form.logo_url ?? null,
          hero_image_url: form.hero_image_url ?? null,
          address_line1: form.address_line1 ?? null,
          address_line2: form.address_line2 ?? null,
          city: form.city ?? null,
          region: form.region ?? null,
          postal_code: form.postal_code ?? null,
          country_code: form.country_code,
          latitude: form.latitude == null ? null : Number(form.latitude),
          longitude: form.longitude == null ? null : Number(form.longitude),
          timezone: form.timezone,
          contact_email: form.contact_email ?? "",
          contact_phone: form.contact_phone ?? "",
          is_public: form.is_public,
        },
      }),
    onSuccess: () => {
      setOk(true);
      setError(null);
      onSaved();
      window.setTimeout(() => setOk(false), 1800);
    },
    onError: (e: Error) => setError(e.message),
  });

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        })),
      (err) => setError(err.message),
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Store profile</p>
          <h2 className="text-2xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Edit {store.name}
          </h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
          {form.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Store name">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} required />
        </Field>
        <Field label="Public slug">
          <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className={`${inputClass} font-mono`} pattern="[a-z0-9-]+" required />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StoreData["status"] }))} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Visibility">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_public} onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))} />
            Publicly discoverable
          </label>
        </Field>
        <Field label="Contact email">
          <input type="email" value={form.contact_email ?? ""} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Contact phone">
          <input value={form.contact_phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} className={inputClass} placeholder="+27 …" />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <textarea value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${inputClass} min-h-24`} />
        </Field>
        <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <StoreImageUploader
            organisationId={store.organisation_id}
            storeId={store.id}
            folder="logo"
            value={form.logo_url}
            onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
            label="Store logo"
            aspect="square"
          />
          <StoreImageUploader
            organisationId={store.organisation_id}
            storeId={store.id}
            folder="hero"
            value={form.hero_image_url}
            onChange={(url) => setForm((f) => ({ ...f, hero_image_url: url }))}
            label="Hero image"
            aspect="wide"
          />
        </div>
      </div>

      <p className="mt-6 mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">Location & GPS</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Address line 1" className="md:col-span-2">
          <input value={form.address_line1 ?? ""} onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Address line 2" className="md:col-span-2">
          <input value={form.address_line2 ?? ""} onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="City">
          <input value={form.city ?? ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Region / province">
          <input value={form.region ?? ""} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Postal code">
          <input value={form.postal_code ?? ""} onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Country code">
          <input value={form.country_code} onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value.toUpperCase().slice(0, 2) }))} className={`${inputClass} font-mono uppercase`} maxLength={2} />
        </Field>
        <Field label="Latitude">
          <input type="number" step="0.0000001" value={form.latitude ?? ""} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value === "" ? null : Number(e.target.value) }))} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Longitude">
          <input type="number" step="0.0000001" value={form.longitude ?? ""} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value === "" ? null : Number(e.target.value) }))} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Timezone" className="md:col-span-2">
          <input value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} className={`${inputClass} font-mono`} />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={useMyLocation} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs hover:bg-accent">
          <MapPin className="size-3.5" /> Use current GPS
        </button>
        {form.latitude != null && form.longitude != null && (
          <a href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-2 text-xs hover:bg-accent">
            Open in Maps
          </a>
        )}
        <button type="submit" disabled={save.isPending} className="ml-auto rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
          {save.isPending ? "Saving…" : "Save store profile"}
        </button>
      </div>
      {ok && <p className="mt-2 text-xs text-primary">Saved.</p>}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </form>
  );
}

function StoreIdentityPanel({ store, onChanged }: { store: StoreData; onChanged: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${store.qr_slug}` : "";
  const regen = useMutation({
    mutationFn: () => regenerateStoreCode({ data: { store_id: store.id } }),
    onSuccess: onChanged,
  });

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, { width: 320, margin: 1, color: { dark: "#0F1B3D", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [joinUrl]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Store identity</p>
          <h3 className="text-lg font-medium">Codes & QR</h3>
        </div>
        <QrCode className="size-5 text-primary/70" />
      </div>
      <CopyLine label="Unique Store ID" value={store.id} />
      <CopyLine label="Unique Store Code" value={store.qr_slug} />
      <CopyLine label="Unique Invitation Link" value={joinUrl} />
      {dataUrl && <img src={dataUrl} alt="Unique store QR code" className="mt-3 w-full rounded-xl border border-border bg-white p-3" />}
      <div className="mt-3 flex flex-wrap gap-2">
        {dataUrl && (
          <button
            type="button"
            onClick={() =>
              downloadBrandedStoreQr({
                storeName: store.name,
                joinUrl,
                logoUrl: store.logo_url ?? null,
                qrCode: dataUrl,
                filename: `taylor-${store.qr_slug}.png`,
              })
            }
            className="rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
          >
            Download branded QR
          </button>
        )}
        <button type="button" onClick={() => regen.mutate()} disabled={regen.isPending} className="rounded-full bg-primary px-3 py-1 text-[11px] text-primary-foreground disabled:opacity-60">
          {regen.isPending ? "Generating…" : "Regenerate code"}
        </button>
      </div>
      {regen.error && <p className="mt-2 text-[11px] text-destructive">{(regen.error as Error).message}</p>}
    </div>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 rounded-lg border border-border bg-background px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{value}</code>
        <button type="button" onClick={() => navigator.clipboard.writeText(value)} className="rounded p-1 text-muted hover:bg-accent hover:text-foreground" aria-label={`Copy ${label}`}>
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function DashboardLinks({ store }: { store: StoreData }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Dashboards</p>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
        <Link to="/portal/stores/$storeId" params={{ storeId: store.id }} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent">
          <LayoutDashboard className="size-3.5" /> Store Dashboard
        </Link>
        <Link to="/portal/analytics" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent">
          <BarChart3 className="size-3.5" /> Analytics Dashboard
        </Link>
      </div>
    </div>
  );
}

function SubscriberSummary({ count, loading }: { count: number; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Subscriber dashboard</p>
          <p className="mt-1 text-3xl font-semibold">{loading ? "—" : count}</p>
          <p className="text-xs text-muted">Active followers</p>
        </div>
        <Users className="size-5 text-primary/70" />
      </div>
    </div>
  );
}

function DeleteStore({ store, onDeleted }: { store: StoreData; onDeleted: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () => deleteStore({ data: { store_id: store.id } }),
    onSuccess: onDeleted,
    onError: (e: Error) => setError(e.message),
  });
  return (
    <div className="rounded-2xl border border-destructive/25 bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">Delete store</p>
      <p className="mt-1 text-xs text-muted">Archives the store and disables its QR code and invitation link.</p>
      <button
        type="button"
        disabled={mut.isPending}
        onClick={() => {
          setError(null);
          if (confirm(`Delete ${store.name}? This will archive the store and disable its invitation link.`)) mut.mutate();
        }}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
      >
        <Trash2 className="size-3.5" /> {mut.isPending ? "Deleting…" : "Delete store"}
      </button>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"block " + (className ?? "")}>
      <span className="mb-1 block text-[11px] font-mono uppercase tracking-widest text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

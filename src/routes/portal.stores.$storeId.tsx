import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  getStore,
  updateStore,
  regenerateStoreCode,
  listStoreAssets,
  deleteStoreAsset,
  deleteStore,
  getStoreSubscriberDashboard,
} from "@/lib/portal.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  MapPin,
  RefreshCw,
  QrCode as QrIcon,
  Copy,
  Trash2,
  Upload,
  Locate,
  BarChart3,
  Users,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/portal/stores/$storeId")({
  ssr: false,
  component: StoreDetailPage,
});

function StoreDetailPage() {
  const { storeId } = useParams({ from: "/portal/stores/$storeId" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const store = useQuery({
    queryKey: ["portal", "store", storeId],
    queryFn: () => getStore({ data: { store_id: storeId } }),
  });

  if (store.isLoading) return <Full>Loading store…</Full>;
  if (store.error || !store.data)
    return <Full>Could not load store: {(store.error as Error)?.message}</Full>;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <Link
        to="/portal/stores"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to stores
      </Link>

      <div className="mb-8">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          Store profile
        </p>
        <h1
          className="text-4xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {store.data.name}
        </h1>
        <p className="mt-1 text-xs text-muted">
          {store.data.city ?? "—"} · {store.data.country_code}
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Unique Store ID: <span className="select-all text-foreground">{store.data.id}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ProfileForm store={store.data} onSaved={() => qc.invalidateQueries({ queryKey: ["portal", "store", storeId] })} />
          <AssetsPanel organisationId={store.data.organisation_id} storeId={store.data.id} />
        </div>
        <div className="space-y-6">
          <CodePanel
            storeId={store.data.id}
            qrSlug={store.data.qr_slug}
            onChanged={() => qc.invalidateQueries({ queryKey: ["portal", "store", storeId] })}
          />
          <StoreDashboardPanel storeId={store.data.id} storeName={store.data.name} />
          <SubscriberDashboardPanel storeId={store.data.id} />
          <DeleteStorePanel
            storeName={store.data.name}
            onDelete={async () => {
              await deleteStore({ data: { store_id: store.data.id } });
              await qc.invalidateQueries({ queryKey: ["portal", "context"] });
              void navigate({ to: "/portal/stores" });
            }}
          />
        </div>
      </div>
    </div>
  );
}

type StoreData = Awaited<ReturnType<typeof getStore>>;

function ProfileForm({ store, onSaved }: { store: StoreData; onSaved: () => void }) {
  const [form, setForm] = useState(store);
  useEffect(() => setForm(store), [store]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const mut = useMutation({
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
          latitude: form.latitude != null ? Number(form.latitude) : null,
          longitude: form.longitude != null ? Number(form.longitude) : null,
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
      window.setTimeout(() => setOk(false), 2000);
    },
    onError: (e: Error) => setError(e.message),
  });

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
      },
      (err) => setError(err.message),
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mut.mutate();
      }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h2
        className="mb-4 text-2xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Profile
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Store name">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
            required
          />
        </Field>
        <Field label="Slug">
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="input font-mono"
            pattern="[a-z0-9-]+"
            required
          />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as StoreData["status"] }))
            }
            className="input"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Visibility">
          <label className="flex items-center gap-2 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
            />
            Publicly discoverable
          </label>
        </Field>
        <Field label="Contact email" className="md:col-span-1">
          <input
            type="email"
            value={form.contact_email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="Contact phone">
          <input
            value={form.contact_phone ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
            className="input"
            placeholder="+27 …"
          />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input min-h-[80px]"
          />
        </Field>
      </div>

      <h3 className="mt-6 mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
        Location
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Address line 1" className="md:col-span-2">
          <input
            value={form.address_line1 ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="Address line 2" className="md:col-span-2">
          <input
            value={form.address_line2 ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="City">
          <input
            value={form.city ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="Region / Province">
          <input
            value={form.region ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="Postal code">
          <input
            value={form.postal_code ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="Country code">
          <input
            value={form.country_code}
            onChange={(e) =>
              setForm((f) => ({ ...f, country_code: e.target.value.toUpperCase().slice(0, 2) }))
            }
            className="input font-mono uppercase"
            maxLength={2}
          />
        </Field>
        <Field label="Latitude">
          <input
            type="number"
            step="0.0000001"
            value={form.latitude ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                latitude: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            className="input font-mono"
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="0.0000001"
            value={form.longitude ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                longitude: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            className="input font-mono"
          />
        </Field>
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Locate className="size-3.5" /> Use my current GPS
          </button>
          {form.latitude != null && form.longitude != null && (
            <a
              href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              <MapPin className="size-3.5" /> Open in Maps
            </a>
          )}
        </div>
        <Field label="Timezone" className="md:col-span-2">
          <input
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            className="input font-mono"
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Saving…" : "Save changes"}
        </button>
        {ok && <span className="text-xs text-primary">Saved.</span>}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      <style>{`
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
        .input:focus { outline: none; border-color: hsl(var(--primary)); }
      `}</style>
    </form>
  );
}

function CodePanel({
  storeId,
  qrSlug,
  onChanged,
}: {
  storeId: string;
  qrSlug: string;
  onChanged: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${qrSlug}` : "";

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      width: 360,
      margin: 1,
      color: { dark: "#0F1B3D", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [joinUrl]);

  const regen = useMutation({
    mutationFn: () => regenerateStoreCode({ data: { store_id: storeId } }),
    onSuccess: onChanged,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Store code</p>
          <h3 className="text-lg font-medium">Invite subscribers</h3>
        </div>
        <QrIcon className="size-5 text-primary/70" />
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <code className="flex-1 font-mono text-sm">{qrSlug}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(qrSlug)}
          aria-label="Copy code"
          className="rounded p-1 text-muted hover:bg-accent hover:text-foreground"
        >
          <Copy className="size-3.5" />
        </button>
      </div>

      <div className="mb-3 rounded-lg border border-border bg-background px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Store ID</p>
        <code className="block truncate font-mono text-[11px]">{storeId}</code>
      </div>

      {dataUrl && (
        <img
          src={dataUrl}
          alt="Store QR"
          className="mb-3 w-full rounded-xl border border-border bg-white p-3"
        />
      )}

      <div className="space-y-2 text-xs">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Join link</p>
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-[11px] text-primary hover:underline"
          >
            {joinUrl}
          </a>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(joinUrl)}
            className="rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
          >
            Copy link
          </button>
          {dataUrl && (
            <a
              href={dataUrl}
              download={`taylor-qr-${qrSlug}.png`}
              className="rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
            >
              Download QR
            </a>
          )}
          <button
            type="button"
            onClick={() => regen.mutate()}
            disabled={regen.isPending}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] text-primary-foreground disabled:opacity-60"
          >
            <RefreshCw className={"size-3 " + (regen.isPending ? "animate-spin" : "")} />
            Regenerate
          </button>
        </div>
        {regen.error && (
          <p className="text-[11px] text-destructive">{(regen.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}

function StoreDashboardPanel({ storeId, storeName }: { storeId: string; storeName: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Store dashboard
          </p>
          <h3 className="text-lg font-medium">Manage {storeName}</h3>
        </div>
        <BarChart3 className="size-5 text-primary/70" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Link
          to="/portal/products"
          className="rounded-lg border border-border px-3 py-2 hover:bg-accent"
        >
          Products
        </Link>
        <Link
          to="/portal/promotions"
          className="rounded-lg border border-border px-3 py-2 hover:bg-accent"
        >
          Promotions
        </Link>
        <Link
          to="/portal/campaigns"
          className="rounded-lg border border-border px-3 py-2 hover:bg-accent"
        >
          Campaigns
        </Link>
        <Link
          to="/portal/analytics"
          className="rounded-lg border border-border px-3 py-2 hover:bg-accent"
        >
          Analytics
        </Link>
      </div>
      <a
        href={`/join/${storeId}`}
        onClick={(e) => e.preventDefault()}
        className="mt-3 hidden items-center gap-1 text-[11px] text-muted"
      >
        <ExternalLink className="size-3" /> Internal store reference
      </a>
    </div>
  );
}

function SubscriberDashboardPanel({ storeId }: { storeId: string }) {
  const subs = useQuery({
    queryKey: ["portal", "store", storeId, "subscribers"],
    queryFn: () => getStoreSubscriberDashboard({ data: { store_id: storeId } }),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Subscriber dashboard
          </p>
          <h3 className="text-lg font-medium">Followers</h3>
        </div>
        <Users className="size-5 text-primary/70" />
      </div>
      <p className="text-3xl font-semibold">{subs.data?.count ?? "—"}</p>
      <p className="mb-3 text-xs text-muted">Active store subscribers</p>
      {subs.isLoading ? (
        <p className="text-xs text-muted">Loading…</p>
      ) : (subs.data?.recent ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
          No subscribers yet. Share the invitation link or QR code.
        </p>
      ) : (
        <ul className="space-y-2">
          {(subs.data?.recent ?? []).slice(0, 5).map((s) => (
            <li key={`${s.user_id}-${s.subscribed_at}`} className="flex items-center gap-2 text-xs">
              {s.profile?.avatar_url ? (
                <img src={s.profile.avatar_url} alt="" className="size-7 rounded-full object-cover" />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] text-primary">
                  {(s.profile?.display_name ?? s.profile?.first_name ?? "U").slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">
                {s.profile?.display_name ?? s.profile?.first_name ?? s.profile?.email ?? "Subscriber"}
              </span>
              <span className="font-mono text-[10px] text-muted">{s.source ?? "app"}</span>
            </li>
          ))}
        </ul>
      )}
      {subs.error && <p className="mt-2 text-[11px] text-destructive">{(subs.error as Error).message}</p>}
    </div>
  );
}

function DeleteStorePanel({ storeName, onDelete }: { storeName: string; onDelete: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: onDelete,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="rounded-2xl border border-destructive/25 bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-destructive">
        Delete store
      </p>
      <p className="mt-1 text-xs text-muted">
        This archives the store, disables its invitation QR code and removes it from dashboards.
      </p>
      <button
        type="button"
        disabled={mut.isPending}
        onClick={() => {
          setError(null);
          if (confirm(`Delete ${storeName}? This will archive the store and disable its invite link.`)) {
            mut.mutate();
          }
        }}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
      >
        <Trash2 className="size-3.5" /> {mut.isPending ? "Deleting…" : "Delete store"}
      </button>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function AssetsPanel({
  organisationId,
  storeId,
}: {
  organisationId: string;
  storeId: string;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assets = useQuery({
    queryKey: ["portal", "assets", organisationId, storeId],
    queryFn: () =>
      listStoreAssets({ data: { organisation_id: organisationId, store_id: storeId } }),
  });

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${organisationId}/${storeId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("store-assets")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
      }
      await qc.invalidateQueries({ queryKey: ["portal", "assets", organisationId, storeId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const del = useMutation({
    mutationFn: (path: string) =>
      deleteStoreAsset({ data: { organisation_id: organisationId, path } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["portal", "assets", organisationId, storeId] }),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Media library
          </p>
          <h2
            className="text-2xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Files & creatives
          </h2>
          <p className="mt-1 text-xs text-muted">
            Upload logos, hero images, campaign banners, promotion artwork and PDFs. Copy a URL to
            drop it into a promotion or campaign.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload files"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,video/mp4"
          onChange={(e) => onPick(e.target.files)}
          className="hidden"
        />
      </div>
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {assets.isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (assets.data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No files yet. Upload your first creative to use it in a promotion or campaign.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {(assets.data ?? []).map((a) => (
            <li
              key={a.path}
              className="group relative overflow-hidden rounded-xl border border-border bg-background"
            >
              {/\.(png|jpe?g|webp|gif|svg)$/i.test(a.name) ? (
                <img src={a.url} alt={a.name} className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 items-center justify-center bg-accent text-xs text-muted">
                  {a.name.split(".").pop()?.toUpperCase() ?? "FILE"}
                </div>
              )}
              <div className="p-2">
                <p className="truncate text-[11px]" title={a.name}>
                  {a.name}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(a.url)}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px] hover:bg-accent"
                  >
                    Copy URL
                  </button>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-2 py-0.5 text-[10px] hover:bg-accent"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete ${a.name}?`)) del.mutate(a.path);
                    }}
                    className="ml-auto rounded-full p-1 text-muted hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
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
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function Full({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted">
      {children}
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createCoupon, listCoupons } from "@/lib/portal.functions";
import { usePortal } from "@/lib/portal-context";
import { Plus, QrCode, X } from "lucide-react";
import { Paginator, usePaged } from "@/components/Paginator";

export const Route = createFileRoute("/portal/coupons")({
  ssr: false,
  component: CouponsPage,
});

type CouponStatus = "draft" | "active" | "paused" | "expired" | "archived";

function CouponsPage() {
  const { activeOrgId, organisations, stores } = usePortal();
  const org = organisations.find((o) => o.id === activeOrgId);
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [qrCoupon, setQrCoupon] = useState<{ code: string; title: string; payload: string } | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "coupons", activeOrgId],
    queryFn: () => listCoupons({ data: { organisation_id: activeOrgId } }),
    enabled: !!activeOrgId,
  });
  const pager = usePaged(data ?? undefined);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Rewards</p>
          <h1
            className="text-3xl md:text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Coupons
          </h1>
        </div>
        <button
          onClick={() => setShow((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="size-4" />
          {show ? "Close" : "New coupon"}
        </button>
      </div>

      {show && activeOrgId && (
        <NewCouponForm
          orgId={activeOrgId}
          currency={org?.default_currency ?? "ZAR"}
          stores={orgStores}
          onDone={() => {
            setShow(false);
            void qc.invalidateQueries({ queryKey: ["portal", "coupons", activeOrgId] });
          }}
        />
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Usage cap</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">QR</th>
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
                  No coupons yet.
                </td>
              </tr>
            )}
            {pager.paged.map((c) => {
              const storeName = c.store_id
                ? orgStores.find((s) => s.id === c.store_id)?.name ?? "—"
                : "All stores";
              return (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-sm">{c.code}</td>
                <td className="px-4 py-3">{c.title}</td>
                <td className="px-4 py-3 text-muted">{storeName}</td>
                <td className="px-4 py-3">
                  {c.discount_percent
                    ? `${c.discount_percent}%`
                    : c.discount_amount
                      ? `${c.currency_code} ${c.discount_amount}`
                      : "—"}
                </td>
                <td className="px-4 py-3 text-muted">{c.usage_limit_total ?? "∞"}</td>
                <td className="px-4 py-3 text-[11px] text-muted">
                  {c.starts_at ? new Date(c.starts_at).toLocaleDateString("en-ZA") : "—"}
                  {" → "}
                  {c.ends_at ? new Date(c.ends_at).toLocaleDateString("en-ZA") : "—"}
                </td>
                <td className="px-4 py-3 capitalize">{c.status}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      setQrCoupon({
                        code: c.code,
                        title: c.title,
                        payload: c.qr_payload || `TAYLOR-COUPON:${c.code}`,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
                  >
                    <QrCode className="size-3" /> View
                  </button>
                </td>
              </tr>
              );
            })}
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

      {qrCoupon && <CouponQrModal {...qrCoupon} onClose={() => setQrCoupon(null)} />}
    </div>
  );
}

function CouponQrModal({
  code,
  title,
  payload,
  onClose,
}: {
  code: string;
  title: string;
  payload: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    void QRCode.toDataURL(payload, {
      width: 640,
      margin: 1,
      color: { dark: "#0F1B3D", light: "#ffffff" },
    }).then(setUrl);
  }, [payload]);

  function download() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupon-${code}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Coupon QR</p>
            <h2
              className="mt-1 text-xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-card p-4">
          {url ? (
            <img src={url} alt={`QR for ${code}`} className="size-56" />
          ) : (
            <div className="size-56 animate-pulse rounded-xl bg-muted/20" />
          )}
          <p className="mt-3 font-mono text-lg tracking-widest text-primary">{code}</p>
        </div>
        <button
          onClick={download}
          disabled={!url}
          className="mt-4 w-full rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          Download PNG
        </button>
        <p className="mt-3 text-center text-[11px] text-muted">
          Print or share this QR — scanning at the till marks it redeemed.
        </p>
      </div>
    </div>
  );
}

function NewCouponForm({
  orgId,
  currency,
  stores,
  onDone,
}: {
  orgId: string;
  currency: string;
  stores: { id: string; name: string; organisation_id: string }[];
  onDone: () => void;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storeId, setStoreId] = useState<string>("");
  const [percent, setPercent] = useState("");
  const [amount, setAmount] = useState("");
  const [limit, setLimit] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<CouponStatus>("draft");
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createCoupon({
        data: {
          organisation_id: orgId,
          store_id: storeId || null,
          code: code.toUpperCase(),
          title,
          description,
          discount_percent: percent ? Number(percent) : null,
          discount_amount: amount ? Number(amount) : null,
          currency_code: currency,
          usage_limit_total: limit ? Number(limit) : null,
          starts_at: startsAt ? new Date(startsAt).toISOString() : "",
          ends_at: endsAt ? new Date(endsAt).toISOString() : "",
          status,
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
      <F label="Code (e.g. SUMMER10)">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          pattern="[A-Z0-9-]+"
          className={`${cls} font-mono`}
        />
      </F>
      <F label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={cls} />
      </F>
      <F label="Store (leave blank for all stores)">
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={cls}>
          <option value="">All stores in this organisation</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </F>
      <F label="Discount %">
        <input
          type="number"
          min="0"
          max="100"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className={cls}
        />
      </F>
      <F label={`Discount amount (${currency})`}>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={cls}
        />
      </F>
      <F label="Usage limit (total)">
        <input
          type="number"
          min="1"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className={cls}
        />
      </F>
      <F label="Status">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CouponStatus)}
          className={cls}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
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
        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Creating…" : "Create coupon"}
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

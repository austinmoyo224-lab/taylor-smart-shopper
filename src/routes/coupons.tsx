import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { listMyCoupons } from "@/lib/subscriptions.functions";
import { QrCode, X } from "lucide-react";

export const Route = createFileRoute("/coupons")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Coupons - Taylor Intelligence" },
      {
        name: "description",
        content: "Digital coupons and QR redemption from the retailers and brands you follow.",
      },
    ],
  }),
  component: CouponsPage,
});

type Coupon = Awaited<ReturnType<typeof listMyCoupons>>[number];

function CouponsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<Coupon | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const q = useQuery({
    queryKey: ["coupons", "mine"],
    queryFn: () => listMyCoupons(),
    enabled: !!user,
  });

  return (
    <AppShell>
      <header className="border-b border-border px-6 pb-5 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">Save</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Coupons
        </h1>
        <p className="mt-1 text-xs text-muted">
          Tap a coupon to reveal its QR code — show it at the till to redeem.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {q.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (q.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm leading-relaxed text-muted">
            No active coupons yet. Follow a store to start receiving personalised coupons.
            <div className="mt-3">
              <Link
                to="/stores"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
              >
                Find stores
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {(q.data ?? []).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActive(c)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <QrCode className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {c.store?.name ?? "Any store"} ·{" "}
                      {c.discount_percent
                        ? `${c.discount_percent}% off`
                        : c.discount_amount
                          ? `${c.currency_code} ${Number(c.discount_amount).toFixed(2)} off`
                          : "Special offer"}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {c.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {active && <CouponModal coupon={active} onClose={() => setActive(null)} />}
    </AppShell>
  );
}

function CouponModal({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    const payload = coupon.qr_payload || `TAYLOR-COUPON:${coupon.code}`;
    void QRCode.toDataURL(payload, {
      width: 480,
      margin: 1,
      color: { dark: "#0F1B3D", light: "#ffffff" },
    }).then(setDataUrl);
  }, [coupon]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {coupon.store?.name ?? "Coupon"}
            </p>
            <h2
              className="mt-1 text-xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {coupon.title}
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
          {dataUrl ? (
            <img src={dataUrl} alt={`QR for ${coupon.code}`} className="size-56" />
          ) : (
            <div className="size-56 animate-pulse rounded-xl bg-muted/20" />
          )}
          <p className="mt-3 font-mono text-lg tracking-widest text-primary">{coupon.code}</p>
          <p className="mt-1 text-[11px] text-muted">Show this at the till to redeem</p>
        </div>

        {coupon.description && (
          <p className="mt-4 text-xs leading-relaxed text-muted">{coupon.description}</p>
        )}
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
          <span>
            {coupon.discount_percent
              ? `${coupon.discount_percent}% off`
              : coupon.discount_amount
                ? `${coupon.currency_code} ${Number(coupon.discount_amount).toFixed(2)} off`
                : "Special offer"}
          </span>
          {coupon.ends_at && (
            <span>Ends {new Date(coupon.ends_at).toLocaleDateString("en-ZA")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
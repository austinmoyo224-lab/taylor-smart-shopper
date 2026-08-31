import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { usePortal } from "@/lib/portal-context";
import { getStoreAnalytics } from "@/lib/portal.functions";
import { Store, Package, Tag, Ticket, Users, Ticket as TicketIcon, Megaphone, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  ssr: false,
  component: PortalHome,
});

function PortalHome() {
  const { organisations, stores, activeOrgId } = usePortal();
  const org = organisations.find((o) => o.id === activeOrgId);
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);

  const analytics = useQuery({
    queryKey: ["portal", "analytics", activeOrgId, null, 30],
    queryFn: () =>
      getStoreAnalytics({
        data: { organisation_id: activeOrgId, store_id: null, days: 30 },
      }),
    enabled: !!activeOrgId,
  });
  const t = analytics.data?.totals;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {org?.name ?? "Workspace"}
      </p>
      <h1
        className="mb-8 text-3xl md:text-4xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Welcome back
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NavCard to="/portal/stores" label="Stores" count={orgStores.length} icon={Store} />
        <NavCard to="/portal/products" label="Products" icon={Package} />
        <NavCard to="/portal/promotions" label="Promotions" icon={Tag} />
        <NavCard to="/portal/coupons" label="Coupons" icon={Ticket} />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Last 30 days
            </p>
            <h2
              className="text-2xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How your store is doing
            </h2>
          </div>
          <Link
            to="/portal/analytics"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <BarChart3 className="size-3.5" /> Full analytics
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat icon={Users} label="Followers" value={t?.followerTotal ?? 0} hint={`+${t?.followerNew ?? 0} new`} loading={analytics.isLoading} />
          <Stat icon={TicketIcon} label="Redemptions" value={t?.redemptionsTotal ?? 0} hint={`${t?.activeCoupons ?? 0} coupons`} loading={analytics.isLoading} />
          <Stat icon={Tag} label="Live promos" value={t?.promotionsActive ?? 0} hint={`${t?.promotionsPublished ?? 0} published`} loading={analytics.isLoading} />
          <Stat icon={Megaphone} label="Campaigns" value={t?.campaignsActive ?? 0} hint="active" loading={analytics.isLoading} />
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Your stores
        </h2>
        {orgStores.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No stores yet.{" "}
            <a href="https://heytaylor.co.za/store-onboarding" className="text-primary underline">
              Apply to list your store
            </a>{" "}
            and our team will approve it within 1–2 business days.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {orgStores.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="font-mono text-[10px] text-muted">{s.slug}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: typeof Store;
  label: string;
  value: number;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
        <Icon className="size-4 text-primary/70" />
      </div>
      <p
        className="mt-2 text-3xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {loading ? "…" : value.toLocaleString()}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function NavCard({
  to,
  label,
  count,
  icon: Icon,
}: {
  to: "/portal/stores" | "/portal/products" | "/portal/promotions" | "/portal/coupons";
  label: string;
  count?: number;
  icon: typeof Store;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
        <p
          className="mt-1 text-3xl italic tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {count ?? "—"}
        </p>
      </div>
      <Icon className="size-5 text-primary/70 transition group-hover:scale-110" />
    </Link>
  );
}

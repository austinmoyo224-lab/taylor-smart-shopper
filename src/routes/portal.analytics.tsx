import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getStoreAnalytics } from "@/lib/portal.functions";
import { usePortal } from "@/lib/portal-context";
import { Users, Ticket, Megaphone, Tag } from "lucide-react";

export const Route = createFileRoute("/portal/analytics")({
  ssr: false,
  component: AnalyticsPage,
});

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
];

function AnalyticsPage() {
  const { organisations, stores, activeOrgId } = usePortal();
  const org = organisations.find((o) => o.id === activeOrgId);
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);
  const [days, setDays] = useState(30);
  const [storeId, setStoreId] = useState<string>("");

  const q = useQuery({
    queryKey: ["portal", "analytics", activeOrgId, storeId || null, days],
    queryFn: () =>
      getStoreAnalytics({
        data: {
          organisation_id: activeOrgId,
          store_id: storeId || null,
          days,
        },
      }),
    enabled: !!activeOrgId,
  });

  const t = q.data?.totals;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            {org?.name ?? "Workspace"}
          </p>
          <h1
            className="text-3xl md:text-4xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Analytics
          </h1>
          <p className="mt-1 text-xs text-muted">
            Follower growth, coupon redemptions and campaign reach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orgStores.length > 0 && (
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="rounded-full border border-border bg-background px-3 py-2 text-xs"
            >
              <option value="">All stores</option>
              {orgStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <div className="inline-flex rounded-full border border-border p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={
                  "rounded-full px-3 py-1 text-[11px] " +
                  (days === r.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:text-foreground")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-muted">Loading analytics…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Could not load analytics.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              icon={Users}
              label="Followers"
              value={t?.followerTotal ?? 0}
              hint={`+${t?.followerNew ?? 0} in ${days}d`}
            />
            <Stat
              icon={Ticket}
              label="Redemptions"
              value={t?.redemptionsTotal ?? 0}
              hint={`${t?.activeCoupons ?? 0} coupons`}
            />
            <Stat
              icon={Tag}
              label="Live promos"
              value={t?.promotionsActive ?? 0}
              hint={`${t?.promotionsPublished ?? 0} published`}
            />
            <Stat
              icon={Megaphone}
              label="Campaigns"
              value={t?.campaignsActive ?? 0}
              hint="active"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Follower growth" subtitle={`New follows in the last ${days} days`}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={q.data?.series.followers ?? []}>
                  <defs>
                    <linearGradient id="fFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={shortDate} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="url(#fFollowers)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Coupon redemptions" subtitle={`Daily redemptions across coupons`}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={q.data?.series.redemptions ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={shortDate} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2
              className="text-xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Top coupons
            </h2>
            {(q.data?.topCoupons ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No redemptions yet in this window. Once shoppers redeem, your best-performing
                coupons will show here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(q.data?.topCoupons ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="font-mono text-[10px] text-muted">
                        {c.code}
                        {c.store_name ? ` · ${c.store_name}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {c.count} redeemed
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
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
        {value.toLocaleString()}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <h3
          className="text-lg italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {subtitle && <p className="text-[11px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

function shortDate(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
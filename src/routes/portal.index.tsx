import { createFileRoute, Link } from "@tanstack/react-router";
import { usePortal } from "@/lib/portal-context";
import { Store, Package, Tag, Ticket } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  ssr: false,
  component: PortalHome,
});

function PortalHome() {
  const { organisations, stores, activeOrgId } = usePortal();
  const org = organisations.find((o) => o.id === activeOrgId);
  const orgStores = stores.filter((s) => s.organisation_id === activeOrgId);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {org?.name ?? "Workspace"}
      </p>
      <h1
        className="mb-8 text-4xl italic tracking-tight"
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

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Your stores
        </h2>
        {orgStores.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No stores yet. Head to{" "}
            <Link to="/portal/stores" className="text-primary underline">
              Stores
            </Link>{" "}
            to add your first one.
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

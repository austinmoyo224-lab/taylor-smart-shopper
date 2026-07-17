import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPortalContext } from "@/lib/portal.functions";
import { LayoutDashboard, Store, Package, Tag, Ticket, ArrowLeft, Megaphone } from "lucide-react";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Store Portal - Taylor Intelligence" },
      {
        name: "description",
        content: "Retailer workspace for stores, products, promotions and coupons.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalLayout,
});

type PortalCtx = {
  organisations: {
    id: string;
    name: string;
    slug: string;
    type: string;
    default_currency: string;
    country_code: string;
  }[];
  stores: {
    id: string;
    name: string;
    slug: string;
    status: string;
    organisation_id: string;
  }[];
  activeOrgId: string;
  setActiveOrgId: (id: string) => void;
};

const PortalContext = createContext<PortalCtx | null>(null);

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal outside <PortalLayout>");
  return ctx;
}

function PortalLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "context"],
    queryFn: () => getPortalContext(),
    enabled: !!user,
  });

  const [activeOrgId, setActiveOrgId] = useState<string>("");
  useEffect(() => {
    if (data?.hasAccess && data.organisations[0] && !activeOrgId) {
      setActiveOrgId(data.organisations[0].id);
    }
  }, [data, activeOrgId]);

  if (!user || isLoading) return <Full>Loading store portal…</Full>;
  if (!data?.hasAccess) return <NoAccess />;

  return (
    <PortalContext.Provider
      value={{
        organisations: data.organisations,
        stores: data.stores,
        activeOrgId,
        setActiveOrgId,
      }}
    >
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar
          organisations={data.organisations}
          activeOrgId={activeOrgId}
          onOrgChange={setActiveOrgId}
        />
        <main className="flex min-h-screen flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </PortalContext.Provider>
  );
}

const nav: {
  to:
    | "/portal"
    | "/portal/stores"
    | "/portal/products"
    | "/portal/promotions"
    | "/portal/coupons"
    | "/portal/campaigns";
  label: string;
  icon: typeof Store;
  exact?: boolean;
}[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/portal/stores", label: "Stores", icon: Store },
  { to: "/portal/products", label: "Products", icon: Package },
  { to: "/portal/promotions", label: "Promotions", icon: Tag },
  { to: "/portal/coupons", label: "Coupons", icon: Ticket },
  { to: "/portal/campaigns", label: "Campaigns", icon: Megaphone },
];

function Sidebar({
  organisations,
  activeOrgId,
  onOrgChange,
}: {
  organisations: PortalCtx["organisations"];
  activeOrgId: string;
  onOrgChange: (id: string) => void;
}) {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-8 md:flex">
      <Link
        to="/chat"
        className="mb-6 flex items-center gap-2 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to Taylor
      </Link>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        Store portal
      </p>
      <h1
        className="mb-6 text-2xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Workspace
      </h1>

      {organisations.length > 1 && (
        <label className="mb-6 block">
          <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">
            Organisation
          </span>
          <select
            value={activeOrgId}
            onChange={(e) => onOrgChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {organisations.length === 1 && (
        <p className="mb-6 text-xs text-muted">
          <span className="font-medium text-foreground">{organisations[0].name}</span>
          <br />
          <span className="font-mono text-[10px]">{organisations[0].slug}</span>
        </p>
      )}

      <nav className="space-y-1">
        {nav.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition " +
                (active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-accent hover:text-foreground")
              }
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Full({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted">
      {children}
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Store portal
        </p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          No access yet
        </h1>
        <p className="mt-3 text-sm text-muted">
          You need a retailer admin, store manager or staff role on an organisation to use the store
          portal. Ask a platform admin to grant you access.
        </p>
        <Link
          to="/chat"
          className="mt-6 inline-flex items-center rounded-full border border-border px-4 py-2 text-xs"
        >
          Back to Taylor
        </Link>
      </div>
    </div>
  );
}

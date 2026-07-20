import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPortalContext } from "@/lib/portal.functions";
import { PortalContext, type PortalCtx } from "@/lib/portal-context";
import {
  LayoutDashboard,
  Store,
  Package,
  Tag,
  Ticket,
  ArrowLeft,
  Megaphone,
  BarChart3,
  Gift,
  Inbox,
  Menu,
  X,
} from "lucide-react";

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

function PortalLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
  if (data.organisations.length === 0) return <NoOrgs />;

  return (
    <PortalContext.Provider
      value={{
        organisations: data.organisations,
        stores: data.stores,
        activeOrgId,
        setActiveOrgId,
        isSuperAdmin: !!data.isSuperAdmin,
      }}
    >
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar
          organisations={data.organisations}
          activeOrgId={activeOrgId}
          onOrgChange={setActiveOrgId}
          isSuperAdmin={!!data.isSuperAdmin}
        />
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-card shadow-2xl">
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Store portal
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full p-1 text-muted hover:bg-accent"
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="px-4 py-4">
                <Sidebar
                  organisations={data.organisations}
                  activeOrgId={activeOrgId}
                  onOrgChange={setActiveOrgId}
                  isSuperAdmin={!!data.isSuperAdmin}
                  variant="drawer"
                />
              </div>
            </div>
          </div>
        )}
        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-border p-2 text-foreground"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Store portal
            </span>
          </header>
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
    | "/portal/campaigns"
    | "/portal/analytics"
    | "/portal/rewards"
    | "/portal/messages";
  label: string;
  icon: typeof Store;
  exact?: boolean;
}[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/portal/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/portal/stores", label: "Stores", icon: Store },
  { to: "/portal/messages", label: "Messages", icon: Inbox },
  { to: "/portal/products", label: "Products", icon: Package },
  { to: "/portal/promotions", label: "Promotions", icon: Tag },
  { to: "/portal/coupons", label: "Coupons", icon: Ticket },
  { to: "/portal/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/portal/rewards", label: "Rewards", icon: Gift },
];

function Sidebar({
  organisations,
  activeOrgId,
  onOrgChange,
  isSuperAdmin,
  variant = "sidebar",
}: {
  organisations: PortalCtx["organisations"];
  activeOrgId: string;
  onOrgChange: (id: string) => void;
  isSuperAdmin: boolean;
  variant?: "sidebar" | "drawer";
}) {
  const { pathname } = useLocation();
  void isSuperAdmin;
  const visibleNav = nav;
  const isDrawer = variant === "drawer";
  return (
    <aside
      className={
        isDrawer
          ? "flex flex-col"
          : "hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-8 md:flex"
      }
    >
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
        {visibleNav.map(({ to, label, icon: Icon, exact }) => {
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
          portal. Set up your own business in a few minutes, or ask a platform admin to grant you access.
        </p>
        <Link
          to="/store-onboarding"
          className="mt-6 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
        >
          Apply to list your store
        </Link>
        <div className="mt-3">
          <Link
            to="/chat"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs"
          >
            Back to Taylor
          </Link>
        </div>
      </div>
    </div>
  );
}

function NoOrgs() {
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
          No organisation yet
        </h1>
        <p className="mt-3 text-sm text-muted">
          Your account has a portal role but is not linked to any organisation. A super admin needs
          to create an organisation and assign you to it.
        </p>
        <Link
          to="/store-onboarding"
          className="mt-6 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
        >
          Apply to list your store
        </Link>
        <div className="mt-3">
          <Link
            to="/chat"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs"
          >
            Back to Taylor
          </Link>
        </div>
      </div>
    </div>
  );
}

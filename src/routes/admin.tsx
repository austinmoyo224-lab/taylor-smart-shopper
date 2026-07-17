import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAdminStatus } from "@/lib/admin.functions";
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  ScrollText,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin - Taylor Intelligence" },
      { name: "description", content: "Super admin console for Taylor Intelligence." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const status = useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => getAdminStatus(),
    enabled: !!user,
  });

  if (!user || status.isLoading) {
    return <FullPage>Loading admin console…</FullPage>;
  }

  const s = status.data;
  if (!s?.isSuperAdmin) {
    return <AccessDenied canClaim={!!s?.canClaim} onClaimed={() => status.refetch()} />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <main className="flex min-h-screen flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}

const nav: {
  to: "/admin" | "/admin/organisations" | "/admin/stores" | "/admin/users" | "/admin/audit";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/organisations", label: "Organisations", icon: Building2 },
  { to: "/admin/stores", label: "Stores", icon: Store },
  { to: "/admin/users", label: "Users & roles", icon: Users },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
];

function AdminSidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-8 md:flex">
      <Link to="/chat" className="mb-8 flex items-center gap-2 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to Taylor
      </Link>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        Admin
      </p>
      <h1
        className="mb-8 text-2xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Console
      </h1>
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

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted">
      {children}
    </div>
  );
}

function AccessDenied({
  canClaim,
  onClaimed,
}: {
  canClaim: boolean;
  onClaimed: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin
        </p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Not authorised
        </h1>
        <p className="mt-3 text-sm text-muted">
          The admin console is reserved for Taylor Intelligence super admins.
        </p>
        {canClaim && (
          <ClaimSuperAdminButton onClaimed={onClaimed} />
        )}
        <div className="mt-6">
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

function ClaimSuperAdminButton({ onClaimed }: { onClaimed: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left">
      <p className="text-[11px] font-medium uppercase tracking-widest text-primary">
        First run
      </p>
      <p className="mt-1 text-xs text-muted">
        No super admin exists yet. Claim the role to bootstrap the platform.
        This is only offered once.
      </p>
      <button
        onClick={async () => {
          const { claimSuperAdmin } = await import("@/lib/admin.functions");
          await claimSuperAdmin();
          onClaimed();
        }}
        className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground"
      >
        Claim super admin
      </button>
    </div>
  );
}
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getMyRiderProfile } from "@/lib/rider.functions";
import { LayoutDashboard, User, Store, Truck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/rider")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rider portal · Taylor Intelligence" },
      { name: "description", content: "Deliver paid orders for the stores you follow on Taylor." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RiderLayout,
});

function RiderLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Mark account_type on first landing if missing (e.g. user signed up before role existed)
  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .update({ account_type: "delivery_boy" })
      .eq("id", user.id)
      .is("account_type", null);
  }, [user]);

  const profile = useQuery({
    queryKey: ["rider", "me"],
    queryFn: () => getMyRiderProfile(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted">
        Loading rider portal…
      </div>
    );
  }

  const needsProfile = !profile.isLoading && !profile.data;
  const isOnProfilePage = pathname === "/rider/profile";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <RiderSidebar />
      <main className="flex min-h-screen flex-1 flex-col">
        {needsProfile && !isOnProfilePage && (
          <div className="border-b border-primary/20 bg-primary/5 px-6 py-3 text-xs text-primary">
            Finish your rider profile so stores can find you.{" "}
            <Link to="/rider/profile" className="ml-1 font-medium underline">
              Complete profile →
            </Link>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

const nav: { to: "/rider" | "/rider/profile" | "/rider/stores" | "/rider/deliveries"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/rider", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/rider/deliveries", label: "Deliveries", icon: Truck },
  { to: "/rider/stores", label: "My stores", icon: Store },
  { to: "/rider/profile", label: "Profile", icon: User },
];

function RiderSidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-8 md:flex">
      <Link to="/chat" className="mb-8 flex items-center gap-2 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to Taylor
      </Link>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Rider</p>
      <h1 className="mb-8 text-2xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Portal
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
                (active ? "bg-primary/10 text-primary" : "text-muted hover:bg-accent hover:text-foreground")
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

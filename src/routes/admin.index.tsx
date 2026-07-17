import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "@/lib/admin.functions";
import { Building2, Store, Users, Tag, MessagesSquare, Send } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => getAdminDashboard(),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Overview</p>
      <h1
        className="mb-8 text-4xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Platform pulse
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Organisations"
          value={data?.organisations}
          icon={Building2}
          loading={isLoading}
        />
        <StatCard label="Stores" value={data?.stores} icon={Store} loading={isLoading} />
        <StatCard label="Subscribers" value={data?.subscribers} icon={Users} loading={isLoading} />
        <StatCard label="Promotions" value={data?.promotions} icon={Tag} loading={isLoading} />
        <StatCard
          label="Conversations"
          value={data?.conversations}
          icon={MessagesSquare}
          loading={isLoading}
        />
        <StatCard label="Messages" value={data?.messages} icon={Send} loading={isLoading} />
      </div>

      <p className="mt-10 max-w-xl text-xs leading-relaxed text-muted">
        Numbers span every tenant on Taylor Intelligence. Use the sidebar to drill into
        organisations, stores, users and the audit log.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | undefined;
  icon: typeof Building2;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
        <Icon className="size-4 text-primary/70" />
      </div>
      <p className="text-4xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        {loading ? "…" : (value ?? 0).toLocaleString("en-ZA")}
      </p>
    </div>
  );
}

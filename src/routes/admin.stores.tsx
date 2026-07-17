import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listStores } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/stores")({
  ssr: false,
  component: StoresPage,
});

function StoresPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: () => listStores(),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        Retail
      </p>
      <h1
        className="mb-8 text-4xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Stores
      </h1>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Public</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  No stores yet. Retailers create stores from the Store Portal
                  (Milestone 4).
                </td>
              </tr>
            )}
            {(data ?? []).map((s) => {
              const org = (s as { organisations?: { name: string } | null })
                .organisations;
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {s.name}
                    <div className="font-mono text-[10px] text-muted">
                      {s.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">{org?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {[s.city, s.country_code].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{s.status}</td>
                  <td className="px-4 py-3">{s.is_public ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
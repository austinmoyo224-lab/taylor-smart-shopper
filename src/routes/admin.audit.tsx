import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/audit")({
  ssr: false,
  component: AuditPage,
});

function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => listAuditLog(),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Trust</p>
      <h1
        className="mb-8 text-4xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Audit log
      </h1>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Actor</th>
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
                  No mutations recorded yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-[11px] text-muted">
                  {new Date(r.created_at).toLocaleString("en-ZA")}
                </td>
                <td className="px-4 py-3 uppercase text-primary">{r.action}</td>
                <td className="px-4 py-3">{r.table_name}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-muted">
                  {r.record_id?.slice(0, 8) ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-muted">
                  {r.user_id?.slice(0, 8) ?? "system"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

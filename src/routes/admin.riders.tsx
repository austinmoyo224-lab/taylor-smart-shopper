import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listRiders,
  approveRider,
  rejectRider,
  listRiderAuditHistory,
} from "@/lib/admin-riders.functions";
import { Check, X, Clock, Bike, Phone, MapPin, History } from "lucide-react";
import { Paginator, usePaged } from "@/components/Paginator";

export const Route = createFileRoute("/admin/riders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rider verification — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RidersPage,
});

type Status = "pending" | "approved" | "rejected" | "all";

function RidersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("pending");
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const riders = useQuery({
    queryKey: ["admin", "riders", status],
    queryFn: () => listRiders({ data: { status } }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveRider({ data: { id, notes } }),
    onSuccess: () => {
      setOpen(null);
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["admin", "riders"] });
    },
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectRider({ data: { id, notes } }),
    onSuccess: () => {
      setOpen(null);
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["admin", "riders"] });
    },
  });

  const rows = riders.data ?? [];
  const pager = usePaged(rows);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Admin</p>
      <h1 className="text-3xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Delivery riders
      </h1>
      <p className="mt-2 text-sm text-muted">
        Verify delivery riders before they can be assigned to paid orders.
      </p>

      <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1 text-xs">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              "rounded-full px-4 py-1.5 font-medium capitalize transition " +
              (status === s ? "bg-primary text-primary-foreground" : "text-muted")
            }
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {riders.isLoading && <p className="text-sm text-muted">Loading…</p>}
        {!riders.isLoading && rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No {status === "all" ? "" : status} riders.
          </p>
        )}
        {pager.paged.map((r) => {
          const isOpen = open === r.id;
          const busy = approve.isPending || reject.isPending;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.verification_status as Exclude<Status, "all">} />
                    <span className="text-[11px] text-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-lg font-medium">{r.full_name}</h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
                    <span>
                      <Bike className="mr-1 inline size-3" />
                      {r.vehicle_type}
                      {r.vehicle_registration ? ` · ${r.vehicle_registration}` : ""}
                    </span>
                    {r.phone_e164 && (
                      <span>
                        <Phone className="mr-1 inline size-3" />
                        {r.phone_e164}
                      </span>
                    )}
                    {(r.service_city || r.service_area) && (
                      <span>
                        <MapPin className="mr-1 inline size-3" />
                        {[r.service_city, r.service_area].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {r.submitter_email && <span>{r.submitter_email}</span>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setOpen(isOpen ? null : r.id);
                    setNotes("");
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs"
                >
                  {isOpen ? "Close" : "Review"}
                </button>
              </div>

              {isOpen && (
                <div className="mt-4 border-t border-border pt-4">
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <D label="ID number" v={r.id_number} />
                    <D label="Vehicle reg" v={r.vehicle_registration} />
                    <D label="City" v={r.service_city} />
                    <D label="Area" v={r.service_area} />
                  </dl>
                  {r.bio && (
                    <p className="mt-3 rounded-lg border border-border bg-background/50 p-3 text-xs text-muted">
                      {r.bio}
                    </p>
                  )}
                  {r.rejection_reason && (
                    <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      <span className="font-medium">Previously rejected:</span>{" "}
                      {r.rejection_reason}
                    </p>
                  )}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional; recorded in audit history)"
                    className="mt-3 w-full rounded-lg border border-border bg-background p-2 text-xs"
                    maxLength={1000}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => approve.mutate(r.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                      Approve rider
                    </button>
                    <button
                      onClick={() => reject.mutate(r.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-4 py-2 text-xs text-destructive disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                      Reject
                    </button>
                  </div>
                  {(approve.error || reject.error) && (
                    <p className="mt-2 text-xs text-destructive">
                      {((approve.error || reject.error) as Error).message}
                    </p>
                  )}
                  <AuditHistory riderId={r.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Paginator
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        start={pager.start}
        end={pager.end}
        onPageChange={pager.setPage}
      />
    </div>
  );
}

function AuditHistory({ riderId }: { riderId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "rider-audit", riderId],
    queryFn: () => listRiderAuditHistory({ data: { riderId } }),
  });
  return (
    <div className="mt-4 rounded-lg border border-border bg-background/50 p-3">
      <p className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-muted">
        <History className="size-3" />
        Audit history
      </p>
      {isLoading && <p className="text-[11px] text-muted">Loading…</p>}
      {!isLoading && (!data || data.length === 0) && (
        <p className="text-[11px] text-muted">No actions recorded yet.</p>
      )}
      <ul className="space-y-1.5 text-[11px]">
        {(data ?? []).map((row) => {
          const notes =
            row.changed_data &&
            typeof row.changed_data === "object" &&
            "notes" in row.changed_data
              ? (row.changed_data as { notes?: string | null }).notes
              : null;
          return (
            <li key={row.id} className="flex flex-wrap items-baseline gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {row.action.replace("_", " ")}
              </span>
              <span className="text-muted">
                {new Date(row.created_at).toLocaleString()} · {row.reviewer_email ?? "—"}
              </span>
              {notes && <span className="w-full text-foreground">“{notes}”</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { icon: Clock, cls: "border-amber-400/30 bg-amber-400/5 text-amber-600" },
    approved: { icon: Check, cls: "border-primary/30 bg-primary/5 text-primary" },
    rejected: { icon: X, cls: "border-destructive/30 bg-destructive/5 text-destructive" },
  } as const;
  const { icon: Icon, cls } = map[status];
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize " +
        cls
      }
    >
      <Icon className="size-3" />
      {status}
    </span>
  );
}

function D({ label, v }: { label: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-foreground">{v || "—"}</dd>
    </div>
  );
}
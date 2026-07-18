import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listStoreOnboardingRequests,
  approveStoreOnboardingRequest,
  rejectStoreOnboardingRequest,
} from "@/lib/store-onboarding.functions";
import { Check, X, Clock, Store, Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/admin/onboarding")({
  head: () => ({
    meta: [
      { title: "Store applications — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OnboardingRequestsPage,
});

type Status = "pending" | "approved" | "rejected" | "all";

function OnboardingRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("pending");
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const requests = useQuery({
    queryKey: ["admin", "onboarding-requests", status],
    queryFn: () => listStoreOnboardingRequests({ data: { status } }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveStoreOnboardingRequest({ data: { id, notes } }),
    onSuccess: () => {
      setOpen(null);
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["admin", "onboarding-requests"] });
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectStoreOnboardingRequest({ data: { id, notes } }),
    onSuccess: () => {
      setOpen(null);
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["admin", "onboarding-requests"] });
    },
  });

  const rows = requests.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Admin</p>
      <h1 className="text-3xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Store applications
      </h1>
      <p className="mt-2 text-sm text-muted">
        Review and approve new store owners applying to list on Taylor.
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
        {requests.isLoading && <p className="text-sm text-muted">Loading…</p>}
        {!requests.isLoading && rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No {status === "all" ? "" : status} applications.
          </p>
        )}
        {rows.map((r) => {
          const isOpen = open === r.id;
          const busy = approve.isPending || reject.isPending;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status as Exclude<Status, "all">} />
                    <span className="text-[11px] text-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-lg font-medium">{r.business_name}</h3>
                  <p className="text-xs text-muted">
                    <Store className="mr-1 inline size-3" />
                    {r.store_name}
                    {r.store_city ? ` · ${r.store_city}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
                    {r.business_email && (
                      <span>
                        <Mail className="mr-1 inline size-3" />
                        {r.business_email}
                      </span>
                    )}
                    {r.contact_phone && (
                      <span>
                        <Phone className="mr-1 inline size-3" />
                        {r.contact_phone}
                      </span>
                    )}
                    <span>
                      <MapPin className="mr-1 inline size-3" />
                      /join/{r.proposed_slug}
                    </span>
                  </div>
                </div>
                {r.status === "pending" && (
                  <button
                    onClick={() => {
                      setOpen(isOpen ? null : r.id);
                      setNotes("");
                    }}
                    className="rounded-full border border-border px-3 py-1.5 text-xs"
                  >
                    {isOpen ? "Close" : "Review"}
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="mt-4 border-t border-border pt-4">
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <D label="Business type" v={r.business_type} />
                    <D label="Trading name" v={r.trading_name} />
                    <D label="Address" v={r.store_address} />
                    <D label="Province" v={r.store_province} />
                    <D label="Brand color" v={r.brand_color} />
                    <D label="Logo" v={r.logo_url} />
                  </dl>
                  {r.short_description && (
                    <p className="mt-3 rounded-lg border border-border bg-background/50 p-3 text-xs text-muted">
                      {r.short_description}
                    </p>
                  )}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional; shown to the applicant if rejected)"
                    className="mt-3 w-full rounded-lg border border-border bg-background p-2 text-xs"
                    maxLength={1000}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => approve.mutate(r.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                      Approve & create store
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
                  {approve.error && (
                    <p className="mt-2 text-xs text-destructive">
                      {(approve.error as Error).message}
                    </p>
                  )}
                  {reject.error && (
                    <p className="mt-2 text-xs text-destructive">
                      {(reject.error as Error).message}
                    </p>
                  )}
                </div>
              )}

              {r.admin_notes && r.status !== "pending" && (
                <p className="mt-3 rounded-lg border border-border bg-background/50 p-3 text-xs text-muted">
                  <span className="font-medium text-foreground">Admin notes:</span> {r.admin_notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
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
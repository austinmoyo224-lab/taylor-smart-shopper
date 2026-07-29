import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyRiderProfile, setMyAvailability, listMyDeliveryStores } from "@/lib/rider.functions";
import { Truck, Store, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/rider/")({
  ssr: false,
  component: RiderDashboard,
});

function RiderDashboard() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["rider", "me"], queryFn: () => getMyRiderProfile() });
  const stores = useQuery({ queryKey: ["rider", "stores"], queryFn: () => listMyDeliveryStores() });

  const toggle = useMutation({
    mutationFn: (is_available: boolean) => setMyAvailability({ data: { is_available } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rider", "me"] }),
  });

  const p = profile.data;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10 md:px-8">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Rider</p>
      <h1 className="mb-8 text-4xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Dashboard
      </h1>

      {!p ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm">
            You haven't set up your rider profile yet.{" "}
            <Link to="/rider/profile" className="font-medium text-primary underline">
              Complete profile
            </Link>
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Availability</p>
                <p className="mt-1 text-lg font-medium">
                  {p.is_available ? "You're online" : "You're offline"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {p.is_available
                    ? "Stores you follow can assign you paid orders."
                    : "Turn on to start receiving delivery requests."}
                </p>
              </div>
              <button
                onClick={() => toggle.mutate(!p.is_available)}
                disabled={toggle.isPending}
                className={
                  "relative inline-flex h-8 w-14 shrink-0 rounded-full transition " +
                  (p.is_available ? "bg-primary" : "bg-muted/30")
                }
                aria-pressed={p.is_available}
              >
                <span
                  className={
                    "absolute top-1 size-6 rounded-full bg-white shadow transition " +
                    (p.is_available ? "left-7" : "left-1")
                  }
                />
              </button>
            </div>
          </section>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Verification" value={p.is_verified ? "Verified" : "Pending"} icon={ShieldCheck} accent={p.is_verified} />
            <Stat label="Stores followed" value={String(stores.data?.length ?? 0)} icon={Store} />
            <Stat label="Deliveries" value="0" icon={Truck} />
          </div>

          <section className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
            <Clock className="mx-auto mb-2 size-6 text-muted" />
            <p className="text-sm font-medium">No available orders yet</p>
            <p className="mt-1 text-xs text-muted">
              When shoppers place paid orders at stores you follow, they'll appear here for you to accept.
            </p>
          </section>

          {!p.is_verified && (
            <section className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary">
              <CheckCircle2 className="mb-1 inline size-4" /> A Taylor admin will verify your ID and
              vehicle before you can accept paid deliveries.
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Truck; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className={"mt-1 text-lg font-medium " + (accent ? "text-primary" : "")}>{value}</p>
    </div>
  );
}

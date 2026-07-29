import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyDeliveryStores } from "@/lib/rider.functions";
import { Store as StoreIcon, MapPin, Plus } from "lucide-react";

export const Route = createFileRoute("/rider/stores")({
  ssr: false,
  component: RiderStores,
});

function RiderStores() {
  const stores = useQuery({ queryKey: ["rider", "stores"], queryFn: () => listMyDeliveryStores() });
  const list = stores.data ?? [];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10 md:px-8">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Rider</p>
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="text-4xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Stores you deliver for
        </h1>
        <Link
          to="/stores"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/40"
        >
          <Plus className="size-3.5" /> Follow more
        </Link>
      </div>

      {stores.isLoading && <p className="text-sm text-muted">Loading…</p>}

      {!stores.isLoading && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <StoreIcon className="mx-auto mb-2 size-6 text-muted" />
          <p className="text-sm font-medium">You aren't following any stores yet</p>
          <p className="mt-1 text-xs text-muted">Follow the stores you'd like to deliver for.</p>
          <Link
            to="/stores"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            Browse stores
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => (
          <Link
            key={s.id}
            to="/stores/$storeId"
            params={{ storeId: s.slug }}
            className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
          >
            <div className="flex items-start gap-3">
              {s.logo_url ? (
                <img src={s.logo_url} alt="" className="size-12 rounded-xl object-cover" />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <StoreIcon className="size-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                {(s.city || s.region) && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="size-3" />
                    {[s.city, s.region].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

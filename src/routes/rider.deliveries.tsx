import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/rider/deliveries")({
  ssr: false,
  component: RiderDeliveries,
});

function RiderDeliveries() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-10 md:px-8">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Rider</p>
      <h1 className="mb-8 text-4xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Deliveries
      </h1>

      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <Truck className="mx-auto mb-2 size-6 text-muted" />
        <p className="text-sm font-medium">No deliveries yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
          Paid orders from stores you follow will appear here. Toggle availability on to start receiving requests.
        </p>
      </div>
    </div>
  );
}

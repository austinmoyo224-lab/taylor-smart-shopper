import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { usePortal } from "@/lib/portal-context";
import { listStoreOrders, listAvailableRiders, assignRider } from "@/lib/orders.functions";
import { Bike, Clock, Truck, Check, X, Package } from "lucide-react";
import { Paginator, usePaged } from "@/components/Paginator";

export const Route = createFileRoute("/portal/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Orders — Store Portal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrdersPage,
});

type Status = "all" | "pending" | "paid" | "assigned" | "out_for_delivery" | "delivered" | "cancelled";

function OrdersPage() {
  const { stores, activeOrgId } = usePortal();
  const orgStores = useMemo(
    () => stores.filter((s) => s.organisation_id === activeOrgId),
    [stores, activeOrgId],
  );
  const [storeId, setStoreId] = useState<string>(orgStores[0]?.id ?? "");
  const [status, setStatus] = useState<Status>("paid");

  const orders = useQuery({
    queryKey: ["portal", "orders", storeId, status],
    queryFn: () => listStoreOrders({ data: { storeId, status } }),
    enabled: !!storeId,
  });

  const rows = orders.data ?? [];
  const pager = usePaged(rows);

  if (orgStores.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-16 text-center">
        <Package className="mx-auto mb-4 size-8 text-muted" />
        <p className="text-sm text-muted">No stores yet in this organisation.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Fulfilment</p>
      <h1 className="text-3xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Orders
      </h1>
      <p className="mt-2 text-sm text-muted">
        Assign an available, verified rider to any paid delivery order.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {orgStores.length > 1 && (
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
          >
            {orgStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs">
          {(["paid", "assigned", "out_for_delivery", "delivered", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={
                "rounded-full px-3 py-1.5 font-medium capitalize transition " +
                (status === s ? "bg-primary text-primary-foreground" : "text-muted")
              }
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {orders.isLoading && <p className="text-sm text-muted">Loading orders…</p>}
        {!orders.isLoading && rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No {status === "all" ? "" : status.replace(/_/g, " ")} orders yet.
          </p>
        )}
        {pager.paged.map((o) => (
          <OrderCard key={o.id} order={o} storeId={storeId} />
        ))}
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

type Order = Awaited<ReturnType<typeof listStoreOrders>>[number];

function OrderCard({ order, storeId }: { order: Order; storeId: string }) {
  const [expanded, setExpanded] = useState(false);
  const items = Array.isArray(order.items) ? (order.items as Array<{ name?: string; quantity?: number }>) : [];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} />
            <span className="text-[11px] text-muted">
              {new Date(order.created_at).toLocaleString()}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted">
              {order.delivery_type === "delivery" ? (
                <>
                  <Truck className="mr-1 inline size-3" />
                  Delivery
                </>
              ) : (
                "Pickup"
              )}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">
            {order.shopper?.name ?? order.shopper?.email ?? "Shopper"}
          </p>
          <p className="font-mono text-[10px] text-muted">#{order.id.slice(0, 8)}</p>
          {order.delivery_address && (
            <p className="mt-1 text-xs text-muted">{order.delivery_address}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">
            {order.currency_code} {Number(order.total ?? 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-muted">{items.length} item(s)</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 rounded-full border border-border px-3 py-1 text-[11px]"
          >
            {expanded ? "Hide" : "Manage"}
          </button>
        </div>
      </div>

      {order.rider && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] text-primary">
          <Bike className="size-3" />
          Assigned to {order.rider.name}
          {order.rider.phone ? ` · ${order.rider.phone}` : ""}
        </div>
      )}

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          {items.length > 0 && (
            <ul className="mb-4 space-y-1 text-xs">
              {items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>{it.name ?? "Item"}</span>
                  <span className="text-muted">×{it.quantity ?? 1}</span>
                </li>
              ))}
            </ul>
          )}
          {order.delivery_type === "delivery" ? (
            <RiderAssigner order={order} storeId={storeId} />
          ) : (
            <p className="text-xs text-muted">This is a pickup order — no rider needed.</p>
          )}
        </div>
      )}
    </div>
  );
}

function RiderAssigner({ order, storeId }: { order: Order; storeId: string }) {
  const qc = useQueryClient();
  const riders = useQuery({
    queryKey: ["portal", "available-riders", storeId],
    queryFn: () => listAvailableRiders({ data: { storeId } }),
  });
  const mut = useMutation({
    mutationFn: (riderId: string | null) => assignRider({ data: { orderId: order.id, riderId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["portal", "orders"] });
    },
  });

  if (order.status === "delivered" || order.status === "cancelled") {
    return <p className="text-xs text-muted">Order is {order.status}.</p>;
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted">
        Available riders
      </p>
      {riders.isLoading && <p className="text-xs text-muted">Loading riders…</p>}
      {!riders.isLoading && (riders.data ?? []).length === 0 && (
        <p className="text-xs text-muted">
          No approved riders are online right now. Riders must be verified by an admin and toggle
          themselves available.
        </p>
      )}
      <div className="space-y-2">
        {(riders.data ?? []).map((r) => {
          const isAssigned = order.assigned_rider_id === r.id;
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.full_name}</p>
                <p className="text-[11px] text-muted">
                  {r.vehicle_type}
                  {r.service_area ? ` · ${r.service_area}` : r.service_city ? ` · ${r.service_city}` : ""}
                  {r.phone_e164 ? ` · ${r.phone_e164}` : ""}
                </p>
              </div>
              <button
                onClick={() => mut.mutate(isAssigned ? null : r.id)}
                disabled={mut.isPending}
                className={
                  "rounded-full px-3 py-1.5 text-[11px] disabled:opacity-50 " +
                  (isAssigned
                    ? "border border-destructive/30 text-destructive"
                    : "bg-primary text-primary-foreground")
                }
              >
                {isAssigned ? (
                  <>
                    <X className="mr-1 inline size-3" /> Unassign
                  </>
                ) : (
                  <>
                    <Check className="mr-1 inline size-3" /> Assign
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
      {mut.error && (
        <p className="mt-2 text-xs text-destructive">{(mut.error as Error).message}</p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { cls: string; icon: typeof Clock }> = {
    pending: { cls: "border-muted/40 bg-muted/10 text-muted", icon: Clock },
    paid: { cls: "border-amber-400/30 bg-amber-400/5 text-amber-600", icon: Package },
    assigned: { cls: "border-primary/30 bg-primary/5 text-primary", icon: Bike },
    out_for_delivery: { cls: "border-primary/30 bg-primary/5 text-primary", icon: Truck },
    delivered: { cls: "border-primary/30 bg-primary/5 text-primary", icon: Check },
    cancelled: { cls: "border-destructive/30 bg-destructive/5 text-destructive", icon: X },
  };
  const { cls, icon: Icon } = map[status];
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize " +
        cls
      }
    >
      <Icon className="size-3" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
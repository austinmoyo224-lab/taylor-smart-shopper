import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  addListItem,
  compareBasket,
  createShoppingList,
  deleteListItem,
  deleteShoppingList,
  getShoppingList,
  listMyShoppingLists,
  toggleListItem,
  updateListItem,
} from "@/lib/lists.functions";
import { Camera, Plus, Trash2, ChevronLeft, Scale, X, Pencil, Check, AlertTriangle } from "lucide-react";
import { Paginator, usePaged } from "@/components/Paginator";

export const Route = createFileRoute("/lists")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shopping lists - Taylor Intelligence" },
      {
        name: "description",
        content: "Your personal and AI-generated shopping lists with basket totals and savings.",
      },
      { property: "og:title", content: "Shopping lists - Taylor Intelligence" },
      {
        property: "og:description",
        content: "Your personal and AI-generated shopping lists with basket totals and savings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Shopping lists - Taylor Intelligence" },
      {
        name: "twitter:description",
        content: "Your personal and AI-generated shopping lists with basket totals and savings.",
      },
    ],
  }),
  component: ListsScreen,
});

function ListsScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const lists = useQuery({
    queryKey: ["lists", "mine"],
    queryFn: () => listMyShoppingLists(),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: (name: string) => createShoppingList({ data: { name } }),
    onSuccess: (row) => {
      setNewName("");
      void qc.invalidateQueries({ queryKey: ["lists", "mine"] });
      if (row?.id) setOpenId(row.id);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteShoppingList({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists", "mine"] }),
  });

  const pager = usePaged(lists.data ?? undefined);

  if (openId) return <ListDetail id={openId} onBack={() => setOpenId(null)} />;

  return (
    <AppShell>
      <header className="relative isolate overflow-hidden border-b border-border bg-background px-6 pb-4 pt-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Plan</p>
            <h1
              className="text-2xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Shopping lists
            </h1>
          </div>
          <Link
            to="/vision"
            className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary"
          >
            <Camera className="size-3" /> Scan
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) create.mutate(newName.trim());
          }}
          className="mb-6 flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New list name…"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!newName.trim() || create.isPending}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-4" /> Add
          </button>
        </form>

        {lists.isLoading && <p className="text-sm text-muted">Loading…</p>}
        {!lists.isLoading && (lists.data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
            No lists yet. Start one above, or ask Taylor to build one from your pantry and this
            week's specials.
          </div>
        )}
        <ul className="space-y-2">
          {pager.paged.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <button onClick={() => setOpenId(l.id)} className="flex-1 text-left">
                <p className="text-sm font-medium">{l.name}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {l.is_ai_generated ? "Taylor's Suggested List · " : ""}
                  {l.status}
                </p>
              </button>
              <button
                onClick={() => remove.mutate(l.id)}
                aria-label="Delete list"
                className="flex size-8 items-center justify-center rounded-full border border-border text-muted hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <Paginator
          page={pager.page}
          pageCount={pager.pageCount}
          total={pager.total}
          start={pager.start}
          end={pager.end}
          onPageChange={pager.setPage}
        />
      </main>
    </AppShell>
  );
}

function ListDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const detail = useQuery({
    queryKey: ["list", id],
    queryFn: () => getShoppingList({ data: { id } }),
  });

  const add = useMutation({
    mutationFn: (n: string) => addListItem({ data: { listId: id, name: n } }),
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["list", id] });
    },
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; checked: boolean }) => toggleListItem({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["list", id] }),
  });
  const del = useMutation({
    mutationFn: (iid: string) => deleteListItem({ data: { id: iid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["list", id] }),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; name: string; quantity: number | null; unit: string | null }) =>
      updateListItem({ data: v }),
    onSuccess: () => {
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ["list", id] });
    },
  });

  const startEdit = (item: { id: string; name: string; quantity: number | null; unit: string | null }) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity == null ? "" : String(item.quantity));
    setEditUnit(item.unit ?? "");
  };

  const saveEdit = (itemId: string) => {
    if (!editName.trim()) return;
    const quantity = editQuantity.trim() ? Number(editQuantity) : null;
    update.mutate({
      id: itemId,
      name: editName.trim(),
      quantity: quantity && Number.isFinite(quantity) ? quantity : null,
      unit: editUnit.trim() || null,
    });
  };

  const list = detail.data?.list;
  const items = detail.data?.items ?? [];
  const itemsPager = usePaged(items);

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <button
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Back
        </button>
        <div className="flex items-end justify-between gap-3">
          <h1
            className="text-2xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {list?.name ?? "…"}
          </h1>
          <button
            onClick={() => setCompareOpen(true)}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/10 disabled:opacity-40"
          >
            <Scale className="size-3.5" /> Compare prices
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-4 flex gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p>
            Before you compare prices please make sure you have the measurements right, e.g. you
            can't search for a 2 cup rice price but you can check a 2kg rice price.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add.mutate(name.trim());
          }}
          className="mb-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add item…"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            disabled={!name.trim()}
          >
            <Plus className="size-4" />
          </button>
        </form>
        <ul className="space-y-1">
          {itemsPager.paged.map((it) => {
            const isEditing = editingId === it.id;
            return (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={it.is_checked}
                  onChange={(e) => toggle.mutate({ id: it.id, checked: e.target.checked })}
                  className="size-4 accent-primary"
                />
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEdit(it.id);
                    }}
                    className="grid flex-1 grid-cols-[1fr_72px_64px] gap-2"
                  >
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Item name"
                      className="min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                    <input
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      inputMode="decimal"
                      aria-label="Quantity"
                      placeholder="Qty"
                      className="min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                    <input
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      aria-label="Unit"
                      placeholder="kg"
                      className="min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                  </form>
                ) : (
                  <span
                    className={
                      "flex-1 text-sm " + (it.is_checked ? "text-muted line-through" : "")
                    }
                  >
                    {it.name}
                    {it.quantity ? ` · ${it.quantity}${it.unit ?? ""}` : ""}
                    {!it.quantity && it.notes ? ` · ${it.notes}` : ""}
                  </span>
                )}
                {isEditing ? (
                  <button
                    onClick={() => saveEdit(it.id)}
                    className="text-primary hover:text-primary/80"
                    aria-label="Save item"
                    disabled={update.isPending}
                  >
                    <Check className="size-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => startEdit(it)}
                    className="text-muted hover:text-foreground"
                    aria-label="Edit item"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                <button
                  onClick={() => (isEditing ? setEditingId(null) : del.mutate(it.id))}
                  className="text-muted hover:text-destructive"
                  aria-label={isEditing ? "Cancel edit" : "Remove"}
                >
                  {isEditing ? <X className="size-3.5" /> : <Trash2 className="size-3.5" />}
                </button>
              </li>
            );
          })}
          {items.length === 0 && !detail.isLoading && (
            <p className="py-6 text-center text-xs text-muted">
              Empty list — add your first item above.
            </p>
          )}
        </ul>
        <Paginator
          page={itemsPager.page}
          pageCount={itemsPager.pageCount}
          total={itemsPager.total}
          start={itemsPager.start}
          end={itemsPager.end}
          onPageChange={itemsPager.setPage}
        />
      </main>
      {compareOpen && <BasketCompare listId={id} onClose={() => setCompareOpen(false)} />}
    </AppShell>
  );
}

function BasketCompare({ listId, onClose }: { listId: string; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["compare", listId],
    queryFn: () => compareBasket({ data: { listId } }),
  });
  const currency = q.data?.list.currency ?? "ZAR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Basket</p>
          <h2
            className="text-xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Price comparison
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-full border border-border p-2 hover:bg-muted/10"
        >
          <X className="size-4" />
        </button>
      </header>
      <main className="flex-1 overflow-auto">
        {q.isLoading && (
          <p className="p-6 text-center text-sm text-muted">Fetching live prices…</p>
        )}
        {q.error && (
          <p className="p-6 text-center text-sm text-destructive">
            {(q.error as Error).message}
          </p>
        )}
        {q.data && q.data.stores.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">
            No matching store prices found for the items in this basket yet.
          </p>
        )}
        {q.data && q.data.stores.length > 0 && (
          <BasketCompareTable data={q.data} fmt={fmt} />
        )}
      </main>
    </div>
  );
}

function BasketCompareTable({
  data,
  fmt,
}: {
  data: Awaited<ReturnType<typeof compareBasket>>;
  fmt: (n: number) => string;
}) {
  const winner = data.storeTotals[0];
  return (
    <div className="min-w-full">
      <div className="grid gap-2 border-b border-border bg-card/40 px-4 py-3 sm:grid-cols-3">
                {data.storeTotals.slice(0, 3).map((s, i) => (
          <div
            key={s.storeId}
            className={
              "rounded-xl border p-3 " +
              (i === 0 ? "border-primary bg-primary/5" : "border-border bg-background")
            }
          >
            <div className="flex items-center gap-2">
              {s.logo_url ? (
                <img src={s.logo_url} alt="" className="size-6 rounded-full object-cover" />
              ) : null}
              <span className="truncate text-sm font-medium">{s.name}</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{fmt(s.total)}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted">
              {s.matched}/{data.totalItems} matched
              {i === 0 && data.storeTotals.length > 1 && winner ? " · best" : ""}
            </p>
                    {s.unverified > 0 ? (
                      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted">
                        {s.unverified} unverified excluded
                      </p>
                    ) : null}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/5 text-left">
              <th className="sticky left-0 z-10 min-w-[140px] bg-muted/5 px-3 py-2 font-medium">
                Item
              </th>
              {data.stores.map((s) => (
                <th key={s.id} className="min-w-[110px] px-3 py-2 font-medium">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-background px-3 py-2">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-[10px] text-muted">
                    {row.quantityLabel || (row.quantity === 1 ? "" : `×${row.quantity}`)}
                    {row.matched ? "" : " · unmatched"}
                  </div>
                </td>
                {data.stores.map((s) => {
                  const v = row.perStore[s.id];
                  const isBest = row.cheapestStoreId === s.id && v != null;
                  return (
                    <td
                      key={s.id}
                      className={
                        "px-3 py-2 " +
                        (isBest ? "font-semibold text-primary" : "text-foreground")
                      }
                    >
                      {v == null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span>{fmt(v.price)}</span>
                          <span
                            className={
                              "inline-flex w-fit rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest " +
                              (v.verified
                                ? "bg-primary/10 text-primary"
                                : "bg-muted/20 text-muted")
                            }
                          >
                            {v.verified ? "Verified" : "Not verified"}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-card/50">
              <td className="sticky left-0 z-10 bg-card/80 px-3 py-2 font-semibold">Total</td>
              {data.stores.map((s) => {
                const t = data.storeTotals.find((x) => x.storeId === s.id);
                const isWinner = winner && s.id === winner.storeId;
                return (
                  <td
                    key={s.id}
                    className={
                      "px-3 py-2 font-semibold " +
                      (isWinner ? "text-primary" : "text-foreground")
                    }
                  >
                    {t ? fmt(t.total) : "—"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-[11px] text-muted">
        Only <span className="font-semibold text-foreground">Verified</span> prices — sourced from
        official retailer product pages or a store's own catalogue — are added to the totals.
        Prices marked <span className="font-semibold text-foreground">Not verified</span> are shown
        for reference only and are excluded.
      </p>
    </div>
  );
}

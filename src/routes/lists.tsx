import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell, BottomNav } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  addListItem,
  createShoppingList,
  deleteListItem,
  deleteShoppingList,
  getShoppingList,
  listMyShoppingLists,
  toggleListItem,
} from "@/lib/lists.functions";
import { Camera, Plus, Trash2, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/lists")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shopping lists - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Your personal and AI-generated shopping lists with basket totals and savings.",
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

  if (openId) return <ListDetail id={openId} onBack={() => setOpenId(null)} />;

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              Plan
            </p>
            <h1
              className="text-3xl italic tracking-tight"
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
            No lists yet. Start one above, or ask Taylor to build one from
            your pantry and this week's specials.
          </div>
        )}
        <ul className="space-y-2">
          {(lists.data ?? []).map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <button
                onClick={() => setOpenId(l.id)}
                className="flex-1 text-left"
              >
                <p className="text-sm font-medium">{l.name}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {l.is_ai_generated ? "AI · " : ""}
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
      </main>
      <BottomNav />
    </AppShell>
  );
}

function ListDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
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
    mutationFn: (v: { id: string; checked: boolean }) =>
      toggleListItem({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["list", id] }),
  });
  const del = useMutation({
    mutationFn: (iid: string) => deleteListItem({ data: { id: iid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["list", id] }),
  });

  const list = detail.data?.list;
  const items = detail.data?.items ?? [];

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <button
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> Back
        </button>
        <h1
          className="text-2xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {list?.name ?? "…"}
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-4">
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
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
            >
              <input
                type="checkbox"
                checked={it.is_checked}
                onChange={(e) =>
                  toggle.mutate({ id: it.id, checked: e.target.checked })
                }
                className="size-4 accent-primary"
              />
              <span
                className={
                  "flex-1 text-sm " +
                  (it.is_checked ? "text-muted line-through" : "")
                }
              >
                {it.name}
                {it.quantity ? ` · ${it.quantity}${it.unit ?? ""}` : ""}
              </span>
              <button
                onClick={() => del.mutate(it.id)}
                className="text-muted hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
          {items.length === 0 && !detail.isLoading && (
            <p className="py-6 text-center text-xs text-muted">
              Empty list — add your first item above.
            </p>
          )}
        </ul>
      </main>
      <BottomNav />
    </AppShell>
  );
}

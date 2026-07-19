import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { addPantryItem, deletePantryItem, listMyPantry } from "@/lib/pantry.functions";
import { Camera, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/pantry")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pantry - Taylor Intelligence" },
      {
        name: "description",
        content:
          "What's in your kitchen. Taylor uses your pantry to suggest recipes and reduce waste.",
      },
    ],
  }),
  component: PantryScreen,
});

function PantryScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [expires, setExpires] = useState("");

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const pantry = useQuery({
    queryKey: ["pantry", "mine"],
    queryFn: () => listMyPantry(),
    enabled: !!user,
  });

  const add = useMutation({
    mutationFn: () =>
      addPantryItem({ data: { name: name.trim(), expiresAt: expires || undefined } }),
    onSuccess: () => {
      setName("");
      setExpires("");
      void qc.invalidateQueries({ queryKey: ["pantry", "mine"] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deletePantryItem({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pantry", "mine"] }),
  });

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              Kitchen
            </p>
            <h1
              className="text-3xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pantry
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
            if (name.trim()) add.mutate();
          }}
          className="mb-6 space-y-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name (e.g. Olive oil)"
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-xs text-muted"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
        </form>
        <ul className="space-y-2">
          {(pantry.data ?? []).map((it) => {
            const expiring =
              it.expires_at &&
              new Date(it.expires_at).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
            return (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm">{it.name}</p>
                  {it.expires_at && (
                    <p
                      className={
                        "mt-0.5 text-[11px] " + (expiring ? "text-destructive" : "text-muted")
                      }
                    >
                      Best before {new Date(it.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => del.mutate(it.id)}
                  className="text-muted hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
          {(pantry.data?.length ?? 0) === 0 && !pantry.isLoading && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
              Your pantry is empty. Add a few staples so Taylor can suggest recipes and warn you
              before things expire.
            </div>
          )}
        </ul>
      </main>
      <BottomNav />
    </AppShell>
  );
}

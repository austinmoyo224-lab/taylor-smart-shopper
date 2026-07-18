import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listTaylorKnowledge,
  upsertTaylorKnowledge,
  deleteTaylorKnowledge,
} from "@/lib/admin.functions";
import { Trash2, Plus, Save } from "lucide-react";

export const Route = createFileRoute("/admin/knowledge")({
  ssr: false,
  component: KnowledgePage,
});

type KnowledgeRow = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  source_url: string | null;
  is_active: boolean;
  updated_at: string;
};

function emptyRow(): KnowledgeRow {
  return {
    id: "",
    title: "",
    content: "",
    category: "",
    tags: [],
    source_url: "",
    is_active: true,
    updated_at: "",
  };
}

function KnowledgePage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin", "knowledge"],
    queryFn: () => listTaylorKnowledge(),
  });
  const [editing, setEditing] = useState<KnowledgeRow | null>(null);

  const save = useMutation({
    mutationFn: (row: KnowledgeRow) =>
      upsertTaylorKnowledge({
        data: {
          id: row.id || undefined,
          title: row.title,
          content: row.content,
          category: row.category || null,
          tags: row.tags ?? [],
          source_url: row.source_url || null,
          is_active: row.is_active,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTaylorKnowledge({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-background px-8 py-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Taylor AI</p>
        <h1 className="text-3xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Knowledge base
        </h1>
        <p className="mt-2 text-sm text-muted">
          Facts, policies and reference material Taylor uses in every conversation.
        </p>
      </header>
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mb-4">
          <button
            onClick={() => setEditing(emptyRow())}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="size-3.5" /> New entry
          </button>
        </div>

        {editing && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title">
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Category">
                <input
                  value={editing.category ?? ""}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Tags (comma separated)">
                <input
                  value={(editing.tags ?? []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Source URL">
                <input
                  value={editing.source_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, source_url: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>
            <Field label="Content" className="mt-3">
              <textarea
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                rows={8}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>
            <label className="mt-3 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Active (loaded into Taylor's prompt)
            </label>
            <div className="mt-4 flex gap-2">
              <button
                disabled={save.isPending || !editing.title || !editing.content}
                onClick={() => save.mutate(editing)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                <Save className="size-3.5" /> Save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-border px-4 py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {(list.data ?? []).map((row) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium">{row.title}</h3>
                    {row.category && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted">
                        {row.category}
                      </span>
                    )}
                    {!row.is_active && (
                      <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] text-muted">
                        inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted">
                    {row.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      setEditing({
                        ...row,
                        tags: row.tags ?? [],
                      } as KnowledgeRow)
                    }
                    className="rounded-full border border-border px-3 py-1.5 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this entry?")) remove.mutate(row.id);
                    }}
                    className="rounded-full border border-border p-1.5 text-muted hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {list.data?.length === 0 && (
            <p className="text-xs text-muted">No knowledge entries yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  listVaultFiles,
  uploadVaultFile,
  deleteVaultFile,
} from "@/lib/admin.functions";
import { Upload, Copy, Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/vault")({
  ssr: false,
  component: VaultPage,
});

function VaultPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin", "vault"],
    queryFn: () => listVaultFiles(),
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const contentBase64 = await fileToBase64(file);
      return uploadVaultFile({
        data: {
          name: file.name,
          contentBase64,
          contentType: file.type || "application/octet-stream",
        },
      });
    },
    onSuccess: () => {
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["admin", "vault"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  const remove = useMutation({
    mutationFn: (name: string) => deleteVaultFile({ data: { name } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "vault"] });
    },
  });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    for (const f of files) {
      await upload.mutateAsync(f).catch(() => undefined);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-background px-8 py-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Admin</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Document vault
        </h1>
        <p className="mt-2 text-sm text-muted">
          Upload any file, then copy its URL to use anywhere in the system.
        </p>
      </header>
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mb-6">
          <input
            ref={fileInput}
            type="file"
            multiple
            onChange={onPick}
            className="hidden"
          />
          <button
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            {busy ? "Uploading…" : "Upload files"}
          </button>
          <p className="mt-2 text-[11px] text-muted">Max 50MB per file.</p>
        </div>

        <div className="space-y-2">
          {(list.data ?? []).map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <FileText className="size-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.name}</p>
                <p className="text-[11px] text-muted">
                  {(f.size / 1024).toFixed(1)} KB · {f.mime || "unknown"}
                </p>
              </div>
              <button
                onClick={() => copy(f.url)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs"
                title="Copy URL"
              >
                <Copy className="size-3.5" /> Copy URL
              </button>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-3 py-1.5 text-xs"
              >
                Open
              </a>
              <button
                onClick={() => {
                  if (confirm(`Delete ${f.name}?`)) remove.mutate(f.name);
                }}
                className="rounded-full border border-border p-1.5 text-muted hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {list.data?.length === 0 && (
            <p className="text-xs text-muted">No files yet. Upload your first one.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
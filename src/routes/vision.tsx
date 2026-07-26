import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { VisionCapture } from "@/components/VisionCapture";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeVisionScan,
  deleteVisionScan,
  listMyVisionScans,
  suggestRecipesFromItems,
  type MatchedItem,
} from "@/lib/vision.functions";
import { addListItem, createShoppingList, listMyShoppingLists } from "@/lib/lists.functions";
import { addPantryItem } from "@/lib/pantry.functions";
import {
  Camera,
  Check,
  ChefHat,
  ListPlus,
  Plus,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type VisionScan = {
  id: string;
  image_url: string | null;
  detected: { items?: MatchedItem[]; storage_path?: string };
  created_at: string;
};

export const Route = createFileRoute("/vision")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Taylor Vision - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Snap a photo of your fridge or pantry and let Taylor identify items, match products, and build your shopping list.",
      },
    ],
  }),
  component: VisionScreen,
});

function VisionScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"capture" | "analysing" | "results" | "history">("capture");
  const [scanId, setScanId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<MatchedItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [targetListId, setTargetListId] = useState<string>("new");
  const [newListName, setNewListName] = useState("");
  const [queued, setQueued] = useState<{ path: string; url: string }[]>([]);
  const [showCapture, setShowCapture] = useState(true);
  const [recipes, setRecipes] = useState<
    {
      id: string;
      title: string;
      hero_image_url: string | null;
      cooking_time_minutes: number | null;
      servings: number | null;
    }[]
  >([]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const history = useQuery({
    queryKey: ["vision", "history"],
    queryFn: () => listMyVisionScans(),
    enabled: !!user,
  });

  const lists = useQuery({
    queryKey: ["lists", "mine"],
    queryFn: () => listMyShoppingLists(),
    enabled: !!user,
  });

  const analyze = useMutation({
    mutationFn: (storagePaths: string[]) => analyzeVisionScan({ data: { storagePaths } }),
    onSuccess: (res) => {
      setScanId(res.scanId);
      setImageUrl(res.imageUrl);
      setItems(res.items);
      setSelected(new Set(res.items.map((_, i) => i)));
      setMode("results");
      setQueued([]);
      void qc.invalidateQueries({ queryKey: ["vision", "history"] });
    },
    onError: (err) => {
      console.error("[vision] analyze error", err);
      alert(err instanceof Error ? err.message : "Scan failed. Please try again.");
      setMode("capture");
    },
  });

  const removeScan = useMutation({
    mutationFn: (id: string) => deleteVisionScan({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vision", "history"] }),
  });

  const addToPantry = useMutation({
    mutationFn: async () => {
      const toAdd = items.filter((_, i) => selected.has(i));
      for (const it of toAdd) {
        const expiresAt = it.estimated_expiry_days
          ? addDays(new Date(), it.estimated_expiry_days).toISOString().slice(0, 10)
          : undefined;
        await addPantryItem({
          data: {
            name: it.name,
            quantity: it.quantity ?? undefined,
            unit: it.unit ?? undefined,
            expiresAt,
          },
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pantry", "mine"] });
      setSelected(new Set());
    },
  });

  const addToList = useMutation({
    mutationFn: async () => {
      let listId = targetListId === "new" ? null : targetListId;
      if (targetListId === "new" && newListName.trim()) {
        const row = await createShoppingList({ data: { name: newListName.trim() } });
        if (row?.id) listId = row.id;
      }
      if (!listId) throw new Error("Choose or create a list");
      const toAdd = items.filter((_, i) => selected.has(i));
      for (const it of toAdd) {
        await addListItem({
          data: {
            listId,
            name: it.name,
            quantity: it.quantity ?? undefined,
            unit: it.unit ?? undefined,
          },
        });
      }
      return listId;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lists", "mine"] });
      setSelected(new Set());
    },
  });

  const findRecipes = useMutation({
    mutationFn: () =>
      suggestRecipesFromItems({
        data: { names: items.filter((_, i) => selected.has(i)).map((it) => it.name) },
      }),
    onSuccess: (res) => setRecipes(res),
  });

  function toggleItem(index: number) {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  }

  function onCapture(storagePath: string, previewUrl: string) {
    setQueued((q) => [...q, { path: storagePath, url: previewUrl }]);
    setShowCapture(false);
  }

  function analyseQueue() {
    if (queued.length === 0) return;
    setMode("analysing");
    analyze.mutate(queued.map((q) => q.path));
  }

  function loadScan(scan: VisionScan) {
    setScanId(scan.id);
    setImageUrl(scan.image_url);
    setItems(scan.detected.items ?? []);
    setSelected(new Set((scan.detected.items ?? []).map((_, i) => i)));
    setRecipes([]);
    setMode("results");
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
          Redirecting to sign in…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          Taylor Vision
        </p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Scan
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {mode === "capture" && (
          <>
            {showCapture ? (
              <VisionCapture
                userId={user.id}
                onCapture={(path, url) => onCapture(path, url)}
                onCancel={() =>
                  queued.length > 0 ? setShowCapture(false) : setMode("history")
                }
              />
            ) : (
              <div className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {queued.length} photo{queued.length === 1 ? "" : "s"} ready
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Up to 8
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Add more angles of your fridge or pantry, then let Taylor combine them into one
                  inventory.
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {queued.map((q, i) => (
                    <div key={q.path} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                      <img src={q.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setQueued((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow"
                        aria-label="Remove photo"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {queued.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setShowCapture(true)}
                      className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-muted hover:border-primary hover:text-primary"
                      aria-label="Add another photo"
                    >
                      <Plus className="size-5" />
                    </button>
                  )}
                </div>
                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={analyseQueue}
                    disabled={queued.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-50"
                  >
                    <Sparkles className="size-4" />
                    Analyse {queued.length} photo{queued.length === 1 ? "" : "s"}
                  </button>
                  {queued.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setShowCapture(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium"
                    >
                      <Camera className="size-4" />
                      Add another photo
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-medium">Recent scans</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                <Camera className="size-3.5" /> Gallery
              </button>
            </div>
            <ScanHistory
              scans={(history.data ?? []) as VisionScan[]}
              onSelect={loadScan}
              onDelete={(id) => removeScan.mutate(id)}
              isDeleting={removeScan.isPending}
            />
          </>
        )}

        {mode === "analysing" && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted">Taylor is looking at your photo…</p>
          </div>
        )}

        {mode === "results" && (
          <>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Scanned photo"
                className="mb-4 aspect-[4/5] w-full rounded-3xl border border-border object-cover"
              />
            )}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium">
                {items.length} item{items.length === 1 ? "" : "s"} detected
              </p>
              <button
                type="button"
                onClick={() => setMode("capture")}
                className="text-xs text-muted hover:text-foreground"
              >
                Scan another
              </button>
            </div>

            <ul className="mb-6 space-y-2">
              {items.map((it, i) => (
                <li
                  key={i}
                  onClick={() => toggleItem(i)}
                  className={`cursor-pointer rounded-2xl border px-4 py-3 transition-colors ${
                    selected.has(i) ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                        selected.has(i)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {selected.has(i) && <Check className="size-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{it.name}</p>
                      <p className="text-xs text-muted">
                        {it.quantity ? `${it.quantity}` : ""}
                        {it.unit ? ` ${it.unit}` : ""}
                        {it.category ? ` · ${it.category}` : ""}
                        {it.brand ? ` · ${it.brand}` : ""}
                      </p>
                      {it.matched_product && (
                        <p className="mt-1 text-xs text-primary">
                          Matched: {it.matched_product.name} — {it.matched_product.currency_code}{" "}
                          {it.matched_product.base_price}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        it.confidence >= 0.7 ? "text-primary" : "text-muted"
                      }`}
                    >
                      {Math.round(it.confidence * 100)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {items.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Add selected to
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addToPantry.mutate()}
                    disabled={selected.size === 0 || addToPantry.isPending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <ShoppingBasket className="size-4" />
                    Pantry
                  </button>
                  <button
                    type="button"
                    onClick={() => addToList.mutate()}
                    disabled={selected.size === 0 || addToList.isPending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary py-2.5 text-sm font-medium text-primary disabled:opacity-50"
                  >
                    <ListPlus className="size-4" />
                    List
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={targetListId}
                    onChange={(e) => setTargetListId(e.target.value)}
                    className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="new">+ New list</option>
                    {(lists.data ?? []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  {targetListId === "new" && (
                    <input
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="List name"
                      className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-xs"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => findRecipes.mutate()}
                  disabled={selected.size === 0 || findRecipes.isPending}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  <ChefHat className="size-4" />
                  Find recipes
                </button>
              </div>
            )}

            {recipes.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium">Recipe ideas</p>
                <ul className="space-y-2">
                  {recipes.map((r) => (
                    <li
                      key={r.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      {r.hero_image_url && (
                        <img
                          src={r.hero_image_url}
                          alt={r.title}
                          className="h-32 w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted">
                          {r.cooking_time_minutes ? `${r.cooking_time_minutes}m` : ""}
                          {r.servings ? ` · ${r.servings} servings` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setMode("analysing");
          const path = await uploadFromFile(file, user.id);
          if (path) analyze.mutate([path]);
          else setMode("capture");
        }}
      />
    </AppShell>
  );
}

async function uploadFromFile(file: File, userId: string): Promise<string | null> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("vision-uploads").upload(path, file, {
    contentType: "image/jpeg",
  });
  if (error) {
    console.error("[vision] upload failed", error.message);
    return null;
  }
  return path;
}

function ScanHistory({
  scans,
  onSelect,
  onDelete,
  isDeleting,
}: {
  scans: VisionScan[];
  onSelect: (scan: VisionScan) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  if (scans.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        No scans yet. Take your first photo above.
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {scans.map((scan) => (
        <li
          key={scan.id}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
        >
          <ScanThumbnail detected={scan.detected} />
          <button onClick={() => onSelect(scan)} className="flex-1 text-left">
            <p className="text-sm font-medium">
              {new Date(scan.created_at).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-muted">
              {((scan.detected as { items?: unknown[] })?.items ?? []).length} items
            </p>
          </button>
          <button
            onClick={() => onDelete(scan.id)}
            disabled={isDeleting}
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted hover:text-destructive"
            aria-label="Delete scan"
          >
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ScanThumbnail({ detected }: { detected: unknown }) {
  const [url, setUrl] = useState<string | null>(null);
  const storagePath = (detected as { storage_path?: string })?.storage_path;

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.storage
        .from("vision-uploads")
        .createSignedUrl(storagePath, 60 * 10);
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (!url) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface">
        <Camera className="size-5 text-muted" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Scan thumbnail"
      className="size-12 shrink-0 rounded-xl object-cover"
      loading="lazy"
    />
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  addRecipeToShoppingList,
  generateRecipePhoto,
  getMyRecipeBySlug,
  getRecipeBySlug,
  markRecipeShareable,
  recordRecipeShareEvent,
  saveRecipeToMine,
} from "@/lib/recipes.functions";
import { listMyShoppingLists } from "@/lib/lists.functions";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, Clock, ShoppingBasket, Minus, Plus, ImagePlus, Loader2, Share2, BookmarkPlus, Sparkles, Download, X } from "lucide-react";

const recipeQO = (slug: string) =>
  queryOptions({
    queryKey: ["recipe", slug],
    queryFn: () => getRecipeBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/recipes/$slug")({
  head: ({ loaderData }: { loaderData?: Awaited<ReturnType<typeof getRecipeBySlug>> }) => {
    const r = loaderData?.recipe;
    const title = r?.title
      ? `${r.title} - Taylor Intelligence`
      : "Recipe - Taylor Intelligence";
    const desc =
      r?.description ??
      "A Taylor-picked recipe with ingredients ready to send to your shopping list.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(r?.hero_image_url
          ? [
              { property: "og:image", content: r.hero_image_url },
              { name: "twitter:image", content: r.hero_image_url },
            ]
          : []),
      ],
    };
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(recipeQO(params.slug)),
  component: RecipeDetail,
  errorComponent: () => (
    <AppShell>
      <div className="p-8 text-sm text-muted">Couldn't load this recipe.</div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="p-8 text-sm text-muted">Recipe not found.</div>
    </AppShell>
  ),
});

function RecipeDetail() {
  return (
    <AppShell>
      <Suspense fallback={<p className="px-6 py-10 text-sm text-muted">Loading…</p>}>
        <RecipeBody />
      </Suspense>
    </AppShell>
  );
}

function RecipeBody() {
  const { slug } = Route.useParams();
  const { data: publicData } = useSuspenseQuery(recipeQO(slug));
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mine = useQuery({
    queryKey: ["recipe", "mine", slug],
    queryFn: () => getMyRecipeBySlug({ data: { slug } }),
    enabled: !!user,
  });
  const data = mine.data ?? publicData ?? null;
  const recipe = data?.recipe ?? null;
  const isOwner = !!mine.data;
  const ingredients = data?.ingredients ?? [];
  const baseServings = Math.max(1, Number(recipe?.servings ?? 1));
  const [servings, setServings] = useState<number>(baseServings);
  const [skipPantry, setSkipPantry] = useState(true);
  const [targetListId, setTargetListId] = useState<string>("new");
  const [result, setResult] = useState<{ added: number; skipped: number; list_id: string } | null>(
    null,
  );

  useEffect(() => {
    if (recipe?.id) setServings(Math.max(1, Number(recipe.servings ?? 1)));
  }, [recipe?.id, recipe?.servings]);

  const lists = useQuery({
    queryKey: ["lists", "mine"],
    queryFn: () => listMyShoppingLists(),
    enabled: !!user,
  });

  const send = useMutation({
    mutationFn: () =>
      recipe
        ?
      addRecipeToShoppingList({
        data: {
          recipe_id: recipe.id,
          servings,
          skip_pantry: skipPantry,
          list_id: targetListId === "new" ? undefined : targetListId,
        },
      })
        : Promise.reject(new Error("Recipe not loaded")),
    onSuccess: (r) => setResult(r),
  });

  const regenPhoto = useMutation({
    mutationFn: () =>
      recipe
        ? generateRecipePhoto({ data: { recipe_id: recipe.id } })
        : Promise.reject(new Error("Recipe not loaded")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipe", "mine", slug] });
      qc.invalidateQueries({ queryKey: ["recipes", "mine"] });
    },
  });

  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  const saveMine = useMutation({
    mutationFn: () =>
      recipe
        ? saveRecipeToMine({ data: { recipe_id: recipe.id } })
        : Promise.reject(new Error("Recipe not loaded")),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["recipes", "mine"] });
      navigate({ to: "/recipes/$slug", params: { slug: r.slug } });
    },
  });

  // Log an "open" event when arriving via a shared link (?s=1).
  useEffect(() => {
    if (!recipe?.id || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("s") !== "1") return;
    recordRecipeShareEvent({
      data: {
        recipe_id: recipe.id,
        event_type: "open",
        referrer: document.referrer || undefined,
        user_agent: navigator.userAgent,
      },
    }).catch(() => {});
  }, [recipe?.id]);

  async function handleShare() {
    if (!recipe) return;
    // Ensure the recipe is publicly viewable via link when the owner shares.
    let sharedSlug = recipe.slug;
    if (isOwner) {
      try {
        const marked = await markRecipeShareable({ data: { recipe_id: recipe.id } });
        sharedSlug = marked.slug ?? recipe.slug;
        await qc.invalidateQueries({ queryKey: ["recipe", slug] });
        await qc.invalidateQueries({ queryKey: ["recipe", "mine", slug] });
      } catch (e) {
        setShareMsg((e as Error).message || "Couldn't prepare this recipe for sharing");
        setTimeout(() => setShareMsg(null), 3000);
        return;
      }
    }
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/recipes/${sharedSlug}`
        : "";
    const url = base ? `${base}?s=1` : "";
    const title = recipe.title;
    const text =
      `${recipe.title}${recipe.description ? ` — ${recipe.description}` : ""}\n\nShared from Taylor 🛒`;
    recordRecipeShareEvent({
      data: { recipe_id: recipe.id, event_type: "share_click" },
    }).catch(() => {});
    try {
      let files: File[] | undefined;
      if (recipe.hero_image_url) {
        try {
          const res = await fetch(recipe.hero_image_url);
          const blob = await res.blob();
          const file = new File([blob], `${slug}.png`, { type: blob.type || "image/png" });
          const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
          if (nav.canShare?.({ files: [file] })) files = [file];
        } catch {
          /* ignore, share without image */
        }
      }
      if (navigator.share) {
        await navigator.share({ title, text, url, ...(files ? { files } : {}) });
        recordRecipeShareEvent({
          data: {
            recipe_id: recipe.id,
            event_type: "share_success",
            channel: "native_share",
          },
        }).catch(() => {});
        return;
      }
      await navigator.clipboard.writeText(`${title}\n${url}`);
      recordRecipeShareEvent({
        data: { recipe_id: recipe.id, event_type: "link_copy", channel: "clipboard" },
      }).catch(() => {});
      setShareMsg("Link copied to clipboard");
      setTimeout(() => setShareMsg(null), 2500);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setShareMsg("Couldn't share — link copied instead");
      try {
        await navigator.clipboard.writeText(url);
        recordRecipeShareEvent({
          data: {
            recipe_id: recipe.id,
            event_type: "link_copy",
            channel: "clipboard_fallback",
          },
        }).catch(() => {});
      } catch {
        /* noop */
      }
      setTimeout(() => setShareMsg(null), 2500);
    }
  }

  if (!data || !recipe) {
    if (mine.isLoading) return <div className="p-8 text-sm text-muted">Loading…</div>;
    return <div className="p-8 text-sm text-muted">Recipe not found.</div>;
  }

  const scale = servings / baseServings;
  const rawInstructions: unknown = recipe.instructions;
  const instructions: string[] = Array.isArray(rawInstructions)
    ? rawInstructions
        .map((s) =>
          typeof s === "string"
            ? s
            : s && typeof s === "object" && "text" in (s as Record<string, unknown>)
              ? String((s as Record<string, unknown>).text ?? "")
              : "",
        )
        .filter((s) => s.length > 0)
    : typeof rawInstructions === "string"
      ? [rawInstructions]
      : [];

  return (
    <>
      <header className="relative">
        {recipe.hero_image_url ? (
          <div className="relative">
            <img
              src={recipe.hero_image_url}
              alt={recipe.title}
              className="h-56 w-full object-cover"
            />
            <span className="pointer-events-none absolute bottom-2 right-3 rounded bg-background/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground/80 backdrop-blur-sm">
              Hey Taylor!
            </span>
          </div>
        ) : isOwner ? (
          <div className="flex h-56 w-full items-center justify-center bg-muted/30">
            <button
              onClick={() => regenPhoto.mutate()}
              disabled={regenPhoto.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-60"
            >
              {regenPhoto.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Plating your photo…
                </>
              ) : (
                <>
                  <ImagePlus className="size-3.5" /> Generate photo
                </>
              )}
            </button>
          </div>
        ) : null}
        <Link
          to="/recipes"
          className="absolute left-4 top-10 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur"
        >
          <ChevronLeft className="size-3.5" /> Recipes
        </Link>
        <button
          onClick={handleShare}
          aria-label="Share recipe"
          className="absolute right-4 top-10 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur"
        >
          <Share2 className="size-3.5" /> Share
        </button>
        {isOwner && recipe.hero_image_url && (
          <button
            onClick={() => regenPhoto.mutate()}
            disabled={regenPhoto.isPending}
            className="absolute right-24 top-10 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur disabled:opacity-60"
          >
            {regenPhoto.isPending ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Replating…
              </>
            ) : (
              <>
                <ImagePlus className="size-3" /> Regenerate
              </>
            )}
          </button>
        )}
        {shareMsg && (
          <p className="px-6 py-2 text-xs text-muted">{shareMsg}</p>
        )}
        {regenPhoto.error && (
          <p className="px-6 py-2 text-xs text-destructive">
            {(regenPhoto.error as Error).message}
          </p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24 pt-6">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Cook</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {recipe.title}
        </h1>
        {recipe.description && <p className="mt-2 text-sm text-muted">{recipe.description}</p>}
        <div className="mt-3 flex gap-4 font-mono text-[10px] text-muted">
          {recipe.cooking_time_minutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {recipe.cooking_time_minutes}m
            </span>
          )}
          {recipe.difficulty && (
            <span className="uppercase tracking-widest">{recipe.difficulty}</span>
          )}
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Servings</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                aria-label="Fewer servings"
                className="flex size-8 items-center justify-center rounded-full border border-border"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{servings}</span>
              <button
                onClick={() => setServings((s) => Math.min(50, s + 1))}
                aria-label="More servings"
                className="flex size-8 items-center justify-center rounded-full border border-border"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {ingredients.map((ing) => {
              const q = ing.quantity == null ? null : Number(ing.quantity) * scale;
              return (
                <li key={ing.id} className="flex justify-between py-2 text-sm">
                  <span>{ing.name}</span>
                  <span className="font-mono text-xs text-muted">
                    {q != null ? `${q % 1 === 0 ? q : q.toFixed(1)}${ing.unit ?? ""}` : ing.unit ?? ""}
                  </span>
                </li>
              );
            })}
            {ingredients.length === 0 && (
              <li className="py-2 text-xs text-muted">No ingredients listed.</li>
            )}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
            Send to shopping list
          </p>
          {!user ? (
            <button
              onClick={() => setJoinOpen(true)}
              className="w-full rounded-full bg-primary py-2.5 text-sm text-primary-foreground"
            >
              Sign in to add
            </button>
          ) : (
            <>
              <label className="mb-3 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={skipPantry}
                  onChange={(e) => setSkipPantry(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Skip items already in my pantry
              </label>
              <select
                value={targetListId}
                onChange={(e) => setTargetListId(e.target.value)}
                className="mb-3 w-full rounded-full border border-border bg-background px-4 py-2 text-sm"
              >
                <option value="new">Create new list</option>
                {(lists.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    Add to: {l.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => send.mutate()}
                disabled={send.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                <ShoppingBasket className="size-4" />
                {send.isPending ? "Adding…" : "Add ingredients to list"}
              </button>
              {send.error && (
                <p className="mt-2 text-xs text-destructive">{(send.error as Error).message}</p>
              )}
              {result && (
                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
                  Added {result.added} item{result.added === 1 ? "" : "s"}
                  {result.skipped > 0 ? ` · skipped ${result.skipped} in pantry` : ""}.{" "}
                  <Link to="/lists" className="font-medium text-primary underline">
                    Open list
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        {!isOwner && (
          <section className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
              Save this recipe
            </p>
            {user ? (
              <>
                <p className="mb-3 text-xs text-muted">
                  Keep a copy in your recipes so Taylor can suggest it, scale it, and add its
                  ingredients to a list anytime.
                </p>
                <button
                  onClick={() => saveMine.mutate()}
                  disabled={saveMine.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm text-primary-foreground disabled:opacity-60"
                >
                  <BookmarkPlus className="size-4" />
                  {saveMine.isPending ? "Saving…" : "Save to my recipes"}
                </button>
                {saveMine.error && (
                  <p className="mt-2 text-xs text-destructive">
                    {(saveMine.error as Error).message}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted">
                  Join Taylor free to save recipes, scale servings, and turn ingredients into a
                  shopping list.
                </p>
                <button
                  onClick={() => setJoinOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm text-primary-foreground"
                >
                  <Sparkles className="size-4" />
                  Join Taylor to save
                </button>
              </>
            )}
          </section>
        )}

        {instructions.length > 0 && (
          <section className="mt-6">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
              Method
            </p>
            <ol className="space-y-3">
              {instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span
                    className="mt-0.5 text-xl italic text-primary"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
      {joinOpen && (
        <JoinTaylorModal recipeTitle={recipe.title} onClose={() => setJoinOpen(false)} />
      )}
    </>
  );
}

function JoinTaylorModal({
  recipeTitle,
  onClose,
}: {
  recipeTitle: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [installEvt, setInstallEvt] = useState<
    (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null
  >(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(
        e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> },
      );
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
              Join Taylor
            </p>
            <h2
              className="text-xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Save “{recipeTitle}”
            </h2>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          Taylor is your free shopping companion. Join to save recipes, scale servings, and turn
          ingredients into a smart shopping list with live South African prices.
        </p>
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm text-primary-foreground"
        >
          <Sparkles className="size-4" /> Join Taylor free
        </button>
        {installEvt && (
          <button
            onClick={async () => {
              try {
                await installEvt.prompt();
                await installEvt.userChoice;
              } finally {
                onClose();
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm"
          >
            <Download className="size-4" /> Install the app
          </button>
        )}
        <p className="mt-3 text-center text-[10px] text-muted">
          Already have an account?{" "}
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="font-medium text-primary underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
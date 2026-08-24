import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  generateRecipeIdeaFn,
  listMyRecipes,
  listPublishedRecipes,
} from "@/lib/recipes.functions";
import { RECIPE_STYLES } from "@/lib/recipe-styles";
import { useAuth } from "@/hooks/useAuth";
import { ChefHat, Clock, Loader2, Sparkles, Users, Wand2 } from "lucide-react";
import { Paginator, usePaged } from "@/components/Paginator";

const recipesQO = queryOptions({
  queryKey: ["recipes", "published"],
  queryFn: () => listPublishedRecipes(),
});

export const Route = createFileRoute("/recipes/")({
  head: () => ({
    meta: [
      { title: "Recipes - Taylor Intelligence" },
      {
        name: "description",
        content:
          "AI-picked recipes that match your pantry, budget, weather and the specials at stores you follow.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQO),
  component: RecipesScreen,
  errorComponent: () => (
    <AppShell>
      <div className="p-8 text-sm text-muted">
        Couldn't load recipes right now. Please try again shortly.
      </div>
    </AppShell>
  ),
  notFoundComponent: () => null,
});

function RecipesScreen() {
  return (
    <AppShell>
      <header className="relative isolate overflow-hidden border-b border-border bg-background px-6 pb-4 pt-8">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Cook</p>
        <h1
          className="text-2xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recipes
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <IdeaGenerator />
        <Suspense fallback={<p className="px-2 py-6 text-sm text-muted">Loading…</p>}>
          <MyRecipes />
          <RecipeGrid />
        </Suspense>
      </main>
    </AppShell>
  );
}

function IdeaGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [style, setStyle] = useState<string>(RECIPE_STYLES[0]);
  const [brief, setBrief] = useState("");
  const [servings, setServings] = useState(4);
  const [maxMinutes, setMaxMinutes] = useState<number | "">("");
  const [usePantry, setUsePantry] = useState(false);

  const gen = useMutation({
    mutationFn: () =>
      generateRecipeIdeaFn({
        data: {
          style,
          brief: brief.trim() ? brief.trim().slice(0, 600) : undefined,
          servings,
          max_minutes: typeof maxMinutes === "number" ? maxMinutes : undefined,
          use_pantry: usePantry,
        },
      }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["recipes", "mine"] });
      navigate({ to: "/recipes/$slug", params: { slug: r.slug } });
    },
  });

  return (
    <section className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="mb-1 flex items-center gap-2">
        <ChefHat className="size-4 text-primary" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Create a recipe with Taylor
        </p>
      </div>
      <p className="mb-3 text-xs text-muted">
        Pick a style and describe what you feel like — or leave it blank and let Taylor invent
        something.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {RECIPE_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStyle(s)}
            className={`rounded-full border px-3 py-1 text-[11px] transition ${
              style === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted hover:border-primary/50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        maxLength={600}
        rows={2}
        placeholder="e.g. something warm with mince and pap for a cold night"
        className="mb-3 w-full resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60"
      />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="flex items-center justify-between gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs text-muted">
          <span>Serves</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              disabled={servings <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-foreground disabled:opacity-40"
              aria-label="Decrease servings"
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm text-foreground">{servings}</span>
            <button
              type="button"
              onClick={() => setServings((s) => Math.min(20, s + 1))}
              disabled={servings >= 20}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-foreground disabled:opacity-40"
              aria-label="Increase servings"
            >
              +
            </button>
          </div>
        </label>
        <label className="flex items-center justify-between gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs text-muted">
          Max mins
          <input
            type="number"
            min={5}
            max={240}
            value={maxMinutes}
            placeholder="any"
            onChange={(e) =>
              setMaxMinutes(e.target.value === "" ? "" : Math.max(5, Math.min(240, Number(e.target.value) || 5)))
            }
            className="w-14 bg-transparent text-right text-sm text-foreground outline-none"
          />
        </label>
      </div>

      <label className="mb-3 flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={usePantry}
          onChange={(e) => setUsePantry(e.target.checked)}
          className="size-4 accent-primary"
        />
        Use what's already in my pantry
      </label>

      {user ? (
        <button
          onClick={() => gen.mutate()}
          disabled={gen.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm text-primary-foreground disabled:opacity-60"
        >
          {gen.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Taylor is cooking up an idea…
            </>
          ) : (
            <>
              <Wand2 className="size-4" /> Generate a recipe
            </>
          )}
        </button>
      ) : (
        <Link
          to="/auth"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm text-primary-foreground"
        >
          <Sparkles className="size-4" /> Sign in to generate recipes
        </Link>
      )}
      {gen.error && (
        <p className="mt-2 text-xs text-destructive">{(gen.error as Error).message}</p>
      )}
    </section>
  );
}

function MyRecipes() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["recipes", "mine"],
    queryFn: () => listMyRecipes(),
    enabled: !!user,
  });
  const items = q.data ?? [];
  if (!user || items.length === 0) return null;
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2 px-2">
        <Sparkles className="size-3.5 text-primary" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Your recipes from Taylor
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <li
            key={r.id}
            className="overflow-hidden rounded-2xl border border-primary/30 bg-card transition hover:border-primary/60"
          >
            <Link to="/recipes/$slug" params={{ slug: r.slug }} className="block">
              {r.hero_image_url ? (
                <img
                  src={r.hero_image_url}
                  alt={r.title}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-primary/5">
                  <ChefHat className="size-7 text-primary/40" />
                </div>
              )}
              <div className="p-4">
              <p className="text-sm font-medium leading-snug">{r.title}</p>
              {r.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted">{r.description}</p>
              )}
              <div className="mt-2 flex gap-3 font-mono text-[10px] text-muted">
                {r.cooking_time_minutes && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {r.cooking_time_minutes}m
                  </span>
                )}
                {r.servings && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {r.servings}
                  </span>
                )}
                {r.source && (
                  <span className="uppercase tracking-widest">{r.source}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecipeGrid() {
  const { data } = useSuspenseQuery(recipesQO);
  const { user } = useAuth();
  const myRecipes = useQuery({
    queryKey: ["recipes", "mine"],
    queryFn: () => listMyRecipes(),
    enabled: !!user,
  });
  const pager = usePaged(data);
  if (data.length === 0)
    return user && (myRecipes.isLoading || (myRecipes.data ?? []).length > 0) ? null : (
      <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
        Ask Taylor for a recipe and it will appear here automatically.
      </div>
    );
  return (
    <>
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {pager.paged.map((r) => (
        <li key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40">
          <Link to="/recipes/$slug" params={{ slug: r.slug }} className="block">
          {r.hero_image_url && (
            <div className="relative">
              <img
                src={r.hero_image_url}
                alt={r.title}
                className="h-36 w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-4">
            <div className="mb-1 flex items-center gap-2">
              {r.is_sponsored && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                  Sponsored
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-snug">{r.title}</p>
            {r.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">{r.description}</p>
            )}
            <div className="mt-2 flex gap-3 font-mono text-[10px] text-muted">
              {r.cooking_time_minutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {r.cooking_time_minutes}m
                </span>
              )}
              {r.servings && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {r.servings}
                </span>
              )}
            </div>
          </div>
          </Link>
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
    </>
  );
}

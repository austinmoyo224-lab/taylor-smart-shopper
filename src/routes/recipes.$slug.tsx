import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell, BottomNav } from "@/components/AppShell";
import { addRecipeToShoppingList, getRecipeBySlug } from "@/lib/recipes.functions";
import { listMyShoppingLists } from "@/lib/lists.functions";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, Clock, Users, ShoppingBasket, Minus, Plus } from "lucide-react";

const recipeQO = (slug: string) =>
  queryOptions({
    queryKey: ["recipe", slug],
    queryFn: () => getRecipeBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/recipes/$slug")({
  head: ({ loaderData }) => {
    const title = loaderData?.recipe?.title
      ? `${loaderData.recipe.title} - Taylor Intelligence`
      : "Recipe - Taylor Intelligence";
    const desc =
      loaderData?.recipe?.description ??
      "A Taylor-picked recipe with ingredients ready to send to your shopping list.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData?.recipe?.hero_image_url
          ? [
              { property: "og:image", content: loaderData.recipe.hero_image_url },
              { name: "twitter:image", content: loaderData.recipe.hero_image_url },
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
      <BottomNav />
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="p-8 text-sm text-muted">Recipe not found.</div>
      <BottomNav />
    </AppShell>
  ),
});

function RecipeDetail() {
  return (
    <AppShell>
      <Suspense fallback={<p className="px-6 py-10 text-sm text-muted">Loading…</p>}>
        <RecipeBody />
      </Suspense>
      <BottomNav />
    </AppShell>
  );
}

function RecipeBody() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(recipeQO(slug));
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!data) {
    return <div className="p-8 text-sm text-muted">Recipe not found.</div>;
  }
  const { recipe, ingredients } = data;
  const baseServings = Math.max(1, Number(recipe.servings ?? 1));
  const [servings, setServings] = useState<number>(baseServings);
  const [skipPantry, setSkipPantry] = useState(true);
  const [targetListId, setTargetListId] = useState<string>("new");
  const [result, setResult] = useState<{ added: number; skipped: number; list_id: string } | null>(
    null,
  );

  const lists = useQuery({
    queryKey: ["lists", "mine"],
    queryFn: () => listMyShoppingLists(),
    enabled: !!user,
  });

  const send = useMutation({
    mutationFn: () =>
      addRecipeToShoppingList({
        data: {
          recipe_id: recipe.id,
          servings,
          skip_pantry: skipPantry,
          list_id: targetListId === "new" ? undefined : targetListId,
        },
      }),
    onSuccess: (r) => setResult(r),
  });

  const scale = servings / baseServings;
  const instructions: string[] = Array.isArray(recipe.instructions)
    ? (recipe.instructions as unknown as string[])
    : typeof recipe.instructions === "string"
      ? [recipe.instructions]
      : [];

  return (
    <>
      <header className="relative">
        {recipe.hero_image_url && (
          <img
            src={recipe.hero_image_url}
            alt={recipe.title}
            className="h-56 w-full object-cover"
          />
        )}
        <Link
          to="/recipes"
          className="absolute left-4 top-10 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs backdrop-blur"
        >
          <ChevronLeft className="size-3.5" /> Recipes
        </Link>
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
              onClick={() => navigate({ to: "/auth" })}
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
    </>
  );
}
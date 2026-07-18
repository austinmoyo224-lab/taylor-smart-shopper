import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell, BottomNav } from "@/components/AppShell";
import { listMyRecipes, listPublishedRecipes } from "@/lib/recipes.functions";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Sparkles, Users } from "lucide-react";

const recipesQO = queryOptions({
  queryKey: ["recipes", "published"],
  queryFn: () => listPublishedRecipes(),
});

export const Route = createFileRoute("/recipes")({
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
      <BottomNav />
    </AppShell>
  ),
  notFoundComponent: () => null,
});

function RecipesScreen() {
  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Cook</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recipes
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Suspense fallback={<p className="px-2 py-6 text-sm text-muted">Loading…</p>}>
          <MyRecipes />
          <RecipeGrid />
        </Suspense>
      </main>
      <BottomNav />
    </AppShell>
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
            <Link to="/recipes/$slug" params={{ slug: r.slug }} className="block p-4">
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
  if (data.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
        No recipes published yet. Taylor will start pairing recipes with the specials at stores you
        follow.
      </div>
    );
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {data.map((r) => (
        <li key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40">
          <Link to="/recipes/$slug" params={{ slug: r.slug }} className="block">
          {r.hero_image_url && (
            <img
              src={r.hero_image_url}
              alt={r.title}
              className="h-36 w-full object-cover"
              loading="lazy"
            />
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
  );
}

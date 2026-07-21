import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { listMyDeals } from "@/lib/subscriptions.functions";
import { Sparkles, Tag } from "lucide-react";

export const Route = createFileRoute("/deals")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Deals - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Weekly specials, flash sales and coupons - personalised by Taylor to what you actually buy.",
      },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const deals = useQuery({
    queryKey: ["deals", "mine"],
    queryFn: () => listMyDeals(),
    enabled: !!user,
  });

  return (
    <AppShell>
      <header className="border-b border-border px-6 pb-5 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
          Personalised for you
        </p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Deals
        </h1>
        <p className="mt-1 text-xs text-muted">
          Specials from every store you follow — freshest first.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {deals.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (deals.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm leading-relaxed text-muted">
            <Sparkles className="mb-2 size-4 text-primary" />
            No specials yet. Follow a store to start seeing personalised deals right here.
            <div className="mt-3">
              <Link
                to="/stores"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
              >
                Find stores
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {(deals.data ?? []).map((p) => {
              const store = Array.isArray(p.stores) ? p.stores[0] : p.stores;
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {store && (
                    <Link
                      to="/stores/$storeId"
                      params={{ storeId: store.id }}
                      className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs"
                    >
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="size-6 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                          {store.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium">{store.name}</span>
                    </Link>
                  )}
                  {p.hero_image_url && (
                    <img
                      src={p.hero_image_url}
                      alt={p.title}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                      <Tag className="mr-1 inline size-2.5" />
                      {p.type.replace("_", " ")}
                    </span>
                    <h3 className="mt-2 text-base font-semibold">{p.title}</h3>
                    {p.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted">{p.description}</p>
                    )}
                    {p.sale_price != null && (
                      <p className="mt-2 flex items-baseline gap-2 text-sm">
                        <span className="font-semibold text-primary">
                          {p.currency_code} {Number(p.sale_price).toFixed(2)}
                        </span>
                        {p.original_price != null &&
                          Number(p.original_price) > Number(p.sale_price) && (
                            <span className="text-xs text-muted line-through">
                              {p.currency_code} {Number(p.original_price).toFixed(2)}
                            </span>
                          )}
                      </p>
                    )}
                    {p.ends_at && (
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-muted">
                        Ends {new Date(p.ends_at).toLocaleDateString("en-ZA")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
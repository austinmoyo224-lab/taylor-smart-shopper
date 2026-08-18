import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getStorePublicProfile,
  listMySubscriptions,
  subscribeToStore,
  unsubscribeFromStore,
} from "@/lib/subscriptions.functions";
import {
  listMyShoppingLists,
  createShoppingList,
  addListItem,
} from "@/lib/lists.functions";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Tag,
  CheckCircle2,
  Clock,
  X,
  ImageIcon,
  Plus,
  ShoppingBasket,
} from "lucide-react";

export const Route = createFileRoute("/stores/$storeId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Store - Taylor Intelligence" },
      {
        name: "description",
        content: "Store details, opening hours, contact and current specials.",
      },
    ],
  }),
  component: StoreDetail,
});

function StoreDetail() {
  const { storeId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["store", "public", storeId],
    queryFn: () => getStorePublicProfile({ data: { storeId } }),
  });

  const subs = useQuery({
    queryKey: ["subs", "mine"],
    queryFn: () => listMySubscriptions(),
    enabled: !!user,
  });

  const isFollowing = !!subs.data?.some((s) => s.id === storeId);

  const [openPromoId, setOpenPromoId] = useState<string | null>(null);

  const follow = useMutation({
    mutationFn: () => subscribeToStore({ data: { storeId, source: "store_page" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subs", "mine"] }),
  });
  const unfollow = useMutation({
    mutationFn: () => unsubscribeFromStore({ data: { storeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subs", "mine"] }),
  });

  if (q.isLoading) {
    return (
      <AppShell>
        <main className="flex-1 p-6 text-sm text-muted">Loading store…</main>
      </AppShell>
    );
  }
  if (!q.data) {
    return (
      <AppShell>
        <main className="flex-1 p-6">
          <Link to="/stores" className="text-xs text-muted hover:text-foreground">
            ← Back
          </Link>
          <p className="mt-6 text-sm">Store not found or no longer available.</p>
        </main>
      </AppShell>
    );
  }

  const { store, promotions, products } = q.data;
  const openPromo = promotions.find((p) => p.id === openPromoId) ?? null;
  const location = [store.address_line1, store.city, store.region, store.country_code]
    .filter(Boolean)
    .join(", ");

  return (
    <AppShell>
      <header className="relative isolate overflow-hidden border-b border-border">
        {store.hero_image_url ? (
          <img
            src={store.hero_image_url}
            alt={store.name}
            className="h-52 w-full object-cover"
          />
        ) : (
          <div className="h-52 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <button
          onClick={() => navigate({ to: "/stores" })}
          className="absolute left-4 top-4 z-30 flex size-9 items-center justify-center rounded-full bg-background/90 backdrop-blur"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="relative z-30 -mt-10 flex items-end gap-4">
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt={store.name}
              className="size-24 rounded-2xl border-4 border-background bg-background object-cover shadow-2xl"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-2xl border-4 border-background bg-primary/10 text-3xl font-bold text-primary shadow-2xl">
              {store.name.charAt(0)}
            </div>
          )}
          <div className="pb-2">
            <h1
              className="text-2xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {store.name}
            </h1>
          </div>
        </div>

        {isFollowing ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Following
            </span>
            <button
              onClick={() => unfollow.mutate()}
              className="rounded-full border border-border px-3 py-1 text-[11px] text-muted hover:text-destructive"
            >
              Unfollow
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!user) {
                void navigate({ to: "/auth" });
                return;
              }
              follow.mutate();
            }}
            disabled={follow.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {follow.isPending ? "One moment…" : "Follow this store"}
          </button>
        )}

        {store.description && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted">
            {store.description}
          </p>
        )}

        <section className="mt-6 space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            Store details
          </p>
          {store.contact_phone && (
            <a
              href={`tel:${store.contact_phone}`}
              className="flex items-center gap-2 text-sm hover:text-primary"
            >
              <Phone className="size-3.5 text-muted" /> {store.contact_phone}
            </a>
          )}
          {store.contact_email && (
            <a
              href={`mailto:${store.contact_email}`}
              className="flex items-center gap-2 text-sm hover:text-primary"
            >
              <Mail className="size-3.5 text-muted" /> {store.contact_email}
            </a>
          )}
          {location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary"
            >
              <MapPin className="size-3.5 text-muted" /> {location}
            </a>
          )}
          {store.trading_hours &&
            typeof store.trading_hours === "object" &&
            formatHours(store.trading_hours as Record<string, unknown>).length > 0 && (
            <div className="flex items-start gap-2 text-xs text-muted">
              <Clock className="mt-0.5 size-3.5" />
              <div className="space-y-0.5">
                {formatHours(store.trading_hours as Record<string, unknown>).map((row) => (
                  <div key={row.day} className="flex gap-2">
                    <span className="w-10 font-medium text-foreground/80">{row.day}</span>
                    <span>{row.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!store.contact_phone && !store.contact_email && !location && (
            <p className="text-xs text-muted">No contact info published yet.</p>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-lg italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Current specials
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {promotions.length}
            </span>
          </div>
          {promotions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted">
              No live specials right now. Taylor will notify you the moment {store.name} publishes
              one.
            </p>
          ) : (
            <ul className="space-y-3">
              {promotions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenPromoId(p.id)}
                    className="block w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:border-primary/50 hover:shadow-md"
                  >
                    {p.hero_image_url && (
                      <img
                        src={p.hero_image_url}
                        alt={p.title}
                        className="aspect-[16/9] w-full object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                          <Tag className="mr-1 inline size-2.5" />
                          {p.type.replace("_", " ")}
                        </span>
                        {p.is_sponsored && (
                          <span className="rounded-full bg-white/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
                            Sponsored
                          </span>
                        )}
                        {galleryFromPromo(p).length > 0 && (
                          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted">
                            <ImageIcon className="size-3" />
                            {galleryFromPromo(p).length + (p.hero_image_url ? 1 : 0)}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-base font-semibold">{p.title}</h3>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                          {p.description}
                        </p>
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
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-primary">
                        Tap to view catalogue
                        {p.ends_at &&
                          ` · Ends ${new Date(p.ends_at).toLocaleDateString("en-ZA")}`}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ProductsSection storeName={store.name} products={products} isSignedIn={!!user} />
      </main>

      {openPromo && (
        <PromotionModal
          promotion={openPromo}
          storeName={store.name}
          onClose={() => setOpenPromoId(null)}
        />
      )}
    </AppShell>
  );
}

type PromotionRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  is_sponsored: boolean | null;
  original_price: number | string | null;
  sale_price: number | string | null;
  currency_code: string;
  hero_image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  metadata: unknown;
};

function galleryFromPromo(p: { metadata?: unknown }): string[] {
  const meta = p.metadata as { gallery?: unknown } | null | undefined;
  const g = meta?.gallery;
  if (!Array.isArray(g)) return [];
  return g.filter((s): s is string => typeof s === "string");
}

function PromotionModal({
  promotion,
  storeName,
  onClose,
}: {
  promotion: PromotionRow;
  storeName: string;
  onClose: () => void;
}) {
  const gallery = galleryFromPromo(promotion);
  const all = [
    ...(promotion.hero_image_url ? [promotion.hero_image_url] : []),
    ...gallery,
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-background sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
              {storeName}
            </p>
            <h3 className="truncate text-sm font-semibold">{promotion.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex size-9 shrink-0 items-center justify-center rounded-full border border-border"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 pb-8 pt-4">
          {promotion.sale_price != null && (
            <p className="mb-3 flex items-baseline gap-2">
              <span className="text-xl font-semibold text-primary">
                {promotion.currency_code} {Number(promotion.sale_price).toFixed(2)}
              </span>
              {promotion.original_price != null &&
                Number(promotion.original_price) > Number(promotion.sale_price) && (
                  <span className="text-sm text-muted line-through">
                    {promotion.currency_code} {Number(promotion.original_price).toFixed(2)}
                  </span>
                )}
            </p>
          )}
          {promotion.description && (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {promotion.description}
            </p>
          )}
          {promotion.ends_at && (
            <p className="mb-4 text-[10px] uppercase tracking-widest text-muted">
              Valid until {new Date(promotion.ends_at).toLocaleDateString("en-ZA")}
            </p>
          )}

          {all.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted">
              No catalogue images uploaded for this promotion yet.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Catalogue &amp; brochures ({all.length})
              </p>
              {all.map((src, i) => (
                <a
                  key={`${src}-${i}`}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <img
                    src={src}
                    alt={`${promotion.title} page ${i + 1}`}
                    className="w-full object-contain"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// The original inline promotion list body has been replaced above; the
// legacy renderer below is intentionally removed.
/*
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {p.hero_image_url && (
                    <img
                      src={p.hero_image_url}
                      alt={p.title}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                        <Tag className="mr-1 inline size-2.5" />
                        {p.type.replace("_", " ")}
                      </span>
                      {p.is_sponsored && (
                        <span className="rounded-full bg-white/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
                          Sponsored
                        </span>
                      )}
                    </div>
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
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
*/

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  unit: string | null;
  unit_amount: number | string | null;
  base_price: number | string | null;
  currency_code: string;
  images: unknown;
  description: string | null;
};

function firstImg(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0] as string;
  }
  return null;
}

function ProductsSection({
  storeName,
  products,
  isSignedIn,
}: {
  storeName: string;
  products: ProductRow[];
  isSignedIn: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const lists = useQuery({
    queryKey: ["lists", "mine"],
    queryFn: () => listMyShoppingLists(),
    enabled: isSignedIn,
  });

  const add = useMutation({
    mutationFn: async (p: ProductRow) => {
      let listId = lists.data?.[0]?.id;
      if (!listId) {
        const created = await createShoppingList({
          data: { name: `${storeName} basket` },
        });
        listId = (created as { id: string }).id;
        await qc.invalidateQueries({ queryKey: ["lists", "mine"] });
      }
      await addListItem({
        data: {
          listId,
          name: p.name,
          quantity:
            p.unit_amount != null && Number(p.unit_amount) > 0
              ? Number(p.unit_amount)
              : undefined,
          unit: p.unit ?? undefined,
        },
      });
      return p.name;
    },
    onSuccess: (name) => {
      setFlash(`Added ${name} to your list`);
      setBusyId(null);
      window.setTimeout(() => setFlash(null), 1800);
    },
    onError: (e: Error) => {
      setFlash(e.message);
      setBusyId(null);
      window.setTimeout(() => setFlash(null), 2200);
    },
  });

  const q = query.trim().toLowerCase();
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q),
      )
    : products;
  const visible = filtered.slice(0, 60);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2
          className="text-lg italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Shop the catalogue
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {products.length}
        </span>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted">
          {storeName} hasn't published products yet.
        </p>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="mb-3 w-full rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <ul className="grid grid-cols-2 gap-3">
            {visible.map((p) => {
              const img = firstImg(p.images);
              return (
                <li
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-background/60 text-muted">
                      <ShoppingBasket className="size-6" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-2 text-sm font-medium">{p.name}</h3>
                    {p.unit_amount && p.unit ? (
                      <p className="mt-0.5 text-[11px] text-muted">
                        {Number(p.unit_amount)} {p.unit}
                      </p>
                    ) : p.unit ? (
                      <p className="mt-0.5 text-[11px] text-muted">{p.unit}</p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-sm font-semibold text-primary">
                        {p.base_price != null
                          ? `${p.currency_code} ${Number(p.base_price).toFixed(2)}`
                          : "—"}
                      </span>
                      <button
                        onClick={() => {
                          if (!isSignedIn) {
                            void navigate({ to: "/auth" });
                            return;
                          }
                          setBusyId(p.id);
                          add.mutate(p);
                        }}
                        disabled={busyId === p.id}
                        className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
                        aria-label={`Add ${p.name} to list`}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {filtered.length > visible.length && (
            <p className="mt-3 text-center text-[11px] text-muted">
              Showing {visible.length} of {filtered.length}. Refine your search to see more.
            </p>
          )}
        </>
      )}

      {flash && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit rounded-full bg-foreground px-4 py-2 text-xs text-background shadow-lg">
          {flash}
        </div>
      )}
    </section>
  );
}

const DAY_ORDER: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function formatHours(hours: Record<string, unknown>): { day: string; hours: string }[] {
  return DAY_ORDER.filter((d) => hours[d.key] != null).map((d) => {
    const v = hours[d.key];
    if (typeof v === "string") return { day: d.label, hours: v };
    if (v && typeof v === "object") {
      const row = v as { open?: string; close?: string; closed?: boolean };
      if (row.closed) return { day: d.label, hours: "Closed" };
      if (row.open && row.close) return { day: d.label, hours: `${row.open} – ${row.close}` };
    }
    return { day: d.label, hours: "—" };
  });
}
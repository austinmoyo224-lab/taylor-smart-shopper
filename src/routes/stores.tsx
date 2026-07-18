import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell, BottomNav } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  listFeaturedAds,
  listMySubscriptions,
  unsubscribeFromStore,
} from "@/lib/subscriptions.functions";
import { MapPin, X, ChevronLeft, ChevronRight, Sparkles, QrCode } from "lucide-react";

export const Route = createFileRoute("/stores")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your Stores - Taylor Intelligence" },
      {
        name: "description",
        content:
          "The stores you follow on Taylor plus fresh deals and campaigns from brands and retailers on Taylor Intelligence.",
      },
    ],
  }),
  component: StoresScreen,
});

function StoresScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const subs = useQuery({
    queryKey: ["subs", "mine"],
    queryFn: () => listMySubscriptions(),
    enabled: !!user,
  });

  const ads = useQuery({
    queryKey: ["ads", "featured"],
    queryFn: () => listFeaturedAds(),
    staleTime: 60_000,
  });

  const unsub = useMutation({
    mutationFn: (storeId: string) => unsubscribeFromStore({ data: { storeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subs", "mine"] }),
  });

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          Your Taylor
        </p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your stores
        </h1>
        <p className="mt-1 text-xs text-muted">
          Deals, drops and shops from the brands you follow.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <AdsCarousel ads={ads.data ?? []} />

        <div className="mt-8 flex items-baseline justify-between">
          <h2
            className="text-lg italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Following
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {(subs.data ?? []).length} store{(subs.data ?? []).length === 1 ? "" : "s"}
          </span>
        </div>

        {!user || subs.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (subs.data ?? []).length === 0 ? (
          <div className="mt-3 rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <QrCode className="size-5" />
              </div>
              <p>
                You're not following any stores yet. Scan a store's QR code in their shop, or open
                the join link they've shared with you.
              </p>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-primary">
              How it works
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
              <li>Find a Taylor QR code in-store or online.</li>
              <li>Scan or tap to open a join link.</li>
              <li>Confirm and Taylor takes it from there.</li>
            </ol>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {(subs.data ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="size-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                    {s.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="size-3" />
                    {s.city ?? "—"}
                    {s.country_code ? `, ${s.country_code}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => unsub.mutate(s.id)}
                  aria-label={`Unfollow ${s.name}`}
                  className="flex size-8 items-center justify-center rounded-full border border-border text-muted hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 rounded-2xl border border-dashed border-border p-4 text-xs text-muted">
          Have a store's join code? <JoinCodeInline />
        </div>
      </main>

      <BottomNav />
    </AppShell>
  );
}

type Ad = Awaited<ReturnType<typeof listFeaturedAds>>[number];

function AdsCarousel({ ads }: { ads: Ad[] }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const count = ads.length;

  // Auto-advance every 5s, pause on hover/touch.
  const pausedRef = useRef(false);
  useEffect(() => {
    if (count <= 1) return;
    const t = window.setInterval(() => {
      if (!pausedRef.current) setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => window.clearInterval(t);
  }, [count]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, [index]);

  if (count === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-background p-6">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary">
          <Sparkles className="size-3.5" /> Featured on Taylor
        </div>
        <h3
          className="mt-2 text-2xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Fresh deals land here
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
          As soon as stores you follow publish a promotion, it'll slide right into this space.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
      onTouchEnd={() => (pausedRef.current = false)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
      >
        {ads.map((ad) => (
          <AdCard key={ad.id} ad={ad} />
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            aria-label="Previous ad"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/80 p-1.5 shadow backdrop-blur sm:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next ad"
            onClick={() => setIndex((i) => (i + 1) % count)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/80 p-1.5 shadow backdrop-blur sm:flex"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {ads.map((a, i) => (
              <button
                key={a.id}
                aria-label={`Go to ad ${i + 1}`}
                onClick={() => setIndex(i)}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (i === index ? "w-6 bg-primary" : "w-1.5 bg-border")
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdCard({ ad }: { ad: Ad }) {
  const store = Array.isArray(ad.stores) ? ad.stores[0] : ad.stores;
  const img = ad.hero_image_url ?? store?.hero_image_url ?? null;
  const joinTo = store?.qr_slug ?? store?.slug ?? null;
  const price =
    ad.sale_price != null
      ? `${ad.currency_code} ${Number(ad.sale_price).toFixed(2)}`
      : null;
  const original =
    ad.original_price != null && ad.sale_price != null && ad.original_price > ad.sale_price
      ? `${ad.currency_code} ${Number(ad.original_price).toFixed(2)}`
      : null;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    joinTo ? (
      <Link
        to="/join/$slug"
        params={{ slug: joinTo }}
        className="block h-full w-full"
      >
        {children}
      </Link>
    ) : (
      <div className="block h-full w-full">{children}</div>
    );

  return (
    <div className="w-full flex-none snap-center px-0">
      <Wrapper>
        <div className="relative h-56 overflow-hidden rounded-3xl border border-border bg-card">
          {img ? (
            <img
              src={img}
              alt={ad.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/10 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <div className="flex items-center gap-2">
              {ad.is_sponsored && (
                <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary-foreground">
                  Sponsored
                </span>
              )}
              <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white backdrop-blur">
                {ad.type.replace("_", " ")}
              </span>
            </div>
            <div className="text-white">
              {store?.name && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/80">
                  {store.name}
                </p>
              )}
              <h3
                className="mt-0.5 line-clamp-2 text-xl italic leading-tight tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {ad.title}
              </h3>
              {price && (
                <p className="mt-1 flex items-baseline gap-2 text-sm font-semibold">
                  <span>{price}</span>
                  {original && (
                    <span className="text-xs font-normal text-white/70 line-through">
                      {original}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </Wrapper>
    </div>
  );
}

function JoinCodeInline() {
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const slug = String(fd.get("slug") ?? "").trim();
        if (slug) void navigate({ to: "/join/$slug", params: { slug } });
      }}
      className="mt-2 flex gap-2"
    >
      <input
        name="slug"
        placeholder="e.g. yourstore"
        className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-xs"
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-3 py-2 text-xs text-primary-foreground"
      >
        Open
      </button>
    </form>
  );
}

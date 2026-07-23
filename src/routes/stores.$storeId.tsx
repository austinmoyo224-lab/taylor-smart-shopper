import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getStorePublicProfile,
  listMySubscriptions,
  subscribeToStore,
  unsubscribeFromStore,
} from "@/lib/subscriptions.functions";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Tag,
  CheckCircle2,
  Clock,
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

  const { store, promotions } = q.data;
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
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="h-32 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <button
          onClick={() => navigate({ to: "/stores" })}
          className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-full bg-background/90 backdrop-blur"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="-mt-8 flex items-end gap-3">
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt={store.name}
              className="size-16 rounded-2xl border-4 border-background object-cover shadow"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-2xl border-4 border-background bg-primary/10 text-xl font-bold text-primary shadow">
              {store.name.charAt(0)}
            </div>
          )}
        </div>
        <h1
          className="mt-3 text-2xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {store.name}
        </h1>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3" />
            {location}
          </p>
        )}

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
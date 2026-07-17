import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell, BottomNav } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { listMySubscriptions, unsubscribeFromStore } from "@/lib/subscriptions.functions";
import { MapPin, X } from "lucide-react";

export const Route = createFileRoute("/stores")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Stores - Taylor Intelligence" },
      {
        name: "description",
        content:
          "The stores you follow on Taylor. Add more by scanning a QR code or opening a join link.",
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

  const unsub = useMutation({
    mutationFn: (storeId: string) => unsubscribeFromStore({ data: { storeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subs", "mine"] }),
  });

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Follow</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your stores
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {!user || subs.isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (subs.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted">
            <p>
              You're not following any stores yet. Scan a store's QR code in their shop, or open the
              join link they've shared with you.
            </p>
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
          <ul className="space-y-3">
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

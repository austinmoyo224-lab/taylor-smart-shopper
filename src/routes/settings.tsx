import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, BottomNav } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings - Taylor Intelligence" },
      {
        name: "description",
        content: "Language, currency, notification preferences and account controls.",
      },
    ],
  }),
  component: SettingsScreen,
});

type Prefs = {
  in_app: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
};

function SettingsScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [locale, setLocale] = useState("en-ZA");
  const [currency, setCurrency] = useState("ZAR");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: np }] = await Promise.all([
        supabase.from("profiles").select("locale, currency_code").eq("id", user.id).maybeSingle(),
        supabase
          .from("notification_prefs")
          .select("in_app, push, email, sms")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (p) {
        setLocale(p.locale);
        setCurrency(p.currency_code);
      }
      if (np) setPrefs(np as Prefs);
      else setPrefs({ in_app: true, push: true, email: true, sms: false });
    })();
  }, [user]);

  async function save() {
    if (!user || !prefs) return;
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("profiles").update({ locale, currency_code: currency }).eq("id", user.id),
        supabase.from("notification_prefs").upsert({
          user_id: user.id,
          ...prefs,
        }),
      ]);
    } finally {
      setSaving(false);
    }
  }

  if (!user || !prefs) {
    return (
      <AppShell>
        <div className="flex-1" />
        <BottomNav />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Setup</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
      </header>

      <main className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">Region</h2>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Language</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            >
              <option value="en-ZA">English (South Africa)</option>
              <option value="af-ZA">Afrikaans</option>
              <option value="zu-ZA">isiZulu</option>
              <option value="xh-ZA">isiXhosa</option>
              <option value="en-GB">English (UK)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            >
              <option value="ZAR">South African Rand (R)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">British Pound (£)</option>
            </select>
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Notifications
          </h2>
          {(
            [
              ["in_app", "In-app"],
              ["push", "Push notifications"],
              ["email", "Email"],
              ["sms", "SMS"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                className="size-4 accent-primary"
              />
            </label>
          ))}
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/auth" });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-xs text-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </main>

      <BottomNav />
    </AppShell>
  );
}

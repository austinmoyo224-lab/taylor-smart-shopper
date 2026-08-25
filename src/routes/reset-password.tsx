import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password · Taylor Intelligence" },
      {
        name: "description",
        content: "Choose a new password for your Taylor account and get back to your lists, deals and stores.",
      },
      { property: "og:title", content: "Reset password · Taylor Intelligence" },
      {
        property: "og:description",
        content: "Choose a new password for your Taylor account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell hideNav>
      <header className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background px-6 pb-6 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Account</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Set a new password
        </h1>
        <p className="mt-2 text-xs text-muted">
          Choose something you'll remember — at least 8 characters.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {done ? (
          <div className="space-y-4">
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
              Your password has been updated.
            </p>
            <a
              href="/chat"
              className="block w-full rounded-full bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
            >
              Continue to Taylor
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            {!ready && (
              <p className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted">
                Open this page from the reset link in your email. If you already did, give it a
                moment.
              </p>
            )}
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
                New password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
                Confirm password
              </span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !ready}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
            >
              {busy ? "One moment…" : "Update password"}
            </button>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </form>
        )}
      </main>
    </AppShell>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppShell, BottomNav } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";

type Mode = "signin" | "signup";
type Channel = "email" | "mobile";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in - Taylor Intelligence" },
      {
        name: "description",
        content: "Sign in to Taylor Intelligence with email, mobile or Google.",
      },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [channel, setChannel] = useState<Channel>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      let dest = "/stores";
      try {
        const pending = localStorage.getItem("taylor.join.pending");
        if (pending && pending.startsWith("/join/")) {
          dest = pending;
          localStorage.removeItem("taylor.join.pending");
        }
      } catch {
        // ignore
      }
      window.location.href = dest;
    }
  }, [user, authLoading, navigate]);

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/stores`,
            data: { first_name: firstName, display_name: firstName },
          },
        });
        if (error) throw error;
        setInfo("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setOtpSent(true);
      setInfo("We sent a 6-digit code to your phone.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setError(result.error.message ?? "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Welcome</p>
        <h1
          className="text-balance text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {mode === "signin" ? "Welcome back" : "Join Taylor"}
        </h1>
        <p className="mt-2 text-xs text-muted">
          {mode === "signin"
            ? "Sign in to keep your conversations, lists and stores in sync."
            : "Create an account to save your Taylor conversations."}
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <button
          onClick={onGoogle}
          disabled={busy}
          type="button"
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-accent disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1 text-xs">
          {(["email", "mobile"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setChannel(c);
                setError(null);
                setInfo(null);
                setOtpSent(false);
              }}
              className={
                "rounded-full px-4 py-1.5 font-medium capitalize transition " +
                (channel === c ? "bg-primary text-primary-foreground shadow-sm" : "text-muted")
              }
            >
              {c}
            </button>
          ))}
        </div>

        {channel === "email" && (
          <form onSubmit={onEmailSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field
                label="First name"
                type="text"
                value={firstName}
                onChange={setFirstName}
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
            <PrimaryButton busy={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </PrimaryButton>
          </form>
        )}

        {channel === "mobile" && (
          <form
            onSubmit={otpSent ? verifyOtp : (e) => (e.preventDefault(), sendOtp())}
            className="space-y-3"
          >
            <Field
              label="Mobile number"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="+27 82 555 1234"
              required
              autoComplete="tel"
              disabled={otpSent}
            />
            {otpSent && (
              <Field
                label="6-digit code"
                type="text"
                value={otp}
                onChange={setOtp}
                required
                inputMode="numeric"
                maxLength={6}
              />
            )}
            <PrimaryButton busy={busy}>{otpSent ? "Verify code" : "Send code"}</PrimaryButton>
            {otpSent && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                className="w-full text-center text-xs text-muted hover:text-foreground"
              >
                Use a different number
              </button>
            )}
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {info && (
          <p className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            {info}
          </p>
        )}

        <div className="mt-6 text-center text-xs text-muted">
          {mode === "signin" ? "New to Taylor?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-muted">
          By continuing you agree to Taylor's terms and privacy notice. Taylor only uses what you
          choose to share.
        </p>
      </main>

      <BottomNav />
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function PrimaryButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60"
    >
      {busy ? "One moment…" : children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

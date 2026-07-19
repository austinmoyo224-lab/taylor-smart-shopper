import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppShell, BottomNav } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";

type Mode = "signin" | "signup";
type Channel = "email" | "mobile";
type AccountType = "user" | "store_owner";

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
  const [accountType, setAccountType] = useState<AccountType>("user");
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
      (async () => {
        let dest = "/stores";
        try {
          const pending = localStorage.getItem("taylor.join.pending");
          if (pending && pending.startsWith("/join/")) {
            dest = pending;
            localStorage.removeItem("taylor.join.pending");
          } else {
            const { data } = await supabase
              .from("profiles")
              .select("onboarding_completed, account_type")
              .eq("id", user.id)
              .maybeSingle();
            if (data?.account_type === "store_owner") {
              // If already approved (has a retailer role), send to portal
              const { data: roles } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .in("role", ["retailer_admin", "store_manager", "staff"])
                .limit(1);
              dest = roles && roles.length > 0 ? "/portal" : "/store-onboarding";
            } else if (!data?.onboarding_completed) {
              dest = "/profile?welcome=1";
            }
          }
        } catch {
          // ignore
        }
        window.location.href = dest;
      })();
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
            data: {
              first_name: firstName,
              display_name: firstName,
              account_type: accountType,
            },
          },
        });
        if (error) throw error;
        // Persist account_type on profile after signup completes
        try {
          const { data: session } = await supabase.auth.getSession();
          const uid = session.session?.user.id;
          if (uid) {
            await supabase
              .from("profiles")
              .update({ account_type: accountType })
              .eq("id", uid);
          }
        } catch {
          // ignore
        }
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
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google.");
    } finally {
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
              <div>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
                  I'm signing up as
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { v: "user", title: "Shopper", desc: "Deals, lists, chat" },
                      { v: "store_owner", title: "Store owner", desc: "List my store" },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setAccountType(o.v)}
                      className={
                        "rounded-xl border px-3 py-2.5 text-left text-xs transition " +
                        (accountType === o.v
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted hover:text-foreground")
                      }
                    >
                      <div className="text-sm font-medium text-foreground">{o.title}</div>
                      <div className="text-[11px] text-muted">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted/10 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.6-4.8 9.6-7.3 0-.5 0-.9-.1-1.3H12z"
            />
          </svg>
          Continue with Google
        </button>

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


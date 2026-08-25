import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";

type Mode = "signin" | "signup" | "forgot";
type AccountType = "user" | "store_owner" | "delivery_boy";
type SignupStep = "choose" | "form";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Taylor Intelligence" },
      {
        name: "description",
        content: "Sign in or join Taylor — the AI retail companion for South African shoppers and store owners.",
      },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [signupStep, setSignupStep] = useState<SignupStep>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
            } else if (data?.account_type === "delivery_boy") {
              dest = "/rider";
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
        const type: AccountType = accountType ?? "user";
        const redirectPath =
          type === "store_owner"
            ? "/store-onboarding"
            : type === "delivery_boy"
              ? "/rider"
              : "/profile?welcome=1";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirectPath}`,
            data: {
              first_name: type === "user" ? fullName.split(" ")[0] : undefined,
              display_name: type === "user" ? fullName : undefined,
              full_name: type === "user" ? fullName : undefined,
              account_type: type,
            },
          },
        });
        if (error) throw error;
        try {
          const { data: session } = await supabase.auth.getSession();
          const uid = session.session?.user.id;
          if (uid) {
            const patch: {
              account_type: AccountType;
              display_name?: string;
              first_name?: string;
            } = { account_type: type };
            if ((type === "user" || type === "delivery_boy") && fullName) {
              patch.display_name = fullName;
              patch.first_name = fullName.split(" ")[0];
            }
            await supabase.from("profiles").update(patch).eq("id", uid);
          }
        } catch {
          // ignore
        }
        setInfo(
          type === "store_owner"
            ? "Check your inbox to confirm your email. Then we'll take you to your store application."
            : type === "delivery_boy"
              ? "Check your inbox to confirm your email. Then we'll set up your rider profile."
              : "Check your inbox to confirm your email. Then we'll help you set up your Taylor profile.",
        );
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("If that email is registered, we've sent a reset link. Check your inbox.");
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

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setSignupStep("choose");
    setAccountType(null);
    setFullName("");
  }

  function pickAccountType(t: AccountType) {
    setAccountType(t);
    setSignupStep("form");
    setError(null);
    setInfo(null);
  }

  const showChoose = mode === "signup" && signupStep === "choose";
  const isStoreOwner = accountType === "store_owner";
  const isRider = accountType === "delivery_boy";

  return (
    <AppShell hideNav>
      <header className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-background px-6 pb-6 pt-10">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            {mode === "forgot"
              ? "Account recovery"
              : mode === "signin"
              ? "Welcome back"
              : showChoose
                ? "Join Taylor"
                : isStoreOwner
                  ? "List your store"
                  : isRider
                    ? "Deliver with Taylor"
                    : "Create your account"}
          </p>
          <h1
            className="text-balance text-3xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mode === "forgot"
              ? "Forgot your password?"
              : mode === "signin"
              ? "Sign in to Taylor"
              : showChoose
                ? "How will you use Taylor?"
                : isStoreOwner
                  ? "Store owner sign-up"
                  : isRider
                    ? "Delivery rider sign-up"
                    : "Shopper sign-up"}
          </h1>
          <p className="mt-2 text-xs text-muted">
            {mode === "forgot"
              ? "Enter your email and we'll send you a link to set a new password."
              : mode === "signin"
              ? "Your conversations, lists and stores — synced across every device."
              : showChoose
                ? "Pick the path that fits you. You can always switch or add roles later from Settings."
                : isStoreOwner
                  ? "Just an email to start. Your business details come next."
                  : isRider
                    ? "Just an email to start. Your rider profile and stores come next."
                    : "Taylor will remember what matters to you — you're always in control."}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {mode === "signup" && !showChoose && (
          <button
            type="button"
            onClick={() => setSignupStep("choose")}
            className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            ← Choose a different path
          </button>
        )}

        {showChoose ? (
          <div className="space-y-3">
            <ChoiceCard
              badge="Shopper"
              title="Join as a Shopper"
              desc="Chat with Taylor, get deals, build smart lists, and follow your favourite stores."
              bullets={["Personalised deals near you", "Taylor remembers your preferences", "Free forever"]}
              onClick={() => pickAccountType("user")}
            />
            <ChoiceCard
              badge="Store owner"
              title="Join as a Store owner"
              desc="List your store on Taylor, reach followers, run promotions and campaigns."
              bullets={["Branded store profile & QR", "Promotions, coupons & rewards", "Analytics on your customers"]}
              onClick={() => pickAccountType("store_owner")}
              accent
            />
            <ChoiceCard
              badge="Delivery rider"
              title="Join as a Delivery rider"
              desc="Deliver paid orders for the stores you follow. Set your area, get orders nearby."
              bullets={["Follow the stores you deliver for", "Toggle availability on and off", "Track deliveries and earnings"]}
              onClick={() => pickAccountType("delivery_boy")}
            />

            <div className="mt-6 text-center text-xs text-muted">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onEmailSubmit} className="space-y-3">
            {mode === "signup" && !isStoreOwner && (
              <Field
                label="Full name"
                type="text"
                value={fullName}
                onChange={setFullName}
                required
                autoComplete="name"
                placeholder={isRider ? "Sipho Dlamini" : "Thandi Nkosi"}
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
            {mode !== "forgot" && (
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : ""}
              />
            )}
            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <PrimaryButton busy={busy}>
              {mode === "forgot"
                ? "Send reset link"
                : mode === "signin"
                ? "Sign in"
                : isStoreOwner
                  ? "Continue to store application"
                  : isRider
                    ? "Continue to rider profile"
                    : "Create my account"}
            </PrimaryButton>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                {info}
              </p>
            )}

            {mode !== "forgot" && (
              <>
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
              </>
            )}

            <div className="pt-4 text-center text-xs text-muted">
              {mode === "signin" ? (
                <>
                  New to Taylor?{" "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => switchMode("signup")}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => switchMode("signin")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        )}

      <p className="mt-8 text-center text-[10px] leading-relaxed text-muted">
          By continuing you agree to Taylor's terms and privacy notice. Taylor only uses what you
          choose to share.
        </p>
      </main>
    </AppShell>
  );
}

function ChoiceCard({
  badge,
  title,
  desc,
  bullets,
  onClick,
  accent,
}: {
  badge: string;
  title: string;
  desc: string;
  bullets: string[];
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group relative block w-full overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition hover:shadow-md " +
        (accent
          ? "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary/50"
          : "border-border bg-card hover:border-primary/40")
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest " +
            (accent ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted")
          }
        >
          {badge}
        </span>
        <span className="text-muted transition group-hover:translate-x-0.5 group-hover:text-primary">→</span>
      </div>
      <h3 className="mt-3 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{desc}</p>
      <ul className="mt-3 space-y-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[11px] text-foreground/80">
            <span className={"mt-1 h-1 w-1 rounded-full " + (accent ? "bg-primary" : "bg-foreground/40")} />
            {b}
          </li>
        ))}
      </ul>
    </button>
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


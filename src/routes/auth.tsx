import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ShoppingBasket, Store, Bike } from "lucide-react";
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
      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-navy">
        {/* brand glows */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 65%)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-24 h-80 w-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 60%)" }}
          aria-hidden
        />

        <header className="relative px-6 pb-8 pt-12 text-center">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.45em] text-primary">
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
            className="text-balance text-3xl leading-[1.08] tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mode === "forgot" ? (
              <>Forgot your <span className="italic text-primary">password?</span></>
            ) : mode === "signin" ? (
              <>Sign in to <span className="italic text-primary">Taylor</span></>
            ) : showChoose ? (
              <>How will you <span className="italic text-primary">use Taylor?</span></>
            ) : isStoreOwner ? (
              <>Store owner <span className="italic text-primary">sign-up</span></>
            ) : isRider ? (
              <>Delivery rider <span className="italic text-primary">sign-up</span></>
            ) : (
              <>Shopper <span className="italic text-primary">sign-up</span></>
            )}
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-pretty text-sm leading-relaxed text-white/60">
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
        </header>

        <main className="relative flex-1 px-5 pb-10">
          {mode === "signup" && !showChoose && (
            <button
              type="button"
              onClick={() => setSignupStep("choose")}
              className="mb-4 inline-flex items-center gap-1 text-xs text-white/50 transition hover:text-white"
            >
              ← Choose a different path
            </button>
          )}

          {showChoose ? (
            <div className="space-y-3">
              <ChoiceCard
                icon={ShoppingBasket}
                badge="Shopper"
                title="Join as a Shopper"
                desc="Chat with Taylor, get deals, build smart lists, and follow your favourite stores."
                bullets={["Personalised deals near you", "Taylor remembers your preferences", "Free forever"]}
                onClick={() => pickAccountType("user")}
              />
              <ChoiceCard
                icon={Store}
                badge="Store owner"
                title="Join as a Store owner"
                desc="List your store on Taylor, reach followers, run promotions and campaigns."
                bullets={["Branded store profile & QR", "Promotions, coupons & rewards", "Analytics on your customers"]}
                onClick={() => pickAccountType("store_owner")}
                accent
              />
              <ChoiceCard
                icon={Bike}
                badge="Delivery rider"
                title="Join as a Delivery rider"
                desc="Deliver paid orders for the stores you follow. Set your area, get orders nearby."
                bullets={["Follow the stores you deliver for", "Toggle availability on and off", "Track deliveries and earnings"]}
                onClick={() => pickAccountType("delivery_boy")}
              />

              <div className="pt-4 text-center text-xs text-white/50">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
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
                      className="text-xs font-semibold text-primary hover:underline"
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
                  <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                    {info}
                  </p>
                )}

                {mode !== "forgot" && (
                  <>
                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">or</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <button
                      type="button"
                      onClick={onGoogle}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 disabled:opacity-60"
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

                <div className="pt-4 text-center text-xs text-white/50">
                  {mode === "signin" ? (
                    <>
                      New to Taylor?{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary hover:underline"
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
                        className="font-semibold text-primary hover:underline"
                        onClick={() => switchMode("signin")}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}

          <p className="mt-8 text-center text-[10px] leading-relaxed text-white/35">
            By continuing you agree to Taylor's terms and privacy notice. Taylor only uses what you
            choose to share.
          </p>
        </main>
      </div>
    </AppShell>
  );
}

function ChoiceCard({
  icon: Icon,
  badge,
  title,
  desc,
  bullets,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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
        "group relative block w-full overflow-hidden rounded-3xl border p-5 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-xl " +
        (accent
          ? "border-primary/40 bg-primary/10 hover:border-primary/60"
          : "border-white/10 bg-white/[0.04] hover:border-primary/40")
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest " +
            (accent ? "bg-primary text-navy" : "bg-white/10 text-white/60")
          }
        >
          <Icon className="h-3 w-3" strokeWidth={2.25} />
          {badge}
        </span>
        <ArrowRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/55">{desc}</p>
      <ul className="mt-3 space-y-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[11px] text-white/75">
            <span className={"mt-1.5 h-1 w-1 shrink-0 rounded-full " + (accent ? "bg-primary" : "bg-white/40")} />
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
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-white/50">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/15 bg-white/95 px-3.5 py-2.5 text-sm text-navy outline-none transition placeholder:text-navy/40 focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

function PrimaryButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-navy shadow-xl transition hover:scale-[1.01] disabled:opacity-60"
    >
      {busy ? "One moment…" : children}
      {!busy && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

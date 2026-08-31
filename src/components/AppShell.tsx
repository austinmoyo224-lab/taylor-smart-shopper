import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { InstallPrompt } from "./InstallPrompt";
import { BottomNav } from "./BottomNav";

/** Routes that are top-level destinations — no back arrow needed. */
const ROOT_ROUTES = new Set([
  "/",
  "/stores",
  "/stores/following",
  "/lists",
  "/chat",
  "/inbox",
  "/travel",
  "/recipes",
  "/auth",
  "/onboarding",
  "/store-onboarding",
  "/reset-password",
  "/account-deleted",
]);

function BackBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  if (ROOT_ROUTES.has(pathname)) return null;
  return (
    <div
      className="sticky top-0 z-40 flex items-center border-b border-border bg-background/90 px-2 py-1.5 backdrop-blur-md"
      style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else void navigate({ to: "/stores" });
        }}
        aria-label="Go back"
        className="flex items-center gap-0.5 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-5" />
        Back
      </button>
    </div>
  );
}

interface ScreenOrientationWithLock {
  lock?: (orientation: string) => Promise<void>;
}

/**
 * Mobile-first PWA frame: warm background, max-w-md, sticky bottom nav.
 * All consumer screens should render inside this. Pass `hideNav` on
 * sign-up / application flows where the bottom navigation should be hidden.
 */
export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  // Lock the app to portrait on mobile native shells to match the PWA orientation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(orientation: landscape)");
    const lockPortrait = () => {
      const orientation = window.screen?.orientation as ScreenOrientationWithLock | undefined;
      if (mql.matches && orientation?.lock) {
        void orientation.lock("portrait").catch(() => {
          /* ignore unsupported */
        });
      }
    };
    lockPortrait();
    mql.addEventListener("change", lockPortrait);
    return () => mql.removeEventListener("change", lockPortrait);
  }, []);

  return (
    <div className="flex min-h-screen w-full justify-center bg-background">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-background shadow-2xl">
        {!hideNav && <BackBar />}
        {children}
        {!hideNav && <BottomNav />}
        <InstallPrompt />
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { useEffect } from "react";
import { InstallPrompt } from "./InstallPrompt";
import { BottomNav } from "./BottomNav";

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
        {children}
        {!hideNav && <BottomNav />}
        <InstallPrompt />
      </div>
    </div>
  );
}

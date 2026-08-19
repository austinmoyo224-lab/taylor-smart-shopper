import type { ReactNode } from "react";
import { useEffect } from "react";
import { InstallPrompt } from "./InstallPrompt";
import { BottomNav } from "./BottomNav";

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
      if (mql.matches && (window.screen?.orientation as ScreenOrientation | undefined)?.lock) {
        void (window.screen.orientation as ScreenOrientation).lock("portrait").catch(() => {
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

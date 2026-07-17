import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";

/**
 * Mobile-first PWA frame: warm background, max-w-md, sticky bottom nav.
 * All consumer screens should render inside this.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full justify-center bg-background">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-background shadow-2xl">
        {children}
        <InstallPrompt />
      </div>
    </div>
  );
}

export { BottomNav };
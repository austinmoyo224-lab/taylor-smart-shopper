import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { isNativeApp } from "@/lib/appbuild";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "taylor.install.dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Do not show inside the AppBuild native shell — it has its own store listing / icon.
    if (isNativeApp()) return;
    // Already installed → nothing to do.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !evt) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      setVisible(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg">
      <Download className="size-4 shrink-0 text-primary" />
      <div className="flex-1 text-xs">
        <p className="font-medium">Install Taylor</p>
        <p className="text-muted">Add to your home screen for a faster feel.</p>
      </div>
      <button
        onClick={install}
        className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground"
      >
        Install
      </button>
      <button
        aria-label="Dismiss install prompt"
        onClick={dismiss}
        className="rounded-full p-1 text-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

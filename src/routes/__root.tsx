import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SplashOverlay } from "@/components/SplashOverlay";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Hey Taylor - Your shopping companion" },
      {
        name: "description",
        content:
          "Hey Taylor is the shopping companion that turns weekly specials, coupons and recipes from the stores you love into a personal shopping plan.",
      },
      { name: "author", content: "Taylor Intelligence" },
      { name: "theme-color", content: "#0F1B3D" },
      { property: "og:title", content: "Hey Taylor - Your shopping companion" },
      {
        property: "og:description",
        content:
          "Hey Taylor is the shopping companion that turns weekly specials, coupons and recipes from the stores you love into a personal shopping plan.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Hey Taylor" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hey Taylor - Your shopping companion" },
      {
        name: "twitter:description",
        content:
          "Hey Taylor is the shopping companion that turns weekly specials, coupons and recipes from the stores you love into a personal shopping plan.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/57b3f123-43a6-45a7-b2d8-7a6eaeecc2c5/id-preview-4b9a48d2--c0197c54-2298-44b5-85ea-897cf4a313d4.lovable.app-1784263073546.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/57b3f123-43a6-45a7-b2d8-7a6eaeecc2c5/id-preview-4b9a48d2--c0197c54-2298-44b5-85ea-897cf4a313d4.lovable.app-1784263073546.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Initialize Capacitor native chrome on first render.
    void (async () => {
      const [{ isNativeApp }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@/lib/capacitor"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      if (!isNativeApp()) return;
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0F1B3D" });
      } catch {
        /* ignore */
      }
      try {
        await SplashScreen.hide();
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Handle native deep links (iOS Universal Links / Android App Links + custom scheme).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let removeListener: (() => void) | undefined;
    void (async () => {
      const [{ isNativeApp }, { App }] = await Promise.all([
        import("@/lib/capacitor"),
        import("@capacitor/app"),
      ]);
      if (!isNativeApp()) return;
      const listener = await App.addListener("appUrlOpen", ({ url }) => {
        try {
          const parsed = new URL(url);
          // Custom scheme: heytaylor://app/<path>
          // HTTPS universal link: https://heytaylor.co.za/<path>
          const path = parsed.pathname || "/";
          const search = parsed.search || "";
          if (path !== "/") {
            router.navigate({ to: `${path}${search}`, replace: true });
          }
        } catch {
          /* ignore malformed URLs */
        }
      });
      removeListener = listener?.remove;
    })();
    return () => removeListener?.();
  }, [router]);

  // Native network listener: flush offline mutation queue when connectivity returns.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let removeListener: (() => void) | undefined;
    void (async () => {
      const [{ isNativeApp }, { Network }] = await Promise.all([
        import("@/lib/capacitor"),
        import("@capacitor/network"),
      ]);
      if (!isNativeApp()) return;
      const listener = await Network.addListener("networkStatusChange", async (status) => {
        if (!status.connected) return;
        const { flushOfflineQueue } = await import("@/lib/offline-queue");
        await flushOfflineQueue();
      });
      removeListener = listener?.remove;
      // Also flush on startup if already online.
      const { connected } = await Network.getStatus();
      if (connected) {
        const { flushOfflineQueue } = await import("@/lib/offline-queue");
        await flushOfflineQueue();
      }
    })();
    return () => removeListener?.();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <SplashOverlay />
    </QueryClientProvider>
  );
}

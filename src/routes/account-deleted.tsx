import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/account-deleted")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account deleted · Taylor Intelligence" },
      {
        name: "description",
        content:
          "Your Taylor account and all associated personal data have been permanently deleted.",
      },
      { property: "og:title", content: "Account deleted · Taylor Intelligence" },
      {
        property: "og:description",
        content: "Your Taylor account and personal data have been permanently deleted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountDeletedScreen,
});

function AccountDeletedScreen() {
  return (
    <AppShell hideNav>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-7" />
        </span>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your account has been deleted
        </h1>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">
          Your login and personal data have been permanently removed from Taylor. Anything we must
          keep for accounting has been anonymised. You've been signed out on this device.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
          <a
            href="/auth"
            className="rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            Create a new account
          </a>
          <a
            href="https://www.heytaylor.co.za"
            className="rounded-full border border-border px-4 py-3 text-sm text-muted hover:text-foreground"
          >
            Back to heytaylor.co.za
          </a>
        </div>
      </main>
    </AppShell>
  );
}

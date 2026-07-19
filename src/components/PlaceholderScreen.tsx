import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

export function PlaceholderScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">{eyebrow}</p>
        <h1
          className="text-balance text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        {children}
      </main>
    </AppShell>
  );
}

import type { ComponentProps, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { cn } from "@/lib/utils";

export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Link that accepts a plain string path (route data comes from nav.ts).
 *  External / mailto / tel / hash targets fall back to a plain anchor. */
export function SmartLink({
  to,
  ...rest
}: { to: string } & Omit<ComponentProps<"a">, "href">) {
  if (/^(mailto:|tel:|https?:|#)/.test(to)) {
    return <a href={to} {...rest} />;
  }
  return <Link to={to as never} {...rest} />;
}

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  primary = { label: "Get started free", to: "/auth" },
  secondary,
  note,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  primary?: { label: string; to: string };
  secondary?: { label: string; to: string };
  note?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <Reveal>
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.45em] text-primary">
            {eyebrow}
          </p>
          <h1
            className="text-balance text-4xl leading-[1.05] text-white sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/65 sm:text-lg">
            {subtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <SmartLink
              to={primary.to}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-navy shadow-xl transition hover:scale-[1.02]"
            >
              {primary.label}
              <ArrowRight className="h-4 w-4" />
            </SmartLink>
            {secondary && (
              <SmartLink
                to={secondary.to}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                {secondary.label}
              </SmartLink>
            )}
          </div>
          {note && <p className="mt-5 text-xs text-white/45">{note}</p>}
        </Reveal>
      </div>
    </section>
  );
}

export function Section({
  eyebrow,
  title,
  intro,
  children,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title?: ReactNode;
  intro?: string;
  children?: ReactNode;
  tone?: "light" | "mint" | "navy";
  className?: string;
}) {
  const toneClass =
    tone === "navy" ? "bg-navy text-white" : tone === "mint" ? "bg-mint" : "bg-background";
  return (
    <section className={cn("py-16 sm:py-24", toneClass, className)}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {(eyebrow || title || intro) && (
          <Reveal>
            <div className="mb-12 max-w-3xl">
              {eyebrow && (
                <p
                  className={cn(
                    "mb-3 font-mono text-[10px] uppercase tracking-[0.35em]",
                    tone === "navy" ? "text-primary" : "text-muted",
                  )}
                >
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2
                  className="text-balance text-3xl leading-tight sm:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h2>
              )}
              {intro && (
                <p
                  className={cn(
                    "mt-4 text-pretty text-base leading-relaxed",
                    tone === "navy" ? "text-white/65" : "text-muted",
                  )}
                >
                  {intro}
                </p>
              )}
            </div>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

export type Feature = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
};

export function FeatureGrid({ items, tone = "light" }: { items: Feature[]; tone?: "light" | "navy" }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, title, desc }, i) => (
        <Reveal key={title} delay={i * 0.05}>
          <div
            className={cn(
              "h-full rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-xl",
              tone === "navy"
                ? "border-white/10 bg-white/5 text-white"
                : "border-border bg-card shadow-sm",
            )}
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className={cn("mt-2 text-sm leading-relaxed", tone === "navy" ? "text-white/60" : "text-muted")}>
              {desc}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function FeatureRow({
  index,
  title,
  desc,
  bullets,
  flip,
}: {
  index: string;
  title: string;
  desc: string;
  bullets: string[];
  flip?: boolean;
}) {
  return (
    <Reveal>
      <div
        className={cn(
          "grid items-center gap-8 rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10 lg:grid-cols-2 lg:gap-14",
          flip && "lg:[&>*:first-child]:order-2",
        )}
      >
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-muted">{index}</p>
          <h3 className="text-2xl leading-tight sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-muted">{desc}</p>
        </div>
        <ul className="space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-2xl bg-mint p-4">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
              <span className="text-sm leading-relaxed text-foreground">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

export function Steps({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <Reveal key={s.title} delay={i * 0.06}>
          <div className="relative h-full rounded-3xl border border-border bg-card p-7">
            <span
              className="mb-4 block text-4xl text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="text-base font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
      {items.map(({ q, a }) => (
        <details key={q} className="group p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
            {q}
            <span className="text-primary transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({
  title,
  desc,
  primary = { label: "Get started free", to: "/auth" },
  secondary,
}: {
  title: ReactNode;
  desc: string;
  primary?: { label: string; to: string };
  secondary?: { label: string; to: string };
}) {
  return (
    <section className="relative overflow-hidden bg-navy py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)) 0%, transparent 60%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-5 text-center text-white sm:px-8">
        <h2
          className="text-balance text-3xl leading-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-white/65">{desc}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <SmartLink
            to={primary.to}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-navy shadow-xl transition hover:scale-[1.02]"
          >
            {primary.label}
            <ArrowRight className="h-4 w-4" />
          </SmartLink>
          {secondary && (
            <SmartLink
              to={secondary.to}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              {secondary.label}
            </SmartLink>
          )}
        </div>
      </div>
    </section>
  );
}

export function ValueStrip({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <section className="border-b border-border bg-background py-12 sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title}>
            <p className="text-base font-semibold text-foreground">{i.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{i.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
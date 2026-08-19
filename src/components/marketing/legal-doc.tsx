import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";


export type LegalSection = {
  h: string;
  p?: string[];
  list?: string[];
  sub?: { h: string; p?: string[]; list?: string[] }[];
};

export const COMPANY = {
  name: "Taylor Intelligence (Pty) Ltd",
  reg: "2026/553125/07",
  address: "2390 Dahlia Street, Ext 1, Lenasia South, Johannesburg, 1829",
  phone: "+27 78 329 7240",
  altPhone: "+27 11 850 1160",
  email: "sheldongovender6@gmail.com",
  support: "hello@heytaylor.co.za",
  informationOfficer: "Sheldon Govender",
  website: "https://heytaylor.co.za",
  updated: "19 August 2026",
};

function Body({ p, list }: { p?: string[]; list?: string[] }) {
  return (
    <>
      {p?.map((t, i) => (
        <p key={i} className="mt-3">
          {t}
        </p>
      ))}
      {list && (
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {list.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </>
  );
}

export function LegalDoc({
  intro,
  sections,
  footer,
}: {
  intro?: ReactNode;
  sections: LegalSection[];
  footer?: ReactNode;
}) {
  return (
    <article className="max-w-3xl space-y-8 text-base leading-relaxed text-muted">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted/70">
        Last updated: {COMPANY.updated}
      </p>
      {intro}
      {sections.map((s) => (
        <section key={s.h}>
          <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {s.h}
          </h2>
          <Body p={s.p} list={s.list} />
          {s.sub?.map((sub) => (
            <div key={sub.h} className="mt-5">
              <h3 className="text-lg font-semibold text-foreground">{sub.h}</h3>
              <Body p={sub.p} list={sub.list} />
            </div>
          ))}
        </section>
      ))}
      {footer}
      <section>
        <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Company details
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Full name: {COMPANY.name}, a private company registered in South Africa.</li>
          <li>Registration number: {COMPANY.reg}</li>
          <li>Registered address for legal service (also postal): {COMPANY.address}</li>
          <li>
            Telephone: {COMPANY.phone} / {COMPANY.altPhone}
          </li>
          <li>Email: {COMPANY.email}</li>
          <li>Support: {COMPANY.support}</li>
          <li>Information Officer: {COMPANY.informationOfficer}</li>
          <li>Main business: information technology</li>
        </ul>
      </section>
    </article>
  );
}

const legalDocs = [
  { label: "Privacy", to: "/legal/privacy" },
  { label: "Terms", to: "/legal/terms" },
  { label: "POPI", to: "/legal/popi" },
  { label: "PAIA", to: "/legal/paia" },
  { label: "Email disclaimer", to: "/legal/email-disclaimer" },
];

export function LegalLinks() {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {legalDocs.map(({ label, to }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to as never}
            className={cn(
              "inline-flex items-center rounded-full border px-4 py-2 text-xs font-medium transition",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/20 bg-white/5 text-white/80 backdrop-blur hover:bg-white/10 hover:text-white",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
import type { ReactNode } from "react";

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
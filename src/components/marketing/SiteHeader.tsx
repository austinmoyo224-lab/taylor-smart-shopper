import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, X, ArrowRight } from "lucide-react";
import taylorMark from "@/assets/taylor-mark.png";
import { productLinks, solutionLinks, flatLinks, type NavLink } from "./nav";
import { cn } from "@/lib/utils";

function Dropdown({
  label,
  links,
  columns = 2,
}: {
  label: string;
  links: NavLink[];
  columns?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-white/75 transition hover:text-white"
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div
          className={cn(
            "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3",
            columns === 2 ? "w-[38rem]" : "w-[22rem]",
          )}
        >
          <div
            className={cn(
              "grid gap-1 rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-xl",
              columns === 2 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {links.map(({ label: l, to, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to as never}
                onClick={() => setOpen(false)}
                className="group flex items-start gap-3 rounded-2xl p-3 transition hover:bg-white/10"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{l}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-white/60">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileSection({ title, links, onNavigate }: { title: string; links: NavLink[]; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-left text-base font-medium text-white"
      >
        {title}
        <ChevronDown className={cn("h-5 w-5 text-white/60 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="pb-2">
          {links.map(({ label, to, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to as never}
              onClick={onNavigate}
              className="flex items-start gap-3 rounded-2xl px-2 py-3 transition active:bg-white/10"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{label}</span>
                <span className="block text-xs text-white/55">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-white">
          <img src={taylorMark} alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-lg italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Taylor
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Dropdown label="Product" links={productLinks} />
          <Dropdown label="Solutions" links={solutionLinks} columns={1} />
          {flatLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to as never}
              className="rounded-full px-3 py-2 text-sm text-white/75 transition hover:text-white"
              activeProps={{ className: "text-white" }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-full px-4 py-2 text-sm text-white/80 transition hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-navy shadow-lg transition hover:opacity-90"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-navy-deep lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 pt-[env(safe-area-inset-top)]">
            <span className="text-lg italic text-white" style={{ fontFamily: "var(--font-display)" }}>
              Taylor
            </span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-10">
            <MobileSection title="Product" links={productLinks} onNavigate={close} />
            <MobileSection title="Solutions" links={solutionLinks} onNavigate={close} />
            {flatLinks.map(({ label, to }) => (
              <Link
                key={to}
                to={to as never}
                onClick={close}
                className="block border-b border-white/10 py-4 text-base font-medium text-white"
              >
                {label}
              </Link>
            ))}
            <div className="mt-8 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
              <Link
                to="/auth"
                onClick={close}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-navy"
              >
                Get started free
              </Link>
              <Link
                to="/auth"
                onClick={close}
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
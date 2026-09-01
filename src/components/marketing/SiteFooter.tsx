import { Link } from "@tanstack/react-router";
import { Mail, MapPin } from "lucide-react";
import taylorMark from "@/assets/taylor-mark.png";
import { productLinks, solutionLinks } from "./nav";

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep pt-16 text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="mb-4 flex items-center gap-2 text-white">
            <img src={taylorMark} alt="" className="h-9 w-9 rounded-xl" />
            <span className="text-xl italic" style={{ fontFamily: "var(--font-display)" }}>
              Taylor Intelligence
            </span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-white/55">
            The shopping companion for South African households — and the retail operating
            system for the stores that serve them.
          </p>
          <div className="mt-5 space-y-2 text-sm text-white/55">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <a href="mailto:hello@heytaylor.co.za" className="hover:text-white">
                hello@heytaylor.co.za
              </a>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              South Africa
            </p>
          </div>
        </div>

        <div>
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            Product
          </p>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/features" className="hover:text-white">
                All features
              </Link>
            </li>
            {productLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            Solutions
          </p>
          <ul className="space-y-2.5 text-sm">
            {solutionLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/pricing" className="hover:text-white">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/store-onboarding" className="hover:text-white">
                List your store
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            Company
          </p>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/about" className="hover:text-white">
                About
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/legal/privacy" className="hover:text-white">
                Privacy & POPI policy
              </Link>
            </li>
            <li>
              <Link to="/legal/terms" className="hover:text-white">
                Terms of service
              </Link>
            </li>
            <li>
              <Link to="/legal/popi" className="hover:text-white">
                POPI policy & breach protocol
              </Link>
            </li>
            <li>
              <Link to="/legal/paia" className="hover:text-white">
                PAIA manual
              </Link>
            </li>
            <li>
              <Link to="/legal/email-disclaimer" className="hover:text-white">
                Email disclaimer
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <p className="mx-auto max-w-7xl px-5 text-center text-xs text-white/40 sm:px-8">
          © {new Date().getFullYear()} Taylor Intelligence · Made for South Africa
        </p>
      </div>
    </footer>
  );
}
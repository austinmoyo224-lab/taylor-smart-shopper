import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Heart, Sparkles, ShieldCheck, ArrowRight, Store, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import heroAsset from "@/assets/taylor-hero-v2.png.asset.json";
import taylorMark from "@/assets/taylor-mark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taylor Intelligence — Groceries. Recipes. Savings. All in one place." },
      {
        name: "description",
        content:
          "Taylor is South Africa's AI shopping companion — remembers what matters, finds the deals, and turns recipes into smart lists.",
      },
      { property: "og:title", content: "Taylor Intelligence — Smarter shopping. Better living." },
      {
        property: "og:description",
        content:
          "Your AI shopping companion. Personalised deals, recipes and lists — for South African households.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/" }],
  }),
  component: Landing,
});

const NAVY = "#0F1B3D";
const GREEN = "#22c55e";

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/stores" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-[color:var(--color-foreground)]">
      <TopBar />
      <Hero />
      <FeatureStrip />
      <BannerSections />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link to="/" className="flex items-center gap-2 text-white">
        <img src={taylorMark} alt="" className="h-9 w-9 rounded-xl shadow-lg" />
        <span className="text-xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Taylor
        </span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/auth"
          className="hidden rounded-full px-4 py-2 text-sm text-white/80 transition hover:text-white sm:inline-flex"
        >
          Sign in
        </Link>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition hover:opacity-95"
          style={{ backgroundColor: GREEN, color: NAVY }}
        >
          Get started
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: NAVY }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -left-40 top-1/3 h-[640px] w-[640px] rounded-full opacity-30 blur-3xl"
        style={{ backgroundColor: GREEN }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: GREEN }}
        aria-hidden
      />
      {/* Curved green sweep */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M -50 620 Q 400 500 700 640 T 1300 560"
          stroke={GREEN}
          strokeOpacity="0.35"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M -50 700 Q 500 580 900 720 T 1300 640"
          stroke={GREEN}
          strokeOpacity="0.2"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:pb-28 lg:pt-40">
        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col justify-center text-white"
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.35em] text-white/60">
            AI for South African shoppers
          </p>
          <h1
            className="text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="italic" style={{ color: GREEN }}>
              Taylor
            </span>
            <span className="mt-2 block font-mono text-xs uppercase tracking-[0.5em] text-white/80">
              Intelligence
            </span>
          </h1>

          <div className="mt-6 h-[2px] w-16" style={{ backgroundColor: GREEN }} aria-hidden />

          <h2
            className="mt-8 max-w-xl text-3xl leading-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Groceries. Recipes. Savings.{" "}
            <span className="italic" style={{ color: GREEN }}>
              All in one place.
            </span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75">
            Your AI shopping companion. Taylor remembers what matters, finds the deals near you,
            and turns recipes into smart lists — quietly, in the background.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-xl transition hover:scale-[1.02]"
              style={{ backgroundColor: GREEN, color: NAVY }}
            >
              <ShoppingBag className="h-4 w-4" />
              Join as a Shopper
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              <Store className="h-4 w-4" />
              List your Store
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/55">
            Free forever for shoppers · No card required · Your data stays yours
          </p>
        </motion.div>

        {/* Hero image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative mx-auto aspect-[3/4] w-full max-w-lg">
            {/* Green halo behind subject */}
            <div
              className="pointer-events-none absolute inset-6 rounded-[36px] opacity-40 blur-3xl"
              style={{ background: `radial-gradient(circle at 50% 40%, ${GREEN} 0%, transparent 65%)` }}
              aria-hidden
            />
            <div className="relative h-full w-full overflow-hidden rounded-[32px]">
              <img
                src={heroAsset.url}
                alt="Taylor — your AI shopping companion, pushing a full grocery trolley"
                className="h-full w-full object-cover object-top"
                loading="eager"
              />
              {/* Fade edges into the navy background */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, ${NAVY}00 55%, ${NAVY}cc 88%, ${NAVY} 100%), linear-gradient(to right, ${NAVY}55 0%, transparent 18%, transparent 82%, ${NAVY}55 100%)`,
                }}
                aria-hidden
              />
              {/* Subtle green inner glow */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[32px]"
                style={{ boxShadow: `inset 0 0 160px ${GREEN}22` }}
                aria-hidden
              />
            </div>
            {/* Floating stat chip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -left-3 bottom-10 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-xl backdrop-blur-md sm:-left-6"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/60">This week</p>
              <p className="mt-1 text-sm font-semibold">
                <span style={{ color: GREEN }}>R 428</span> saved
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureStrip() {
  const items = [
    { icon: Brain, title: "Remembers", desc: "what matters to your home" },
    { icon: Heart, title: "Understands", desc: "what you actually need" },
    { icon: Sparkles, title: "Personalised", desc: "just for you and your family" },
    { icon: ShieldCheck, title: "Private", desc: "your data stays yours" },
  ];
  return (
    <section className="border-b border-black/5 bg-white py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 sm:px-8 md:grid-cols-4">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-start">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${GREEN}18`, color: GREEN }}
            >
              <Icon className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="text-base font-semibold" style={{ color: NAVY }}>
              {title}
            </p>
            <p className="mt-1 text-sm text-black/55">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BannerSections() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-16 sm:space-y-8 sm:px-8 sm:py-24">
      <Banner
        dark
        eyebrow="Header 01"
        title={<>Smarter shopping. <span style={{ color: GREEN }} className="italic">Better living.</span></>}
        desc="Chat with Taylor about tonight's dinner, tomorrow's budget, or this week's specials — she remembers so you don't have to."
      />
      <Banner
        eyebrow="Header 02"
        title={<>Personal. Thoughtful. <span style={{ color: GREEN }} className="italic">Always here.</span></>}
        desc="Taylor learns the way your household eats, shops and celebrates — and quietly gets better every week."
      />
      <Banner
        dark
        eyebrow="Header 03"
        title={<>Deals you'll love. Recommendations that fit <span style={{ color: GREEN }} className="italic">your life.</span></>}
        desc="Personalised promotions from stores you follow — never spammy, always relevant."
      />
      <Banner
        eyebrow="Header 04"
        title={<>Groceries. Recipes. Savings. <span style={{ color: GREEN }} className="italic">All in one place.</span></>}
        desc="One app for your list, your recipes, your loyalty and your favourite stores."
      />
    </div>
  );
}

function Banner({
  eyebrow,
  title,
  desc,
  dark,
}: {
  eyebrow: string;
  title: React.ReactNode;
  desc: string;
  dark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl px-6 py-10 shadow-sm sm:px-12 sm:py-14"
      style={
        dark
          ? { backgroundColor: NAVY, color: "white" }
          : { backgroundColor: "#F5F7F4", color: NAVY }
      }
    >
      {dark && (
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: GREEN }}
          aria-hidden
        />
      )}
      <div className="relative max-w-2xl">
        <p
          className={
            "mb-3 font-mono text-[10px] uppercase tracking-[0.35em] " + (dark ? "text-white/50" : "text-black/40")
          }
        >
          {eyebrow}
        </p>
        <h3
          className="text-3xl leading-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        <p className={"mt-4 text-base " + (dark ? "text-white/70" : "text-black/60")}>{desc}</p>
        <div
          className="mt-6 h-[2px] w-12"
          style={{ backgroundColor: GREEN }}
          aria-hidden
        />
      </div>
    </motion.div>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28" style={{ backgroundColor: NAVY }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-20 blur-3xl"
        style={{ background: `radial-gradient(circle at 50% 50%, ${GREEN} 0%, transparent 60%)` }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center text-white">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.5em] text-white/60">
          Meet Taylor
        </p>
        <h2 className="text-4xl leading-tight sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
          Your AI shopping companion.{" "}
          <span className="italic" style={{ color: GREEN }}>
            Free forever.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-white/70">
          Join thousands of South African households already shopping smarter with Taylor.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-xl transition hover:scale-[1.02]"
            style={{ backgroundColor: GREEN, color: NAVY }}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/store-onboarding"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            List your store
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white py-10 text-center">
      <p className="text-xs text-black/50">
        © {new Date().getFullYear()} Taylor Intelligence · Made for South Africa
      </p>
    </footer>
  );
}

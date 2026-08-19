import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bike,
  Brain,
  Heart,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import heroAsset from "@/assets/taylor-hero-banner.png.asset.json";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import {
  Section,
  Steps,
  FaqList,
  CtaBand,
  Reveal,
  SmartLink,
} from "@/components/marketing/blocks";
import { productLinks } from "@/components/marketing/nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taylor Intelligence — Groceries. Recipes. Savings. All in one place." },
      {
        name: "description",
        content:
          "Taylor is South Africa's shopping companion — remembers what matters, finds the deals, and turns recipes into smart lists.",
      },
      { property: "og:title", content: "Taylor Intelligence — Smarter shopping. Better living." },
      {
        property: "og:description",
        content:
          "Your shopping companion. Personalised deals, recipes and lists — for South African households.",
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
    <div className="min-h-screen w-full bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <FeatureStrip />
      <ProductGrid />
      <HowItWorks />
      <Audiences />
      <BannerSections />
      <HomeFaq />
      <CtaBand
        title={
          <>
            Your shopping companion.{" "}
            <span className="italic text-primary">Free forever.</span>
          </>
        }
        desc="Join South African households already shopping smarter with Taylor."
        secondary={{ label: "List your store", to: "/store-onboarding" }}
      />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: NAVY }}
    >
      {/* Full-bleed header banner (branding baked in) */}
      <div className="relative w-full">
        <motion.img
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          src={heroAsset.url}
          alt="Taylor Intelligence — Smarter shopping. Better living."
          className="mx-auto block h-auto w-full max-w-[1600px] object-contain"
          loading="eager"
        />
        {/* Bottom fade into navy so it blends into the next section */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-32"
          style={{ background: `linear-gradient(to bottom, ${NAVY}00, ${NAVY})` }}
          aria-hidden
        />
      </div>

      {/* CTA row below banner */}
      <div className="relative mx-auto max-w-3xl px-5 pb-20 pt-4 text-center sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
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
        </motion.div>
        <p className="mt-5 text-xs text-white/55">
          Free forever for shoppers · No card required · Your data stays yours
        </p>
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

function ProductGrid() {
  return (
    <Section
      eyebrow="What she does"
      title="Six capabilities, one conversation"
      intro="Taylor covers the whole shop — from deciding what to cook to getting it delivered."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {productLinks.map(({ label, to, desc, icon: Icon }, i) => (
          <Reveal key={to} delay={i * 0.05}>
            <SmartLink
              to={to}
              className="group flex h-full flex-col rounded-3xl border border-border bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <h3 className="text-lg font-semibold">{label}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{desc}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Learn more
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </SmartLink>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section
      tone="mint"
      eyebrow="How it works"
      title="Four steps to a cheaper, calmer shop"
      intro="Most households settle into this rhythm within a fortnight."
    >
      <Steps
        steps={[
          { title: "Tell her about home", desc: "Household size, dietary needs, the stores you use." },
          { title: "Scan the kitchen", desc: "A few photos and Taylor knows what you already have." },
          { title: "Plan and price", desc: "Meals, a list, and live prices from real SA retailers." },
          { title: "Shop or order", desc: "Take the list in-store, or order with delivery." },
        ]}
      />
    </Section>
  );
}

function Audiences() {
  const cards = [
    {
      icon: ShoppingBag,
      title: "For shoppers",
      desc: "Free forever. Meal plans, lists, live prices, deals and loyalty in one place.",
      to: "/for-shoppers",
      cta: "Explore shopper features",
    },
    {
      icon: Store,
      title: "For stores",
      desc: "Catalogue, promotions, coupons, direct messaging, orders and analytics.",
      to: "/for-stores",
      cta: "See the store portal",
    },
    {
      icon: Bike,
      title: "For riders",
      desc: "Get verified, choose your stores, and deliver paid orders nearby.",
      to: "/for-riders",
      cta: "Deliver with Taylor",
    },
  ];
  return (
    <Section eyebrow="Who it's for" title="One platform, three sides of the shop">
      <div className="grid gap-5 lg:grid-cols-3">
        {cards.map(({ icon: Icon, title, desc, to, cta }, i) => (
          <Reveal key={title} delay={i * 0.06}>
            <SmartLink
              to={to}
              className="group flex h-full flex-col rounded-3xl border border-border bg-navy p-8 text-white transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <Icon className="mb-5 h-7 w-7 text-primary" strokeWidth={1.5} />
              <h3 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">{desc}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </SmartLink>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function HomeFaq() {
  return (
    <Section tone="mint" eyebrow="Questions" title="The things people ask first">
      <FaqList
        items={[
          {
            q: "Is Taylor really free for shoppers?",
            a: "Yes — every shopper feature is free forever. Stores pay to be listed on the platform; households never do.",
          },
          {
            q: "Do I need to download an app?",
            a: "No. Taylor runs in your browser and installs to your home screen on iPhone and Android.",
          },
          {
            q: "Where do the prices come from?",
            a: "Taylor checks the official websites of major South African retailers when you ask, and tells you when a price can't be confirmed.",
          },
          {
            q: "How do I list my store?",
            a: "Apply through the store onboarding wizard. Our team reviews every application and activates your portal on approval.",
          },
        ]}
      />
    </Section>
  );
}

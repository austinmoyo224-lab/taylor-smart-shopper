import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FaqList,
  CtaBand,
  Reveal,
  SmartLink,
} from "@/components/marketing/blocks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Free for shoppers, simple for stores" },
      {
        name: "description",
        content:
          "Taylor is free forever for South African shoppers and riders. Stores get a full retail portal — catalogue, promotions, messaging, orders and analytics — on approval.",
      },
      { property: "og:title", content: "Taylor pricing — free for shoppers" },
      {
        property: "og:description",
        content: "Shoppers and riders pay nothing. Stores get the full retail portal on approval.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/pricing" }],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Shopper",
    price: "Free",
    period: "forever",
    desc: "Everything a South African household needs to shop smarter.",
    cta: { label: "Join as a shopper", to: "/auth" },
    features: [
      "Unlimited chat with Taylor, by voice or text",
      "Taylor Vision multi-photo pantry and fridge scanning",
      "Smart lists with live retailer price comparison",
      "Recipes with method, images and one-tap lists",
      "Deals, digital coupons and loyalty from stores you follow",
      "Restaurant and road-trip guidance",
      "Install to your home screen — no app store needed",
    ],
  },
  {
    name: "Store",
    price: "On approval",
    period: "per store",
    highlight: true,
    desc: "The full retail operating system for your store on Taylor.",
    cta: { label: "List your store", to: "https://heytaylor.co.za/store-onboarding" },
    features: [
      "Public store profile with shoppable catalogue",
      "CSV product import — up to 1 000 items per upload",
      "Promotions and digital QR coupons",
      "Direct messaging and push campaigns to followers",
      "Order management with rider assignment",
      "Follower, campaign and sales analytics",
      "Printable in-store QR code and shareable store link",
    ],
  },
  {
    name: "Delivery rider",
    price: "Free",
    period: "to apply",
    desc: "Get verified and deliver paid orders for stores near you.",
    cta: { label: "Apply as a rider", to: "/auth" },
    features: [
      "Rider portal on your phone",
      "Admin verification and trusted badge",
      "Choose the stores you deliver for",
      "Assigned paid orders with instant notifications",
      "Delivery history and status tracking",
    ],
  },
];

function Pricing() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Shoppers never pay.{" "}
            <span className="italic text-primary">Stores pay for reach.</span>
          </>
        }
        subtitle="Taylor only works if every household in South Africa can use her. So households don't pay — the stores who want to reach them do."
        secondary={{ label: "For stores", to: "/for-stores" }}
      />

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-3xl border p-8",
                  p.highlight
                    ? "border-primary bg-navy text-white shadow-2xl"
                    : "border-border bg-card shadow-sm",
                )}
              >
                <p
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.35em]",
                    p.highlight ? "text-primary" : "text-muted",
                  )}
                >
                  {p.name}
                </p>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl" style={{ fontFamily: "var(--font-display)" }}>
                    {p.price}
                  </span>
                  <span className={cn("text-sm", p.highlight ? "text-white/55" : "text-muted")}>
                    {p.period}
                  </span>
                </p>
                <p className={cn("mt-3 text-sm leading-relaxed", p.highlight ? "text-white/65" : "text-muted")}>
                  {p.desc}
                </p>
                <ul className="mt-7 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                      <span className={p.highlight ? "text-white/80" : "text-foreground"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <SmartLink
                  to={p.cta.to}
                  className={cn(
                    "mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:scale-[1.02]",
                    p.highlight
                      ? "bg-primary text-navy"
                      : "bg-navy text-white",
                  )}
                >
                  {p.cta.label}
                </SmartLink>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="mint" eyebrow="Questions" title="Pricing FAQs">
        <FaqList
          items={[
            {
              q: "Will shopper features ever become paid?",
              a: "The core shopping companion — chat, vision, lists, price comparison, recipes and deals — is free forever. If we ever add optional premium extras, the essentials stay free.",
            },
            {
              q: "What does a store listing cost?",
              a: "Store pricing is agreed per store while we scale across South Africa. Apply through the onboarding wizard and our team will come back to you with current terms.",
            },
            {
              q: "Are there setup fees or contracts?",
              a: "No setup projects and no long lock-ins. Most stores go live from a CSV upload within days of approval.",
            },
            {
              q: "Do riders pay anything?",
              a: "No. Applying, verification and the rider portal are free.",
            },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Start free. <span className="italic text-primary">Today.</span></>}
        desc="Shoppers and riders can sign up right now. Stores apply in a few minutes."
        secondary={{ label: "List your store", to: "https://heytaylor.co.za/store-onboarding" }}
      />
    </MarketingPage>
  );
}
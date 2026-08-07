import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  CtaBand,
  Reveal,
  SmartLink,
} from "@/components/marketing/blocks";
import { productLinks } from "@/components/marketing/nav";

export const Route = createFileRoute("/features/")({
  head: () => ({
    meta: [
      { title: "Features — Everything Taylor does for your shopping" },
      {
        name: "description",
        content:
          "Chat, pantry scanning, smart lists with live South African price comparison, recipes, deals, loyalty and road-trip guidance — every Taylor feature explained.",
      },
      { property: "og:title", content: "Features — Everything Taylor does" },
      {
        property: "og:description",
        content:
          "Chat, vision scanning, smart lists, price comparison, recipes, deals and travel guidance in one companion.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/features" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/features" }],
  }),
  component: FeaturesIndex,
});

function FeaturesIndex() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Product"
        title={
          <>
            One companion.{" "}
            <span className="italic text-primary">Every part of the shop.</span>
          </>
        }
        subtitle="Taylor covers the whole loop — deciding what to cook, knowing what you already have, building the list, finding the best price, claiming the deal, and getting it home."
        secondary={{ label: "See pricing", to: "/pricing" }}
        note="Free forever for shoppers · No card required"
      />

      <Section
        eyebrow="Explore"
        title="Pick a capability and see exactly how it works"
        intro="Every feature below is live in the app today. Each page explains what it does, how you use it, and where the information comes from."
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

      <CtaBand
        title={
          <>
            Start with a single question.{" "}
            <span className="italic text-primary">Taylor takes it from there.</span>
          </>
        }
        desc="Create a free account and ask her what's for dinner tonight."
        secondary={{ label: "For stores", to: "/for-stores" }}
      />
    </MarketingPage>
  );
}
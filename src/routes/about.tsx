import { createFileRoute } from "@tanstack/react-router";
import { Brain, Globe2, HeartHandshake, Lock, Sparkles, Users } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureGrid,
  CtaBand,
  Reveal,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Taylor Intelligence — Built for South African households" },
      {
        name: "description",
        content:
          "Taylor Intelligence is a South African retail operating system: a shopping companion for households, a growth platform for stores and a delivery network for riders.",
      },
      { property: "og:title", content: "About Taylor Intelligence" },
      {
        property: "og:description",
        content: "Why we built a shopping companion for South Africa, and what we stand for.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/about" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/about" }],
  }),
  component: About,
});

function About() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="About us"
        title={
          <>
            Groceries are the household's{" "}
            <span className="italic text-primary">biggest monthly decision.</span>
          </>
        }
        subtitle="Taylor Intelligence exists because South African families spend hours every month planning, comparing and second-guessing a shop that should be simple — and because the stores serving them deserve a direct line to their customers."
        secondary={{ label: "Contact us", to: "/contact" }}
      />

      <Section eyebrow="Our story" title="One companion, three sides of the same shop">
        <div className="grid gap-8 lg:grid-cols-3">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-8">
              <h3 className="text-xl font-semibold">For the household</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Taylor remembers who eats what, what's already in the cupboard, and what the
                budget looks like this month. She turns that into meals, lists and real price
                comparisons — so the shop takes minutes instead of an afternoon.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="rounded-3xl border border-border bg-card p-8">
              <h3 className="text-xl font-semibold">For the store</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Independent and chain retailers alike get a portal to load their catalogue,
                publish promotions, issue coupons, message followers and fulfil orders — without
                a six-month systems project.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="rounded-3xl border border-border bg-card p-8">
              <h3 className="text-xl font-semibold">For the rider</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Verified delivery riders choose the stores they work with and receive paid,
                assigned orders — closing the loop between the list, the shelf and the front
                door.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="mint" eyebrow="What we stand for" title="The principles behind the product">
        <FeatureGrid
          items={[
            { icon: Globe2, title: "Local first", desc: "South African retailers, brands, prices, languages and eating habits." },
            { icon: Lock, title: "Privacy as default", desc: "Household memory is yours. Never sold, never rented to advertisers." },
            { icon: HeartHandshake, title: "Fair to stores", desc: "Direct relationships with followers, not rented attention." },
            { icon: Brain, title: "Memory over gimmicks", desc: "Usefulness comes from remembering, not from novelty." },
            { icon: Users, title: "Built for real homes", desc: "Big families, tight budgets, month-end, load-shedding, all of it." },
            { icon: Sparkles, title: "Quietly better", desc: "The product should improve every week without asking anything of you." },
          ]}
        />
      </Section>

      <Section eyebrow="Where we are" title="Live in South Africa, growing store by store">
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-muted">
          <p>
            Taylor is live at heytaylor.co.za, serving shoppers across all nine provinces. Stores
            are onboarded and reviewed individually so that every listing on the platform is a real
            business a shopper can trust.
          </p>
          <p>
            The platform is built on a security-first foundation: authenticated access, row-level
            data isolation for every store and household, and regular security scanning. Your
            shopping list is nobody else's business.
          </p>
        </div>
      </Section>

      <CtaBand
        title={<>Come shop with <span className="italic text-primary">Taylor.</span></>}
        desc="Free forever for shoppers. A serious growth channel for stores."
        secondary={{ label: "For stores", to: "/for-stores" }}
      />
    </MarketingPage>
  );
}
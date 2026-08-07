import { createFileRoute } from "@tanstack/react-router";
import { Brain, Camera, ChefHat, ShieldCheck, TrendingDown, Truck } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureGrid,
  Steps,
  FaqList,
  CtaBand,
  ValueStrip,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/for-shoppers")({
  head: () => ({
    meta: [
      { title: "For shoppers — Taylor is free forever for South African homes" },
      {
        name: "description",
        content:
          "Plan meals, scan your pantry, compare live retailer prices and collect store deals. Taylor is free forever for shoppers, with no card and no contract.",
      },
      { property: "og:title", content: "Taylor for shoppers — free forever" },
      {
        property: "og:description",
        content: "Meal planning, pantry scanning, live price comparison and store deals in one app.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/for-shoppers" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/for-shoppers" }],
  }),
  component: ForShoppers,
});

function ForShoppers() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="For shoppers"
        title={
          <>
            Feed your home for less,{" "}
            <span className="italic text-primary">without the mental load.</span>
          </>
        }
        subtitle="Taylor handles the part of grocery shopping that eats your evenings: deciding, remembering, listing, comparing and reminding. You just cook and eat."
        primary={{ label: "Join as a shopper", to: "/auth" }}
        secondary={{ label: "See all features", to: "/features" }}
        note="Free forever · No card required · Your data stays yours"
      />

      <ValueStrip
        items={[
          { title: "Free forever", desc: "Every shopper feature, at no cost." },
          { title: "Built for SA", desc: "Local retailers, brands, prices and languages." },
          { title: "Works offline-first", desc: "Installs to your home screen like an app." },
          { title: "Private", desc: "Your household memory is never sold." },
        ]}
      />

      <Section
        eyebrow="The weekly loop"
        title="What a week with Taylor looks like"
        intro="Most households settle into the same rhythm within a fortnight."
      >
        <Steps
          steps={[
            { title: "Sunday scan", desc: "Photograph the fridge and cupboard so Taylor knows what's left." },
            { title: "Plan the meals", desc: "Ask for a week of dinners that suit your budget and your family." },
            { title: "Price the basket", desc: "Compare the list across major retailers before you drive anywhere." },
            { title: "Shop or order", desc: "Take the list to the store, or send it as an order with delivery." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="Why households stay" title="The parts people tell us they can't go back from">
        <FeatureGrid
          items={[
            { icon: Brain, title: "She remembers", desc: "Allergies, fussy eaters, portion sizes and budgets — once." },
            { icon: Camera, title: "No more inventory", desc: "Scan the fridge instead of writing lists by hand." },
            { icon: TrendingDown, title: "Real savings", desc: "Live price checks against official retailer sites." },
            { icon: ChefHat, title: "Dinner solved", desc: "Recipes with method, images and a one-tap list." },
            { icon: Truck, title: "Delivery option", desc: "Send an order to a followed store and have it brought home." },
            { icon: ShieldCheck, title: "No spam", desc: "Only the stores you follow can reach you." },
          ]}
        />
      </Section>

      <Section eyebrow="Questions" title="Shopper FAQs">
        <FaqList
          items={[
            {
              q: "Is Taylor really free?",
              a: "Yes. Every shopper feature — chat, vision scanning, lists, price comparison, recipes, deals and loyalty — is free forever. Stores pay to be on the platform; you never do.",
            },
            {
              q: "Do I need to download anything?",
              a: "No. Taylor runs in your browser and installs to your home screen like a normal app on both iPhone and Android.",
            },
            {
              q: "Where do the prices come from?",
              a: "Taylor checks the official websites of major South African retailers at the moment you ask, rather than an old internal price list. If a price cannot be confirmed she tells you.",
            },
            {
              q: "What does Taylor remember about me?",
              a: "Only what you enter in your profile and what happens in your conversations — household size, dietary needs, preferred stores and your lists. You can view and edit all of it, and delete your account at any time.",
            },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Your first list takes <span className="italic text-primary">sixty seconds.</span></>}
        desc="Create a free account and ask Taylor what's for dinner."
        primary={{ label: "Join as a shopper", to: "/auth" }}
        secondary={{ label: "Pricing", to: "/pricing" }}
      />
    </MarketingPage>
  );
}
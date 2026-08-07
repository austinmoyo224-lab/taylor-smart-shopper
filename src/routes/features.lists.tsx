import { createFileRoute } from "@tanstack/react-router";
import { Calculator, ListChecks, PencilLine, ShoppingBasket, Store, TrendingDown } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureRow,
  FeatureGrid,
  Steps,
  CtaBand,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/features/lists")({
  head: () => ({
    meta: [
      { title: "Smart lists & price comparison — Know the cheapest basket first" },
      {
        name: "description",
        content:
          "Build a shopping list with Taylor, compare live prices from official South African retailer sites, edit measurements inline and order from stores you follow.",
      },
      { property: "og:title", content: "Smart lists & live price comparison" },
      {
        property: "og:description",
        content:
          "Live pricing from official SA retailer websites, inline editing and store ordering built in.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://heytaylor.co.za/features/lists" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/features/lists" }],
  }),
  component: ListsFeature,
});

function ListsFeature() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Smart lists"
        title={
          <>
            The list that knows{" "}
            <span className="italic text-primary">what it costs.</span>
          </>
        }
        subtitle="Every item on your Taylor list can be priced against real South African retailers before you leave the house — so you know where the basket is cheapest, not just what's in it."
        secondary={{ label: "All features", to: "/features" }}
      />

      <Section
        eyebrow="How it works"
        title="From idea to a priced, orderable basket"
      >
        <Steps
          steps={[
            { title: "Add", desc: "Ask Taylor, tap a recipe, or type items in yourself." },
            { title: "Tidy", desc: "Edit names and measurements inline so each item is searchable." },
            { title: "Compare", desc: "Taylor checks live prices from official retailer websites." },
            { title: "Buy", desc: "Shop in-store, or send the basket as an order to a store you follow." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="In detail" title="Why the pricing is trustworthy">
        <div className="space-y-6">
          <FeatureRow
            index="01"
            title="Live prices from official sources"
            desc="Taylor pulls current pricing from the official websites of major South African retailers rather than an outdated internal price list. What you see is what the shelf says."
            bullets={[
              "Checkers, Pick n Pay, Woolworths and other official SA domains",
              "Per-item comparison across the stores you care about",
              "Basket-level totals so you can see the real difference",
              "Clear indication when a price cannot be confirmed",
            ]}
          />
          <FeatureRow
            index="02"
            flip
            title="Measurements handled properly"
            desc="A recipe that calls for two cups of rice cannot be priced. Taylor keeps measurements as notes and prompts you to set a shoppable quantity — 2kg rice, not 2 cups — so the comparison is real."
            bullets={[
              "Recipe measurements stored as notes, not in the search term",
              "Inline editing on every list row",
              "Guidance before comparing so quantities make sense",
              "Pagination once a list passes ten items — no endless scrolling",
            ]}
          />
          <FeatureRow
            index="03"
            title="From list to basket to delivery"
            desc="If a store you follow has an online catalogue on Taylor, your list can become an order. Add delivery at checkout and a verified rider brings it home."
            bullets={[
              "Basket button right beside the scan action",
              "Order directly from followed stores with product catalogues",
              "Optional delivery by a verified Taylor rider",
              "Order status and notifications in your inbox",
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Also included" title="The details that save the trip">
        <FeatureGrid
          items={[
            { icon: TrendingDown, title: "Cheapest basket", desc: "See which retailer wins on your actual list." },
            { icon: PencilLine, title: "Inline editing", desc: "Fix a name or quantity without leaving the list." },
            { icon: Calculator, title: "Unit-price sanity", desc: "Compare like with like, not per-chop nonsense." },
            { icon: ShoppingBasket, title: "Basket in one tap", desc: "Turn the list into an order you can send." },
            { icon: Store, title: "Store catalogues", desc: "Shop products stores have loaded on Taylor." },
            { icon: ListChecks, title: "Multiple lists", desc: "Weekly shop, braai, month-end stock-up." },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Know the price <span className="italic text-primary">before you go.</span></>}
        desc="Build your first list in under a minute — free."
        secondary={{ label: "Recipes", to: "/features/recipes" }}
      />
    </MarketingPage>
  );
}
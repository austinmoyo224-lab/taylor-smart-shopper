import { createFileRoute } from "@tanstack/react-router";
import { ChefHat, Image, Share2, Soup, Utensils, Wallet } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureRow,
  FeatureGrid,
  Steps,
  CtaBand,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/features/recipes")({
  head: () => ({
    meta: [
      { title: "Recipes — Cook what you have, shop only what you need" },
      {
        name: "description",
        content:
          "Taylor suggests recipes that fit your household, shows step-by-step method, generates a dish image and turns ingredients into a priced shopping list you can share.",
      },
      { property: "og:title", content: "Recipes that become shopping lists" },
      {
        property: "og:description",
        content: "Step-by-step method, generated dish images, one-tap list and easy sharing.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://heytaylor.co.za/features/recipes" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/features/recipes" }],
  }),
  component: RecipesFeature,
});

function RecipesFeature() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Recipes"
        title={
          <>
            Dinner decided.{" "}
            <span className="italic text-primary">List included.</span>
          </>
        }
        subtitle="Taylor suggests meals that suit your household, your budget and what's already in the cupboard — then hands you the method, a picture of the dish and a shopping list for the gaps."
        secondary={{ label: "All features", to: "/features" }}
      />

      <Section eyebrow="How it works" title="Four taps from craving to trolley">
        <Steps
          steps={[
            { title: "Ask", desc: "'Something quick with mince' or 'a Sunday meal for six'." },
            { title: "Open", desc: "Full ingredients, step-by-step method and a generated dish image." },
            { title: "Convert", desc: "One tap turns the ingredients into a shopping list." },
            { title: "Share", desc: "Send the recipe to family — they can open it without an account." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="In detail" title="More than a wall of text">
        <div className="space-y-6">
          <FeatureRow
            index="01"
            title="Every recipe opens properly"
            desc="Taylor's recipes are real pages, not chat fragments. Tap through for the full ingredient list, quantities, method steps and cooking time."
            bullets={[
              "Full ingredients with quantities kept as notes",
              "Numbered step-by-step method",
              "Generated image of the finished dish",
              "Saved to your recipe collection for next time",
            ]}
          />
          <FeatureRow
            index="02"
            flip
            title="Ingredients become a shoppable list"
            desc="Measurements are separated from the item name so prices can actually be compared — 'mutton chops' with '800g' as a note, rather than a search term nothing matches."
            bullets={[
              "One tap from recipe to shopping list",
              "Measurements stored as notes for accurate pricing",
              "Merges with your existing weekly list",
              "Skips items your pantry already covers",
            ]}
          />
          <FeatureRow
            index="03"
            title="Made to be shared"
            desc="Share a recipe by link or the native share sheet. Whoever receives it can read the whole thing — no sign-up wall in the way of a good meal."
            bullets={[
              "Public share links that actually open",
              "Native share on iOS and Android",
              "Receivers can save it by creating a free account",
              "Regenerate the dish image whenever you like",
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Also included" title="Cooking, the Taylor way">
        <FeatureGrid
          items={[
            { icon: ChefHat, title: "Household-fitted", desc: "Portions sized for the people at your table." },
            { icon: Soup, title: "Cook the cupboard", desc: "Recipes built around what your pantry already holds." },
            { icon: Wallet, title: "Budget-aware", desc: "Meal ideas that respect month-end realities." },
            { icon: Image, title: "Dish images", desc: "See the meal before you commit to making it." },
            { icon: Share2, title: "Easy sharing", desc: "Send to the family group chat in two taps." },
            { icon: Utensils, title: "Local flavour", desc: "South African staples, brands and eating habits." },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Let Taylor plan <span className="italic text-primary">this week's meals.</span></>}
        desc="Free for shoppers, forever."
        secondary={{ label: "Deals & loyalty", to: "/features/deals" }}
      />
    </MarketingPage>
  );
}
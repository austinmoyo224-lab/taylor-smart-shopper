import { createFileRoute } from "@tanstack/react-router";
import { Brain, Clock, CloudSun, Mic, ShieldCheck, Sparkles } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureRow,
  FeatureGrid,
  Steps,
  CtaBand,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/features/chat")({
  head: () => ({
    meta: [
      { title: "Taylor Chat — A shopping companion that remembers your home" },
      {
        name: "description",
        content:
          "Talk or type to Taylor about dinner, budgets and specials. She remembers your household, dietary needs and favourite stores, and knows the real time, date and weather.",
      },
      { property: "og:title", content: "Taylor Chat — She remembers your home" },
      {
        property: "og:description",
        content:
          "Voice or text, with household memory, real-time clock and live weather for South Africa.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://heytaylor.co.za/features/chat" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/features/chat" }],
  }),
  component: ChatFeature,
});

function ChatFeature() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Taylor Chat"
        title={
          <>
            The conversation that{" "}
            <span className="italic text-primary">runs your kitchen.</span>
          </>
        }
        subtitle="Ask Taylor what to cook, what it will cost, what's on special, or what you already have at home. She keeps the thread going and picks up exactly where you left off."
        secondary={{ label: "All features", to: "/features" }}
      />

      <Section
        eyebrow="How it works"
        title="Four things happen in every conversation"
        intro="Taylor is not a search box. She holds context about your household and works across your lists, pantry, recipes and followed stores in the same thread."
      >
        <Steps
          steps={[
            { title: "You ask", desc: "Type it or hold the mic and speak — English or your home language." },
            { title: "She recalls", desc: "Household size, kids' ages, allergies, budget habits and stores you follow." },
            { title: "She acts", desc: "Builds lists, checks prices, pulls recipes, reads a promotion flyer, finds a restaurant." },
            { title: "She remembers", desc: "The thread is saved, so next week's chat starts with everything already known." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="In detail" title="What makes the conversation different">
        <div className="space-y-6">
          <FeatureRow
            index="01"
            title="Household memory"
            desc="Taylor Memory is the profile behind the chat — the details you fill in once and never repeat. She uses it to size portions, avoid allergens and keep suggestions realistic for your budget."
            bullets={[
              "Household size, children's ages and who cooks",
              "Dietary preferences, allergies and things you simply do not eat",
              "Province, home language and the stores near you",
              "Editable at any time from your profile — nothing is locked in",
            ]}
          />
          <FeatureRow
            index="02"
            flip
            title="Voice, photos and text in one thread"
            desc="Speak to Taylor while your hands are busy, or send her a photo of your fridge, a shelf or a promotion flyer. Everything lands in the same conversation for her to respond to."
            bullets={[
              "Hold-to-talk voice input with spoken replies",
              "Photos attach directly to the message she answers",
              "Promotion flyers are read and turned into usable specials",
              "Full history is kept — she never restarts the relationship",
            ]}
          />
          <FeatureRow
            index="03"
            title="Grounded in the real world"
            desc="Taylor knows the actual date, time and weather where you are, so 'what should I make tonight?' gets an answer that fits a cold Tuesday in July, not a generic one."
            bullets={[
              "Real South African time and date in every conversation",
              "Live weather lookups for your town",
              "Knowledge of major SA retailers and their loyalty programmes",
              "Prices checked against official retailer websites, not guesses",
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Also included" title="Small things that make it feel personal">
        <FeatureGrid
          items={[
            { icon: Brain, title: "Continuous memory", desc: "Conversations resume where they ended, across devices." },
            { icon: Mic, title: "Hands-free voice", desc: "Talk while you cook, drive or pack away groceries." },
            { icon: Clock, title: "Real-time aware", desc: "She knows the date, time and day of the week — properly." },
            { icon: CloudSun, title: "Weather-led ideas", desc: "Soup on a cold night, braai when the weekend is clear." },
            { icon: Sparkles, title: "Gets better weekly", desc: "The more you shop, the sharper her suggestions become." },
            { icon: ShieldCheck, title: "Private by default", desc: "Your memory is yours — never sold, never shared." },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Ask her what's for dinner <span className="italic text-primary">tonight.</span></>}
        desc="Free forever for shoppers. No card, no contract."
        secondary={{ label: "See Taylor Vision", to: "/features/vision" }}
      />
    </MarketingPage>
  );
}
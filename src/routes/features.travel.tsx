import { createFileRoute } from "@tanstack/react-router";
import { CloudSun, Coffee, MapPin, Route as RouteIcon, Star, Timer } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureRow,
  FeatureGrid,
  Steps,
  CtaBand,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/features/travel")({
  head: () => ({
    meta: [
      { title: "Eating out & road trips — Restaurants, reviews and route guidance" },
      {
        name: "description",
        content:
          "Ask Taylor where to eat, what the reviews say, and what's on the road from Johannesburg to Durban — stops, travel time, weather and food, in plain answers.",
      },
      { property: "og:title", content: "Eating out & road trips with Taylor" },
      {
        property: "og:description",
        content: "Restaurant ratings, real reviews, stop-by-stop road trip guidance and weather.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://heytaylor.co.za/features/travel" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/features/travel" }],
  }),
  component: TravelFeature,
});

function TravelFeature() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Eating out & road trips"
        title={
          <>
            Where to eat.{" "}
            <span className="italic text-primary">What's on the way.</span>
          </>
        }
        subtitle="Taylor answers restaurant and travel questions in words, not maps. Ratings, honest review summaries, distances, travel time and weather — read it and go."
        secondary={{ label: "All features", to: "/features" }}
      />

      <Section eyebrow="How it works" title="Ask like you'd ask a friend">
        <Steps
          steps={[
            { title: "Ask", desc: "'Good Portuguese food near Fourways?' or 'Jozi to Durban this Friday.'" },
            { title: "She looks it up", desc: "Live place data, ratings and reviews, checked in the background." },
            { title: "She summarises", desc: "What people say, what it costs, how far, how long with traffic." },
            { title: "You go", desc: "Plain guidance — no map to wrestle with on a small screen." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="In detail" title="Two questions Taylor answers very well">
        <div className="space-y-6">
          <FeatureRow
            index="01"
            title="Restaurants and reviews"
            desc="Taylor pulls current place information — rating, price level, opening hours and what reviewers actually say — and gives you a short, honest read rather than a list of pins."
            bullets={[
              "Star ratings and number of reviews",
              "Summarised review themes: service, portions, noise, parking",
              "Distance from where you are and rough price level",
              "Filtered by cuisine, budget and your household's dietary needs",
            ]}
          />
          <FeatureRow
            index="02"
            flip
            title="Road trip planning"
            desc="Tell her the route and she covers the drive: sensible stops, how far apart they are, traffic-aware timing, and what the weather will be doing when you get there."
            bullets={[
              "Stops and eating options along the actual route",
              "Traffic-aware travel time and distance",
              "Weather at your destination and along the way",
              "Practical guidance for families travelling with children",
            ]}
          />
          <FeatureRow
            index="03"
            title="No map required"
            desc="Everything happens in the conversation. Taylor does the lookups behind the scenes and replies with the answer — nothing to install, nothing to embed, no fighting with pinch-zoom."
            bullets={[
              "Answers in plain language inside the chat",
              "Works over voice while you're driving",
              "Ask follow-ups: 'anything cheaper?', 'somewhere with a play area?'",
              "Combines with your Taylor Memory for family-friendly picks",
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Also included" title="Small answers that make the trip easier">
        <FeatureGrid
          items={[
            { icon: Star, title: "Real ratings", desc: "Current review scores, not stale listings." },
            { icon: Coffee, title: "Stops en route", desc: "Coffee, fuel and a proper meal, spaced sensibly." },
            { icon: RouteIcon, title: "Route awareness", desc: "What's actually on your road, not nearby generally." },
            { icon: Timer, title: "Traffic-aware timing", desc: "How long it will really take on the day." },
            { icon: CloudSun, title: "Weather ahead", desc: "Know before you pack the car." },
            { icon: MapPin, title: "Local knowledge", desc: "South African towns, routes and eating habits." },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Ask Taylor about <span className="italic text-primary">your next drive.</span></>}
        desc="Free for shoppers — travel guidance included."
        secondary={{ label: "All features", to: "/features" }}
      />
    </MarketingPage>
  );
}
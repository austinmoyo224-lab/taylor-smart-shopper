import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Bell, Bike, MapPin, Store, Wallet } from "lucide-react";
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

export const Route = createFileRoute("/for-riders")({
  head: () => ({
    meta: [
      { title: "For delivery riders — Deliver paid store orders on Taylor" },
      {
        name: "description",
        content:
          "Apply as a Taylor delivery rider, get verified by our admin team, choose the stores you deliver for and receive paid orders straight to your phone.",
      },
      { property: "og:title", content: "Become a Taylor delivery rider" },
      {
        property: "og:description",
        content: "Get verified, follow the stores near you and deliver paid orders.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/for-riders" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/for-riders" }],
  }),
  component: ForRiders,
});

function ForRiders() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="For delivery riders"
        title={
          <>
            Deliver for the stores{" "}
            <span className="italic text-primary">in your own area.</span>
          </>
        }
        subtitle="Taylor riders are verified, linked to real stores and assigned paid orders — no bidding wars, no mystery jobs, no long trips across the city for nothing."
        primary={{ label: "Apply as a rider", to: "/auth" }}
        secondary={{ label: "How stores work", to: "/for-stores" }}
        note="Free to apply · Verification by the Taylor admin team"
      />

      <ValueStrip
        items={[
          { title: "You pick the stores", desc: "Follow and deliver only where it suits you." },
          { title: "Paid orders only", desc: "Jobs are assigned after the shopper has paid." },
          { title: "Verified status", desc: "A trusted badge stores can rely on." },
          { title: "Phone-first", desc: "Everything runs from your rider portal." },
        ]}
      />

      <Section eyebrow="Getting started" title="Four steps to your first delivery">
        <Steps
          steps={[
            { title: "Sign up", desc: "Create an account and choose the delivery rider role." },
            { title: "Submit details", desc: "Complete your rider profile and vehicle information." },
            { title: "Get verified", desc: "Our admin team reviews and approves your application." },
            { title: "Start delivering", desc: "Follow stores near you and accept assigned orders." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="The rider portal" title="What you get once you're verified">
        <FeatureGrid
          items={[
            { icon: BadgeCheck, title: "Verified badge", desc: "Approved by Taylor admin — stores see it." },
            { icon: Store, title: "Choose your stores", desc: "Follow the shops you want to deliver for." },
            { icon: Bike, title: "Assigned deliveries", desc: "Paid orders handed to you by the store." },
            { icon: Bell, title: "Instant notifications", desc: "Alerts when an order is assigned or changed." },
            { icon: MapPin, title: "Local runs", desc: "Work the area you actually know." },
            { icon: Wallet, title: "Clear job history", desc: "Every delivery recorded in your portal." },
          ]}
        />
      </Section>

      <Section eyebrow="Questions" title="Rider FAQs">
        <FaqList
          items={[
            {
              q: "How long does verification take?",
              a: "Applications are reviewed by the Taylor admin team, usually within a few working days. You'll be notified in the app as soon as your status changes.",
            },
            {
              q: "Can I set my own verification status?",
              a: "No. Verification and rating are controlled by our admin team only — that's what makes the badge worth something to stores and shoppers.",
            },
            {
              q: "Do I have to deliver for every store?",
              a: "No. You follow the stores you want to work with, and only those stores can assign orders to you.",
            },
            {
              q: "What do I need to apply?",
              a: "A smartphone, a way to get around, and your contact and vehicle details. Everything else happens inside the rider portal.",
            },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Get verified and start <span className="italic text-primary">delivering.</span></>}
        desc="Applications are free and reviewed by a real person."
        primary={{ label: "Apply as a rider", to: "/auth" }}
        secondary={{ label: "Contact us", to: "/contact" }}
      />
    </MarketingPage>
  );
}
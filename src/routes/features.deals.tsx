import { createFileRoute } from "@tanstack/react-router";
import { BadgePercent, Bell, Gift, QrCode, Store, Ticket } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureRow,
  FeatureGrid,
  Steps,
  CtaBand,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/features/deals")({
  head: () => ({
    meta: [
      { title: "Deals, coupons & loyalty — Specials that actually fit your household" },
      {
        name: "description",
        content:
          "Follow your local stores and get their specials, digital QR coupons and loyalty rewards straight to your Taylor inbox — relevant, never spam.",
      },
      { property: "og:title", content: "Deals, coupons & loyalty on Taylor" },
      {
        property: "og:description",
        content: "Store specials, scannable QR coupons and loyalty points in one inbox.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://heytaylor.co.za/features/deals" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/features/deals" }],
  }),
  component: DealsFeature,
});

function DealsFeature() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Deals, coupons & loyalty"
        title={
          <>
            Specials for your list.{" "}
            <span className="italic text-primary">Not everyone's.</span>
          </>
        }
        subtitle="Follow the stores you actually shop at and Taylor filters their promotions against what your household buys — then keeps the coupons and points in one place."
        secondary={{ label: "All features", to: "/features" }}
      />

      <Section eyebrow="How it works" title="Follow, receive, redeem">
        <Steps
          steps={[
            { title: "Follow", desc: "Scan a store's QR code or find them in the Taylor store directory." },
            { title: "Receive", desc: "Their specials and messages arrive in your Taylor inbox." },
            { title: "Redeem", desc: "Show the digital QR coupon at the till — no printing, no clipping." },
            { title: "Earn", desc: "Collect loyalty points and rewards from the stores you support." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="In detail" title="A promotions inbox worth opening">
        <div className="space-y-6">
          <FeatureRow
            index="01"
            title="Store messages, not marketing noise"
            desc="Store owners can message their followers directly through Taylor. Because Taylor knows what your household buys, the offers that reach you are the ones that matter."
            bullets={[
              "Dedicated inbox per store you follow",
              "Campaigns delivered as in-app messages and push notifications",
              "Unfollow at any time — you control the relationship",
              "No third-party ad tracking",
            ]}
          />
          <FeatureRow
            index="02"
            flip
            title="Digital QR coupons"
            desc="Coupons issued by stores live in your phone as scannable codes with clear expiry and terms. Nothing to print, nothing to forget in the car."
            bullets={[
              "Scannable at the till from your phone",
              "Clear validity dates and conditions",
              "Expiry reminders before you lose the value",
              "History of what you've redeemed",
            ]}
          />
          <FeatureRow
            index="03"
            title="Loyalty that Taylor understands"
            desc="Taylor keeps track of the loyalty programmes South African shoppers already use, and stores on the platform can run their own points and rewards through her too."
            bullets={[
              "Points balances and rewards per store",
              "Knows the major SA retailer loyalty programmes",
              "Reward redemption straight from the app",
              "Deals ranked by real saving, not headline percentage",
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Also included" title="Everything in the deals tab">
        <FeatureGrid
          items={[
            { icon: BadgePercent, title: "Personal specials", desc: "Filtered against what your home actually eats." },
            { icon: Ticket, title: "Digital coupons", desc: "Scannable codes with expiry tracking." },
            { icon: Gift, title: "Rewards", desc: "Points and perks from stores you follow." },
            { icon: Bell, title: "Timely alerts", desc: "Push notifications when a deal is worth it." },
            { icon: QrCode, title: "QR store follow", desc: "Scan in-store to connect instantly." },
            { icon: Store, title: "Store profiles", desc: "Catalogue, location and contact in one page." },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Follow your stores. <span className="italic text-primary">Save every week.</span></>}
        desc="Join free and connect your first store today."
        secondary={{ label: "For stores", to: "/for-stores" }}
      />
    </MarketingPage>
  );
}
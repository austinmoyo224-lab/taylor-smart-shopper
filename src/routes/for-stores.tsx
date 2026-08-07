import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Bike,
  ClipboardList,
  MessageSquare,
  QrCode,
  Ticket,
  Upload,
  Users,
} from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureRow,
  FeatureGrid,
  Steps,
  FaqList,
  CtaBand,
  ValueStrip,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/for-stores")({
  head: () => ({
    meta: [
      { title: "For stores — A retail operating system for South African retailers" },
      {
        name: "description",
        content:
          "List your store on Taylor: build a follower base, upload your catalogue by CSV, run promotions and coupons, message shoppers directly and fulfil orders with verified riders.",
      },
      { property: "og:title", content: "Taylor for stores — reach shoppers directly" },
      {
        property: "og:description",
        content:
          "Catalogue, promotions, coupons, direct messaging, orders, delivery and analytics in one portal.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/for-stores" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/for-stores" }],
  }),
  component: ForStores,
});

function ForStores() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="For stores"
        title={
          <>
            Your store, inside{" "}
            <span className="italic text-primary">every shopping decision.</span>
          </>
        }
        subtitle="Taylor is where South African households plan their groceries. Listing your store puts your catalogue, specials and coupons in the moment the basket is being decided — not after."
        primary={{ label: "List your store", to: "/store-onboarding" }}
        secondary={{ label: "Talk to us", to: "/contact" }}
        note="Reviewed and approved by our team · Live in days, not months"
      />

      <ValueStrip
        items={[
          { title: "Owned audience", desc: "Followers you can reach directly, forever." },
          { title: "Zero integration", desc: "Upload a CSV — no POS project required." },
          { title: "Real intent", desc: "Shoppers arrive with a list already in hand." },
          { title: "Delivery ready", desc: "Verified riders fulfil your paid orders." },
        ]}
      />

      <Section eyebrow="Getting started" title="From application to first order">
        <Steps
          steps={[
            { title: "Apply", desc: "Submit your store details through the onboarding wizard." },
            { title: "Get approved", desc: "Our team reviews and activates your store portal." },
            { title: "Load products", desc: "Bulk upload your catalogue by CSV — up to a thousand items at a time." },
            { title: "Go live", desc: "Print your QR code, grow followers, publish specials and take orders." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="The portal" title="Everything you run your Taylor presence with">
        <div className="space-y-6">
          <FeatureRow
            index="01"
            title="Catalogue and orders"
            desc="Load your products once and they become shoppable inside Taylor. When a shopper builds a basket from your catalogue, the order lands in your portal ready to pick, pack and assign."
            bullets={[
              "CSV bulk import with validation",
              "Product catalogue displayed on your public store profile",
              "Paid orders queued in your portal",
              "Assign a verified delivery rider in one click",
            ]}
          />
          <FeatureRow
            index="02"
            flip
            title="Promotions, coupons and campaigns"
            desc="Publish specials that Taylor matches to households likely to buy them, issue scannable digital coupons, and message your followers directly in their Taylor inbox."
            bullets={[
              "Create, edit and delete promotions with linked products",
              "Digital QR coupons with expiry and terms",
              "Direct broadcast messaging to followers",
              "Push notifications delivered to shoppers' phones",
            ]}
          />
          <FeatureRow
            index="03"
            title="Followers, QR and analytics"
            desc="Every store gets a public profile, a unique link and a printable QR code for in-store signage. The dashboard shows how your followers, campaigns and orders are performing."
            bullets={[
              "Printable QR code and shareable store link",
              "Follower growth and engagement analytics",
              "Campaign delivery and redemption reporting",
              "Multi-store support under one organisation",
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Included" title="Store portal at a glance">
        <FeatureGrid
          items={[
            { icon: Upload, title: "CSV catalogue import", desc: "Thousands of products, minutes of work." },
            { icon: Ticket, title: "Coupons", desc: "Scannable QR coupons with tracked redemption." },
            { icon: MessageSquare, title: "Follower messaging", desc: "Speak to your shoppers, not an algorithm." },
            { icon: ClipboardList, title: "Order management", desc: "Paid orders, picking and assignment." },
            { icon: Bike, title: "Rider assignment", desc: "Hand off deliveries to verified riders." },
            { icon: QrCode, title: "In-store QR", desc: "Convert foot traffic into followers." },
            { icon: BarChart3, title: "Analytics", desc: "See what your promotions actually do." },
            { icon: Users, title: "Team access", desc: "Multiple stores and staff per organisation." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="Questions" title="Store FAQs">
        <FaqList
          items={[
            {
              q: "What does it cost to list a store?",
              a: "Store listings are approved case by case while we scale in South Africa. Send us your details through the onboarding wizard or the contact page and we will come back to you with current terms.",
            },
            {
              q: "Do I need to integrate my point-of-sale system?",
              a: "No. Most stores start with a CSV upload of their product list. Nothing needs to be connected to your tills to go live.",
            },
            {
              q: "Who controls my store's status?",
              a: "Store status is managed by the Taylor admin team for platform integrity. Everything else — products, promotions, coupons, messages and orders — is yours to control in the portal.",
            },
            {
              q: "How do deliveries work?",
              a: "Delivery riders apply, are verified by our admin team, and choose the stores they deliver for. When an order is paid you assign an available rider and both sides are notified automatically.",
            },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Put your store where the <span className="italic text-primary">list gets made.</span></>}
        desc="Apply in a few minutes. Our team reviews every application personally."
        primary={{ label: "List your store", to: "/store-onboarding" }}
        secondary={{ label: "Contact sales", to: "/contact" }}
      />
    </MarketingPage>
  );
}
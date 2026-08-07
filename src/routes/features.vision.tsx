import { createFileRoute } from "@tanstack/react-router";
import { Camera, Images, PackageSearch, Receipt, Refrigerator, ScanLine } from "lucide-react";
import {
  MarketingPage,
  PageHero,
  Section,
  FeatureRow,
  FeatureGrid,
  Steps,
  CtaBand,
} from "@/components/marketing/blocks";

export const Route = createFileRoute("/features/vision")({
  head: () => ({
    meta: [
      { title: "Taylor Vision — Scan your fridge, pantry and promotion flyers" },
      {
        name: "description",
        content:
          "Take multiple photos of your fridge, cupboard, shelf or a store flyer. Taylor reads them, updates your pantry and turns what's missing into a shopping list.",
      },
      { property: "og:title", content: "Taylor Vision — Scan and she knows" },
      {
        property: "og:description",
        content: "Multi-photo pantry and fridge scanning that becomes a real shopping list.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://heytaylor.co.za/features/vision" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/features/vision" }],
  }),
  component: VisionFeature,
});

function VisionFeature() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Taylor Vision"
        title={
          <>
            Point. Shoot.{" "}
            <span className="italic text-primary">She already knows.</span>
          </>
        }
        subtitle="Open the camera, capture your fridge, your cupboard shelf and the freezer — then let Taylor read all of it at once and tell you exactly what you're out of."
        secondary={{ label: "All features", to: "/features" }}
      />

      <Section
        eyebrow="How it works"
        title="From a handful of photos to a finished list"
        intro="Vision is built for real kitchens, where the food is spread across three shelves and two doors. Capture as many angles as you need before she analyses anything."
      >
        <Steps
          steps={[
            { title: "Capture", desc: "Take multiple photos in one session — fridge, freezer, pantry, shelf." },
            { title: "Review", desc: "Drop any blurry shots before sending. Nothing is analysed until you're ready." },
            { title: "Analyse", desc: "Taylor identifies items, quantities and what looks close to finished." },
            { title: "Act", desc: "Your pantry updates and the gaps become a shopping list you can price." },
          ]}
        />
      </Section>

      <Section tone="mint" eyebrow="In detail" title="What Taylor can read">
        <div className="space-y-6">
          <FeatureRow
            index="01"
            title="Fridge and pantry stocktakes"
            desc="Instead of typing out fifty items, show her. Taylor recognises common South African grocery brands and staples, and keeps your pantry list current without the admin."
            bullets={[
              "Multi-photo sessions analysed as one stocktake",
              "Recognises brands, packs and rough quantities",
              "Flags what's running low before you run out",
              "Feeds straight into recipe suggestions — cook what you have",
            ]}
          />
          <FeatureRow
            index="02"
            flip
            title="Promotion flyers and shelf specials"
            desc="Snap the leaflet in your postbox or the shelf tag in the aisle. Taylor reads the offer, works out the real unit price, and tells you whether it's actually a deal."
            bullets={[
              "Reads printed flyers, catalogues and shelf tags",
              "Converts specials into comparable per-unit pricing",
              "Cross-checks against the stores you follow",
              "Saves the scan so you can refer back to it later",
            ]}
          />
          <FeatureRow
            index="03"
            title="Scans live in chat and in Vision"
            desc="Every photo you send appears in your Taylor conversation for her to respond to, and is saved in your Vision history so nothing is lost after the reply."
            bullets={[
              "Photos attach to the exact message Taylor answers",
              "Full scan history kept in Taylor Vision",
              "Works from the chat screen or the dedicated Vision tab",
              "Optimised camera UI for iOS and Android safe areas",
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Built for" title="Where people use Vision most">
        <FeatureGrid
          items={[
            { icon: Refrigerator, title: "Sunday fridge check", desc: "One sweep before the weekly shop." },
            { icon: PackageSearch, title: "Pantry top-up", desc: "Know what staples are actually finished." },
            { icon: Receipt, title: "Flyer reading", desc: "Turn a printed special into a priced comparison." },
            { icon: ScanLine, title: "Shelf tags", desc: "Check a deal while standing in the aisle." },
            { icon: Images, title: "Multi-angle scans", desc: "Several photos, one combined result." },
            { icon: Camera, title: "Fast capture", desc: "Big shutter button, thumb-friendly, no fiddling." },
          ]}
        />
      </Section>

      <CtaBand
        title={<>Stop guessing what's <span className="italic text-primary">in the fridge.</span></>}
        desc="Scan once and let Taylor build the list around what you already own."
        secondary={{ label: "Smart lists", to: "/features/lists" }}
      />
    </MarketingPage>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section, FaqList, CtaBand } from "@/components/marketing/blocks";

const shopperFaqs = [
  {
    q: "What exactly is Taylor?",
    a: "Taylor is a shopping companion for South African households. She remembers your home, plans meals, builds shopping lists, compares live retailer prices, keeps your store deals in one place, and answers restaurant and travel questions.",
  },
  {
    q: "Is it free?",
    a: "Yes — free forever for shoppers and free to apply for delivery riders. Stores pay to be listed on the platform.",
  },
  {
    q: "Do I need to install an app?",
    a: "No. Taylor runs in your browser and can be installed to your home screen on iPhone and Android, where she behaves like a normal app.",
  },
  {
    q: "Where do prices come from?",
    a: "Taylor checks the official websites of major South African retailers when you ask, rather than relying on a stale internal price list. If a price can't be confirmed, she says so instead of guessing.",
  },
  {
    q: "Why do my list items need proper measurements?",
    a: "Prices are compared against real products. '2 cups rice' can't be matched to a shelf item, but '2kg rice' can. Taylor keeps recipe measurements as notes and prompts you to set a shoppable quantity before comparing.",
  },
  {
    q: "Can I share a recipe with someone who doesn't use Taylor?",
    a: "Yes. Shared recipe links are public, so anyone can open and read the full ingredients and method.",
  },
];

const privacyFaqs = [
  {
    q: "What does Taylor remember about me?",
    a: "Your profile details (household size, children's ages, dietary needs, province, language), the stores you follow, your lists, pantry and conversation history. You can view, edit and delete this at any time.",
  },
  {
    q: "Is my data sold or shared with advertisers?",
    a: "No. Your household memory is never sold. Stores you follow can send you messages and promotions, but they don't receive your personal profile.",
  },
  {
    q: "How is the platform secured?",
    a: "Authenticated access with no anonymous sign-ups, row-level data isolation so each household and store only sees its own data, strict server-side validation, and regular automated security scanning.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. Contact us and we'll remove your account and associated personal data.",
  },
];

const storeFaqs = [
  {
    q: "How do I list my store?",
    a: "Use the store onboarding wizard. Our admin team reviews every application and activates your portal once approved.",
  },
  {
    q: "How do I load my products?",
    a: "Bulk upload a CSV of your catalogue — up to a thousand products per import. No point-of-sale integration is required.",
  },
  {
    q: "Can I message my followers?",
    a: "Yes. Store owners can broadcast specials and messages directly to their followers' Taylor inbox, with push notifications.",
  },
  {
    q: "How do deliveries work?",
    a: "Riders apply and are verified by our admin team, then follow the stores they want to deliver for. You assign an available rider to a paid order and both parties are notified.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Common questions about Taylor Intelligence" },
      {
        name: "description",
        content:
          "Answers about how Taylor works, what she remembers, where prices come from, privacy and security, and how stores and delivery riders join the platform.",
      },
      { property: "og:title", content: "Taylor Intelligence FAQ" },
      {
        property: "og:description",
        content: "How Taylor works, what she remembers, pricing, privacy, stores and riders.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/faq" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [...shopperFaqs, ...privacyFaqs, ...storeFaqs].map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Everything you might{" "}
            <span className="italic text-primary">want to ask.</span>
          </>
        }
        subtitle="If your question isn't answered here, send it to us — a real person replies."
        secondary={{ label: "Contact us", to: "/contact" }}
      />

      <Section eyebrow="Shoppers" title="Using Taylor day to day">
        <FaqList items={shopperFaqs} />
      </Section>

      <Section tone="mint" eyebrow="Privacy & security" title="Your data, plainly explained">
        <FaqList items={privacyFaqs} />
      </Section>

      <Section eyebrow="Stores & riders" title="Joining the platform">
        <FaqList items={storeFaqs} />
      </Section>

      <CtaBand
        title={<>Still have a <span className="italic text-primary">question?</span></>}
        desc="Send it through and we'll get back to you."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "Get started free", to: "/auth" }}
      />
    </MarketingPage>
  );
}
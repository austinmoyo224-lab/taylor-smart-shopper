import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section } from "@/components/marketing/blocks";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — Taylor Intelligence" },
      {
        name: "description",
        content:
          "The terms that govern use of the Taylor Intelligence shopping companion, store portal and delivery rider platform in South Africa.",
      },
      { property: "og:title", content: "Terms of service — Taylor Intelligence" },
      {
        property: "og:description",
        content: "Terms for shoppers, stores and delivery riders using Taylor Intelligence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/legal/terms" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/legal/terms" }],
  }),
  component: Terms,
});

const sections = [
  {
    h: "1. Agreement",
    p: "By creating an account or using Taylor Intelligence you agree to these terms. If you use the platform on behalf of a business, you confirm that you are authorised to bind that business.",
  },
  {
    h: "2. Accounts",
    p: "You must provide accurate information and keep your login credentials secure. Accounts are personal; store and rider accounts are approved by our team and may be suspended if the information provided is inaccurate or the platform is misused.",
  },
  {
    h: "3. Shoppers",
    p: "Shopper features are provided free of charge. Product suggestions, recipes, prices and travel information are provided for guidance. Prices are gathered from retailer sources at the time you ask and may change; always confirm the price at the till.",
  },
  {
    h: "4. Stores",
    p: "Stores are responsible for the accuracy of their catalogue, promotions, coupon terms, pricing and order fulfilment, and for complying with consumer protection and advertising law. Store status on the platform is managed by Taylor Intelligence.",
  },
  {
    h: "5. Delivery riders",
    p: "Riders must complete verification before accepting orders, and may not alter their own verification status or rating. Riders are responsible for holding any licences and insurance required to operate lawfully.",
  },
  {
    h: "6. Acceptable use",
    p: "Do not misuse the platform: no scraping, reverse engineering, attempting to access other users' data, uploading unlawful content, or using Taylor to send spam or misleading offers.",
  },
  {
    h: "7. Content you provide",
    p: "You keep ownership of the content you upload, including photos and lists. You grant us the licence needed to operate the service — storing, processing and displaying that content back to you and, where you choose to share, to recipients of your shared links.",
  },
  {
    h: "8. Availability and liability",
    p: "We work to keep Taylor available and accurate, but the service is provided as-is. To the extent permitted by law, Taylor Intelligence is not liable for indirect or consequential loss arising from use of the platform, including reliance on prices, product information or travel guidance.",
  },
  {
    h: "9. Termination",
    p: "You may stop using Taylor at any time and request deletion of your account. We may suspend or terminate access where these terms are breached.",
  },
  {
    h: "10. Governing law",
    p: "These terms are governed by the laws of the Republic of South Africa. Questions can be sent to hello@heytaylor.co.za.",
  },
];

function Terms() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        subtitle="The rules for using Taylor Intelligence as a shopper, a store or a delivery rider."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "Privacy policy", to: "/legal/privacy" }}
      />

      <Section>
        <article className="max-w-3xl space-y-8 text-base leading-relaxed text-muted">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {s.h}
              </h2>
              <p className="mt-3">{s.p}</p>
            </section>
          ))}
        </article>
      </Section>
    </MarketingPage>
  );
}
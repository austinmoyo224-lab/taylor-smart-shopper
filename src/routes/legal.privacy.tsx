import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section } from "@/components/marketing/blocks";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — Taylor Intelligence" },
      {
        name: "description",
        content:
          "How Taylor Intelligence collects, uses, stores and protects your personal information, and the rights you have over your data under South African law.",
      },
      { property: "og:title", content: "Privacy policy — Taylor Intelligence" },
      {
        property: "og:description",
        content: "What we collect, why, how it is protected and how to have it removed.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/legal/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/legal/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        subtitle="Plain-language summary of what Taylor Intelligence collects, why we need it, and what control you have."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "Terms of service", to: "/legal/terms" }}
      />

      <Section>
        <article className="prose-taylor max-w-3xl space-y-8 text-base leading-relaxed text-muted">
          <section>
            <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              1. Who we are
            </h2>
            <p className="mt-3">
              Taylor Intelligence operates the shopping companion and retail platform available at
              heytaylor.co.za. Questions about this policy can be sent to hello@heytaylor.co.za.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              2. Information we collect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account information: name, email address, and optionally a mobile number and profile photo.</li>
              <li>Household profile ("Taylor Memory"): province, home language, household size, children's ages and dietary preferences you choose to provide.</li>
              <li>Usage content: your shopping lists, pantry items, saved recipes, photos you scan, and conversations with Taylor.</li>
              <li>Store and rider information: business details submitted during onboarding, and delivery details for verified riders.</li>
              <li>Technical data: device and browser information needed to keep the service secure and working.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              3. How we use it
            </h2>
            <p className="mt-3">
              We use your information to provide the service: to personalise meal and product
              suggestions, build and price shopping lists, deliver messages from stores you follow,
              process orders and deliveries, and keep the platform secure. We do not sell your
              personal information, and we do not rent it to advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              4. Sharing
            </h2>
            <p className="mt-3">
              Stores you follow can send you messages and promotions through the platform, but they
              do not receive your household profile. When you place an order, the store and the
              assigned delivery rider receive only the information needed to fulfil it. We use
              trusted infrastructure and service providers to host data, send notifications, process
              images and look up prices, restaurants and weather on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              5. Security
            </h2>
            <p className="mt-3">
              Access requires authentication; anonymous sign-ups are not permitted. Data is isolated
              at row level so each household, store and rider can only reach their own records.
              Privileged operations are restricted to server-side code, inputs are validated, and the
              platform is scanned for security issues on an ongoing basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              6. Retention and your rights
            </h2>
            <p className="mt-3">
              We keep your information for as long as your account is active. You can view and edit
              your profile and memory at any time in the app, and you may request access to,
              correction of, or deletion of your personal information by contacting us. We will
              respond within a reasonable period as required by the Protection of Personal
              Information Act.
            </p>
          </section>

          <section>
            <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              7. Changes
            </h2>
            <p className="mt-3">
              We may update this policy as the platform grows. Material changes will be communicated
              in the app before they take effect.
            </p>
          </section>
        </article>
      </Section>
    </MarketingPage>
  );
}
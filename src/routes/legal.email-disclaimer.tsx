import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section } from "@/components/marketing/blocks";
import { LegalDoc, LegalLinks, type LegalSection } from "@/components/marketing/legal-doc";


export const Route = createFileRoute("/legal/email-disclaimer")({
  head: () => ({
    meta: [
      { title: "Email disclaimer — Taylor Intelligence" },
      {
        name: "description",
        content:
          "The confidentiality and liability disclaimer applying to all electronic mail and data messages sent by Taylor Intelligence (Pty) Ltd.",
      },
      { property: "og:title", content: "Email disclaimer — Taylor Intelligence" },
      {
        property: "og:description",
        content: "Confidentiality and liability terms for email sent by Taylor Intelligence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/legal/email-disclaimer" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/legal/email-disclaimer" }],
  }),
  component: EmailDisclaimer,
});

const sections: LegalSection[] = [
  {
    h: "Confidentiality",
    p: [
      "Information contained in any electronic mail or data message from us is strictly confidential and solely intended for the person or entity it is addressed to. Unauthorised distribution or use of the electronic mail or data message is strictly forbidden.",
      "If you receive a message from us in error, kindly contact the sender immediately so that the appropriate action can be taken.",
    ],
  },
  {
    h: "Liability",
    p: [
      "Taylor Intelligence (Pty) Ltd, its subsidiaries, associated or affiliated companies, employees and agents shall not be responsible or liable for any costs (including legal costs), losses or damages, whether direct, indirect, consequential or in any other form, caused by incomplete transmission of data, disrupting programs or features, viruses, malware, key loggers, unauthorised monitoring, interception, packet sniffing, disrupting source codes, meta tagging, third-party websites, phishing sites, or any other disabling or destructive forms of data sent or received.",
    ],
  },
  {
    h: "Authority and endorsement",
    p: [
      "Any electronic mail or data message unrelated to the official business activities of Taylor Intelligence (Pty) Ltd or its associated divisions shall not be considered endorsed or ratified by it. No contractual obligation is formed in any manner unless approved by the directors of Taylor Intelligence (Pty) Ltd or its associated divisions.",
    ],
  },
  {
    h: "Applicable law",
    p: [
      "This disclaimer and all procedures of Taylor Intelligence (Pty) Ltd, or any of its associated divisions \u2014 including but not limited to invoicing and administering user accounts \u2014 are subject to the provisions of the Protection of Personal Information Act 4 of 2013 (\u201cPOPI\u201d) and the Consumer Protection Act 68 of 2008 (\u201cCPA\u201d), where applicable.",
    ],
  },
];

function EmailDisclaimer() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="Email disclaimer"
        subtitle="You, as receiver of an electronic mail or data message from Taylor Intelligence, bear the onus to read this disclaimer."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "Privacy policy", to: "/legal/privacy" }}
      >
        <LegalLinks />
      </PageHero>
      <Section>
        <LegalDoc sections={sections} />
      </Section>
    </MarketingPage>
  );
}
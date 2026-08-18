import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section } from "@/components/marketing/blocks";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Website Privacy & POPI Policy — Taylor Intelligence" },
      {
        name: "description",
        content:
          "How Taylor Intelligence collects, uses, stores and protects your personal information, and the rights you have over your data under South African law.",
      },
      { property: "og:title", content: "Website Privacy & POPI Policy — Taylor Intelligence" },
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

const sections: LegalSection[] = [
  {
    h: "1. Who we are",
    p: [
      "Taylor Intelligence (Pty) Ltd (\u201cthe Company\u201d, \u201cwe\u201d, \u201cus\u201d) operates the Taylor shopping companion, store portal and delivery rider platform available at heytaylor.co.za and any related applications (\u201cWebsite(s)\u201d).",
      "The Company respects the privacy of all personal information collected, processed and stored. We handle all personal information received with due care and provide the security necessary to safeguard the information we hold. Our internal systems allow us to react proactively to a breach of any kind, and our POPI policy requires us to report any material breach to the Information Regulator.",
    ],
  },
  {
    h: "2. Cookies and similar technologies",
    p: [
      "We use cookies, pixels and similar technologies (collectively \u201ccookies\u201d) to recognise your browser or device and to provide essential features and services, including:",
    ],
    list: [
      "Recognising you when you sign in, so we can provide personalised features and services.",
      "Research and diagnostics to improve our content, products and services.",
      "Preventing fraudulent activity.",
      "Improving security.",
      "Delivering content, including offers, relevant to your interests.",
      "Reporting, so we can measure and analyse the performance of our services.",
    ],
    sub: [
      {
        h: "Managing cookies",
        p: [
          "You can manage cookies through your browser settings, including preventing new cookies, being notified when a cookie is received, disabling cookies and setting when cookies expire. If you disable all cookies, neither the Company nor its third parties will transfer cookies to your browser, but you may need to adjust preferences on each visit and some features may not work.",
        ],
      },
    ],
  },
  {
    h: "3. Our privacy practices",
    list: [
      "Personal information is collected only when knowingly and voluntarily submitted.",
      "Personal information is used only for the purpose for which it was collected, or a related secondary purpose.",
      "In addition to disclosures you consent to, personal information may be disclosed where we reasonably believe it necessary to identify or act against anyone damaging or interfering with our rights, property, users or anyone else who could be harmed.",
      "We may engage third parties to provide goods or services on our behalf and may disclose personal information to them for that purpose.",
      "Information uploaded to our Website(s) is stored on a secure server and used for limited purposes, such as future communications you may always unsubscribe from.",
      "We do not sell, rent or disseminate your personal information to third parties without your consent, unless compelled to do so by law.",
      "While all reasonable efforts are taken to protect information travelling over the internet, absolute security cannot be guaranteed for reasons beyond our control.",
    ],
  },
  {
    h: "4. Information we collect",
    p: ["If you register as a user we may require personal information including, but not limited to:"],
    list: [
      "Your full name and surname.",
      "Company or business details, where you register a store.",
      "Your email address and mobile number.",
      "Your physical or delivery address.",
      "Your identification and/or passport number, where required for verification (for example, delivery riders).",
      "Household profile information you choose to give Taylor: province, home language, household size, children\u2019s ages and dietary preferences.",
      "Usage content: shopping lists, pantry items, saved recipes, photographs you scan, orders and conversations with Taylor.",
      "Technical data: device and browser information needed to keep the service secure and working.",
    ],
    sub: [
      {
        h: "Accuracy",
        p: [
          "Where you choose to provide additional personal information, you agree to provide accurate and current information and not to impersonate or misrepresent any person or entity. Should your personal information change, please update it in the app or inform us as soon as reasonably possible.",
        ],
      },
    ],
  },
  {
    h: "5. Purpose of collecting",
    p: ["Subject to your consent, we gather, process and store your personal information in order to:"],
    list: [
      "Complete registration for the services on offer.",
      "Complete the verification checks required to activate a store or delivery rider account.",
      "Maintain a database of client-provided information to allow access during service delivery and to meet our legal information-retention obligations.",
      "Provide the services: personalise meal and product suggestions, build and price shopping lists, deliver messages from stores you follow, and process orders and deliveries.",
      "Contact you about current or new services, features, special offers and promotional competitions offered by us, our divisions, affiliates or partners, where you have opted in.",
      "Improve our service selection and your experience on our Website(s).",
    ],
  },
  {
    h: "6. Disclosing information",
    p: ["We may disclose your personal information to:"],
    list: [
      "Our employees and third-party service providers who help us interact with you, take orders and deliver services.",
      "Our divisions, affiliates and partners for marketing communications, only where you have opted in.",
      "Law enforcement, government officials, fraud detection agencies or other third parties where we believe in good faith that disclosure is necessary to prevent physical harm or financial loss, or to report or support the investigation of suspected illegal activity.",
      "Service providers under contract with us for parts of our business operations (fraud prevention, marketing, specialised services, technology services), who may use the information only for the services they perform for us.",
      "Stores and delivery riders, limited to the information needed to fulfil an order you place. Stores you follow may message you through the platform but do not receive your household profile.",
    ],
    sub: [
      {
        h: "Legal disclosure",
        p: [
          "We may use or disclose personal information where required to comply with any applicable law, subpoena, court order or legal process, or to protect and defend our rights or property, including in the case of fraudulent online payment.",
          "All employees, service providers, divisions, affiliates and partners with access to your personal information are bound by appropriate and legally binding confidentiality obligations.",
        ],
      },
    ],
  },
  {
    h: "7. Ratings and reviews",
    p: [
      "When you provide a rating, testimonial or review of a service or product, you consent to us using it as we deem fit, including on our Website(s), in newsletters or other marketing material. The details displayed alongside a rating are your first name, last name, the service or product, and the date. Your contact details are never displayed. If you do not agree to this, please do not submit ratings or reviews, or contact us immediately.",
    ],
  },
  {
    h: "8. Safeguarding your information",
    p: ["We will:"],
    list: [
      "Treat your personal information as strictly confidential, save where we are entitled to share it as set out in this policy.",
      "Take appropriate technical and organisational measures to protect it against unauthorised or unlawful processing, accidental loss, destruction, damage, alteration, disclosure or access.",
      "Provide you with access to view and update your personal details.",
      "Promptly notify you if we become aware of any unauthorised use, disclosure or processing of your personal information.",
      "Provide reasonable evidence of our compliance with this policy on reasonable notice and request.",
      "On request, promptly return or destroy personal information in our possession or control, save for what we are legally obliged to retain.",
      "Not retain your personal information longer than the period for which it was originally needed, unless required by law or you consent to a longer period.",
    ],
    sub: [
      {
        h: "Technical measures in the platform",
        list: [
          "PostgreSQL with row-level security on every public table, so households, stores and riders can reach only their own records.",
          "Email, phone OTP and Google authentication; no anonymous sign-ups.",
          "Role-based access control through a separate roles table and security-definer functions.",
          "Privileged service credentials restricted to verified server-side handlers.",
          "Input validation on all server functions and API routes.",
          "Admin-only verification workflows for stores and delivery riders.",
          "Regular dependency and security scanning.",
        ],
      },
    ],
  },
  {
    h: "9. Transborder flows",
    p: [
      "The Company stores information using cloud-based business solutions whose servers may be located outside South Africa, so there may be a transborder flow of personal information. These providers are selected for their security and contractual data protection commitments.",
    ],
  },
  {
    h: "10. Your rights",
    p: [
      "You may request access to the personal information we hold about you, request correction or deletion where we are no longer authorised to retain it, object to processing on reasonable grounds, object to direct marketing, and complain to the Information Regulator. Requests should be sent to the Information Officer using the details below and are handled in accordance with our PAIA Manual and POPI Policy.",
    ],
  },
  {
    h: "11. Undertakings and limitation of liability",
    p: [
      "We undertake never to sell or make your personal information available to any third party other than as provided for in this policy. While we will do all things reasonably necessary to protect your privacy rights, we cannot guarantee or accept liability for unauthorised or unlawful disclosures made by third parties who are not subject to our control, unless such disclosure results from our gross negligence.",
      "WE SHALL NOT BE LIABLE FOR ANY LOSS OR DAMAGE, HOWSOEVER ARISING, SUFFERED BY YOU AS A RESULT OF THE DISCLOSURE OF INFORMATION TO A THIRD PARTY, because we do not regulate or control how that third party uses your personal information. You should always read the privacy policy of any third party.",
    ],
  },
  {
    h: "12. Changes to this policy",
    p: [
      "We may update this policy as the platform grows. Material changes will be communicated in the app or on our Website(s) before they take effect.",
    ],
  },
];

function Privacy() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="Website Privacy & POPI Policy"
        subtitle="What Taylor Intelligence collects, why we need it, how it is protected and what control you have under the Protection of Personal Information Act."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "POPI policy", to: "/legal/popi" }}
      />

      <Section>
        <LegalDoc sections={sections} />
      </Section>
    </MarketingPage>
  );
}
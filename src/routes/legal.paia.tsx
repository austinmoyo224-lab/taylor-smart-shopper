import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section } from "@/components/marketing/blocks";
import { COMPANY, LegalDoc, LegalLinks, type LegalSection } from "@/components/marketing/legal-doc";


export const Route = createFileRoute("/legal/paia")({
  head: () => ({
    meta: [
      { title: "PAIA Manual — Taylor Intelligence" },
      {
        name: "description",
        content:
          "Taylor Intelligence's manual in terms of section 51 of the Promotion of Access to Information Act: how to request records, categories of data subjects, records held, transborder flows and security measures.",
      },
      { property: "og:title", content: "PAIA Manual — Taylor Intelligence" },
      {
        property: "og:description",
        content: "How to request access to records held by Taylor Intelligence (Pty) Ltd.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/legal/paia" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/legal/paia" }],
  }),
  component: Paia,
});

const sections: LegalSection[] = [
  {
    h: "1. Purpose of this manual",
    p: ["This PAIA Manual enables members of the public to:"],
    list: [
      "Access the contact details of the Information Officer who will assist with records they intend to access.",
      "Understand how to make a request for access to a record of the body.",
      "Understand the purpose of processing personal information and the categories of data subjects and information relating to them.",
      "Know the description of the records of the body available in accordance with other legislation.",
      "Know the recipients, or categories of recipients, to whom personal information may be supplied.",
      "Know whether the body plans to transfer or process personal information outside the Republic of South Africa.",
      "Know whether appropriate security measures ensure the confidentiality, integrity and availability of personal information processed.",
      "Know the description of the Regulator\u2019s guide on how to use PAIA and how to obtain access to it.",
    ],
  },
  {
    h: "2. Company and Information Officer",
    list: [
      `Name: ${COMPANY.name}`,
      `Registration number: ${COMPANY.reg}`,
      `Registered address: ${COMPANY.address}`,
      `Telephone: ${COMPANY.phone}`,
      `Email: ${COMPANY.email}`,
      `Website: ${COMPANY.website}`,
      `Information Officer: ${COMPANY.informationOfficer}`,
      "Deputy Information Officer: not applicable.",
    ],
  },
  {
    h: "3. Accessing records",
    p: [
      "Unless you are requesting access to your own information, you are not automatically allowed access to company records, and the Information Officer has the right to refuse a request in terms of sections 62 to 70 of Chapter 4 of PAIA.",
    ],
    sub: [
      {
        h: "Process",
        list: [
          "The requester must complete Form 02, available on the Information Regulator\u2019s website, or request the form from us.",
          "The completed form must be submitted to the Information Officer by email using the address indicated above.",
          "The Information Officer may require payment of the prescribed fee (if any) before processing the request further.",
          "Once a decision has been made, the requester is notified in the required form.",
          "If the request is granted, an access fee is payable for the search, reproduction, preparation and any time exceeding the prescribed hours.",
        ],
      },
      {
        h: "Appeal",
        list: [
          "The Company is not a public body and therefore has no internal appeal process.",
          "If a request is refused and you are unhappy with the reason, you may lodge a complaint with the Information Regulator, or apply to the relevant court within 30 days of the refusal.",
        ],
      },
    ],
  },
  {
    h: "4. Categories of data subjects and information processed",
    sub: [
      {
        h: "Employees",
        p: [
          "Name and surname, next-of-kin details, ID or passport copies, email and contact number, address, medical aid, criminal record checks and emergency contact numbers \u2014 processed for payroll, human resources and the management of employment records.",
        ],
      },
      {
        h: "Retail and FMCG companies (stores)",
        p: [
          "Business name, address, contact number, VAT number, company registration number and tax clearance \u2014 processed for invoicing and billing, rendering services, customer service, and managing procurement contracts, payments and orders.",
        ],
      },
      {
        h: "Suppliers",
        p: [
          "Branding and company details, inventory lists, cellphone and work telephone numbers, email addresses, social media handles, contact details and VAT number \u2014 processed for invoicing and billing.",
        ],
      },
      {
        h: "Customers and end users",
        p: [
          "Email address, display name, password or secure authentication credentials, and records relating to account creation, verification, login and security \u2014 processed for service delivery. Where a user chooses to provide it, household profile information and content such as shopping lists, pantry items, recipes and scanned photographs are processed to personalise the service.",
        ],
      },
      {
        h: "Delivery riders",
        p: [
          "Identity and contact details, vehicle information and verification documents \u2014 processed to verify riders and to assign and complete deliveries.",
        ],
      },
    ],
  },
  {
    h: "5. Records held in terms of legislation",
    p: ["These records are available on request, but not all are available to the public."],
    list: [
      "Companies Act: CIPC registration documents, MOI, shareholder agreements, financial statements, resolutions and minutes, accounting records, records of directors, securities register and beneficial ownership.",
      "Income Tax and VAT Acts: SARS registration, VAT statements, income tax statements and SARS returns.",
      "POPIA: internal POPI policy, privacy policy and this PAIA Manual.",
      "Basic Conditions of Employment Act: employee records.",
    ],
  },
  {
    h: "6. Distribution and sharing of information",
    list: [
      "Data subject information is shared only as directed in terms of law or with express consent.",
      "Employees are made aware that their information may be distributed to accounting firms for payroll services.",
    ],
  },
  {
    h: "7. Planned transborder flows",
    p: [
      "The Company stores information using cloud-based business solutions whose servers are located outside South Africa, so there may be a transborder flow of personal information. These third-party business solutions are secure and are selected for their security and data-protection commitments. They include cloud hosting and database infrastructure, authentication and email delivery services, model providers used to power Taylor\u2019s companion features, mapping and location services, storage and productivity suites, design tools, social and messaging platforms, file transfer services, video conferencing, domain and website services, and payment providers.",
    ],
  },
  {
    h: "8. Security measures to protect information",
    list: [
      "Secure backend and frontend servers, and secure data storage.",
      "PostgreSQL with row-level security on every public table.",
      "Email, phone OTP and Google authentication; no anonymous sign-ups.",
      "Role-based access control via a separate user roles table and security-definer functions.",
      "Privileged service credentials restricted to verified server-side handlers.",
      "Input validation on all server functions and API routes.",
      "Admin-only verification workflows for stores and delivery riders.",
      "Dependency and security scans run regularly; no high or critical dependency vulnerabilities at the time of writing.",
    ],
  },
  {
    h: "9. Guide on how to use the Act",
    p: [
      "The Regulator has, in terms of section 10(1) of PAIA, updated and made available a revised Guide on how to use PAIA in an easily comprehensible form. The Guide describes the objects of PAIA and POPIA; the contact details of Information Officers and Deputy Information Officers of public and private bodies; the manner and form of requests for access to records of public bodies (section 11) and private bodies (section 50); the assistance available from Information Officers and from the Regulator; and all remedies in law, including internal appeals, complaints to the Regulator and applications to court. It also covers the requirement in sections 14 and 51 to compile a manual, the voluntary disclosure provisions of sections 15 and 52, the fee notices issued under sections 22 and 54, and the regulations made under section 92. The Guide can be obtained from the Information Regulator\u2019s website.",
    ],
  },
  {
    h: "10. Updating of the manual",
    p: ["This manual is revised annually and updated where necessary."],
  },
];

function Paia() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="PAIA Manual"
        subtitle="Our manual in terms of section 51 of the Promotion of Access to Information Act 2 of 2000 — how to request records, what we hold, and how your information is protected."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "POPI policy", to: "/legal/popi" }}
      >
        <LegalLinks />
      </PageHero>
      <Section>
        <LegalDoc sections={sections} />
      </Section>
    </MarketingPage>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section } from "@/components/marketing/blocks";
import { LegalDoc, LegalLinks, type LegalSection } from "@/components/marketing/legal-doc";


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

const sections: LegalSection[] = [
  {
    h: "1. Introduction",
    p: [
      "Our Website(s) can be accessed at heytaylor.co.za and are owned and operated by Taylor Intelligence (Pty) Ltd (\u201cTaylor Intelligence\u201d, \u201cwe\u201d, \u201cus\u201d, \u201cour\u201d).",
      "These Terms and Conditions govern the ordering, sale and delivery of services and/or goods and the use of our Website(s). They are binding and enforceable against every person who accesses or uses our Website(s) (\u201cyou\u201d, \u201cyour\u201d, \u201cuser\u201d), including every registered user. By using our Website(s), or by clicking \u201cRegister\u201d or \u201cSign up\u201d, you acknowledge that you have read and agree to be bound by these Terms and Conditions.",
      "By agreeing to these Terms you also consent to the policies made available on our Website(s), which are incorporated by reference: the Website Privacy & POPI Policy, the POPI Policy and Breach Protocol, the PAIA Manual and any other policy published from time to time.",
      "Taylor Intelligence allows approved third-party providers, including retail stores and delivery riders, to list and sell their services and goods on our Website(s) (each a \u201cThird Party Seller\u201d). Certain clauses apply only to purchases from Third Party Sellers and others only to purchases from Taylor Intelligence.",
    ],
  },
  {
    h: "2. Important notice",
    p: [
      "These Terms and Conditions apply to users who are consumers for purposes of the Consumer Protection Act 68 of 2008 (\u201cCPA\u201d) and set out compliance measures in terms of the Protection of Personal Information Act 4 of 2013 (\u201cPOPI\u201d).",
      "These Terms contain provisions that may limit the risk or liability of Taylor Intelligence or a third party, create risk or liability for the user, require the user to indemnify Taylor Intelligence or a third party, or serve as an acknowledgement of fact by the user. Your attention is specifically drawn to these provisions.",
      "If there is any provision you do not understand, it is your responsibility to ask us to explain it before accepting these Terms or continuing to use our Website(s). Nothing in these Terms is intended to unlawfully restrict, limit or avoid any right or obligation created for either you or Taylor Intelligence in law.",
      "BY USING OUR WEBSITE(S) IN ANY WAY, YOU SHALL BE DEEMED TO HAVE ACCEPTED ALL THE TERMS AND CONDITIONS UNCONDITIONALLY. You must not use our Website(s) if you do not agree to them.",
    ],
  },
  {
    h: "3. Shoppers, stores and delivery riders",
    list: [
      "Shopper features are provided free of charge. Product suggestions, recipes, price comparisons, restaurant and travel information are provided for guidance only. Prices shown may be estimates or store-supplied catalogue prices and may change \u2014 always confirm the price in-store or in the retailer\u2019s own app.",
      "Stores are responsible for the accuracy of their catalogue, promotions, coupon terms, pricing and order fulfilment, and for complying with consumer protection and advertising law. Store status on the platform is managed by Taylor Intelligence.",
      "Delivery riders must complete verification before accepting orders and may not alter their own verification status or rating. Riders are responsible for holding any licences, permits and insurance required to operate lawfully.",
      "You must provide accurate information and keep your login credentials secure. Store and rider accounts are approved by our team and may be suspended where information is inaccurate or the platform is misused.",
    ],
  },
  {
    h: "4. Refunds",
    list: [
      "This policy applies to the return of goods and/or services bought from Taylor Intelligence by you (\u201cthe consumer\u201d).",
      "Taylor Intelligence does not provide refunds unless in accordance with applicable legal provisions, and may instead offer credit on your account to be used on future services. We reserve the right to determine the value of such credit.",
      "All refunds are subject to internal anti-money-laundering protocols and may be subject to incidental costs (for example bank charges), which will be withheld from the refund amount.",
      "You must present your original tax invoice or other proof of purchase when returning services and/or goods.",
      "Where goods or services are not defective, or where you have no statutory right of return, we may in our sole discretion elect to accept a return and replace the item or refund you. Doing so is in good faith and is not an admission of liability.",
      "All refunds will be processed within 30 days of receiving the required documentation from the client.",
    ],
  },
  {
    h: "5. Returns for unsafe or defective goods",
    list: [
      "If within 6 months of delivery you find goods to be faulty, not commercially acceptable or unsuitable for their generally intended purpose, you may contact us to arrange collection and inspection.",
      "If the goods are unsafe or defective you may request, at your choice and at our expense, that they be repaired, replaced or refunded. If they are not found to be unsafe or defective, you will be liable for the costs of collection and inspection.",
      "We reserve the right to send returned goods for technical assessment before repairing, replacing or refunding them. Repairs carry a further 3-month warranty from the date of repair, and further failure within that period entitles you to a replacement or refund.",
      "Goods will not be considered defective where you were expressly informed they were offered in a specific condition and you expressly agreed to accept them in that condition.",
      "Goods and services purchased as a result of direct marketing may be returned provided you notify us within 5 business days of delivery and return them, at your risk and expense, within 10 business days of delivery.",
      "We will accept returns where you had no reasonable opportunity to examine the goods before delivery and reject them, where your order was mixed with items you did not order, or where the goods are not suitable for a specified purpose communicated to and accepted by us \u2014 provided they are returned within 10 business days of delivery.",
      "A reasonable charge may be imposed where goods are not in their original or saleable condition, packaging has been re-marked, damaged or defaced, work has already started on a service, or goods have been consumed beyond what is reasonably necessary to determine acceptability.",
      "No returns will be accepted where return is prohibited for public health or regulatory reasons, where the consumer simply had a change of heart, where the product or service was created specifically for the consumer, or where goods have been altered contrary to instructions, disassembled, permanently installed, or combined with other goods.",
    ],
  },
  {
    h: "6. Conclusion of sales and availability of stock",
    list: [
      "Registered users may place orders which Taylor Intelligence or the Third Party Seller may accept or reject, depending on availability, the correctness of the information relating to the item (including price) and receipt of payment or payment authorisation.",
      "Acceptance of your order is indicated by delivery or by making the services and/or goods available for collection, and only at that point does an agreement of sale come into effect \u2014 regardless of any earlier confirmation of order or payment. Rejected orders are cancelled and any amount already paid is credited or refunded.",
      "You may cancel an order at any time before receiving a dispatch or delivery notice. After delivery or collection, items may only be returned in accordance with the returns provisions above.",
      "Stock is limited and pricing may change without notice. Where an item is no longer available after you have ordered it, you are entitled to a credit or a refund of any amount already paid.",
      "For items sold by a Third Party Seller we rely on inventory information supplied by that seller and bear no liability for inaccuracies in it.",
      "Certain services and goods may not be purchased for resale. If we suspect resale, we may cancel your order immediately on notice to you.",
    ],
  },
  {
    h: "7. Errors",
    p: [
      "Information on our Website(s) and services provided by our employees, subcontractors, agents or representatives are presented \u201cas is\u201d and may include technical or typographical inaccuracies. We may make additions, deletions or modifications at any time without prior notification.",
      "We take all reasonable efforts to accurately reflect descriptions, availability, prices and delivery charges. Should there be errors that are not due to our gross negligence, we shall not be liable for any loss, claim or expense relating to a transaction based on that error, save \u2014 in the case of an incorrect price \u2014 to the extent of refunding any amount already paid. We are not bound by incorrect information about our services displayed on third-party websites.",
    ],
  },
  {
    h: "8. Changes to these Terms and Conditions",
    p: [
      "We may change these Terms and Conditions at any time in our sole discretion. It is your responsibility to check them regularly. Changes apply to your use of our Website(s) after they are displayed, and continued use will be deemed acceptance of the changes.",
    ],
  },
  {
    h: "9. Electronic communications",
    p: [
      "When you visit our Website(s) or email us, you will be asked to consent to receiving communications from us, our divisions, affiliates or partners electronically in accordance with our privacy policy. Consent may be revoked at any time by written notice, or by using the \u201cunsubscribe\u201d feature in our communications.",
    ],
  },
  {
    h: "10. Ownership and copyright",
    p: [
      "The contents of our Website(s) \u2014 including material, information, data, software, icons, text, graphics, layouts, images, sound clips, video clips, trade names, logos, trademarks, designs and service marks (\u201cWebsite Content\u201d) \u2014 are protected by law, including copyright and trademark law, and are the property of Taylor Intelligence, its advertisers or sponsors, or are licensed to Taylor Intelligence.",
      "You acquire no right, title or interest in our Website(s) or Website Content. Any use, distribution or reproduction is prohibited unless expressly authorised in these Terms or otherwise provided for in law. Where content is licensed to us or belongs to a third party, your use is also subject to that licensor\u2019s terms.",
      "You retain ownership of content you upload, including photographs, lists and recipes, and grant us the licence needed to operate the service \u2014 storing, processing and displaying that content back to you and, where you choose to share it, to the recipients of your shared links.",
    ],
  },
  {
    h: "11. Disclaimer",
    p: [
      "Use of our Website(s) is entirely at your own risk and you assume full responsibility for any risk or loss resulting from use of, or reliance on, information on our Website(s).",
      "While we take reasonable measures to ensure our content is accurate and complete, we make no representations or warranties, express or implied, as to the quality, timeliness, operation, integrity, availability or functionality of our Website(s) or the accuracy, completeness or reliability of any information on them. We reject liability for any damage, loss or expense, whether direct, indirect or consequential, arising out of or in connection with your access to or use of our Website(s), unless otherwise provided by law.",
      "Views or statements expressed on our Website(s) are not necessarily those of Taylor Intelligence, its directors, employees or agents. We also make no warranty that information or files available on our Website(s) are free of viruses, spyware, malware, trojans or other destructive code, save where such risk arises from our gross negligence or wilful misconduct.",
    ],
  },
  {
    h: "12. Linking to third-party websites",
    p: [
      "Our Website(s) may contain links or references to other websites (\u201cThird Party Websites\u201d) outside our control, including those of advertisers, retailers and payment providers. These Terms do not apply to them and we are not responsible for their practices, privacy policies or cookies. Your use of Third Party Websites is entirely at your own risk.",
    ],
  },
  {
    h: "13. Limitation of liability and indemnity",
    p: [
      "Taylor Intelligence cannot be held liable for any inaccurate information or incorrect prices published on our Website(s), save where such liability arises from our gross negligence or wilful misconduct. You are encouraged to report any malfunctions or errors to us.",
      "TAYLOR INTELLIGENCE SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL LOSS OR DAMAGES ARISING FROM YOUR USE OF, OR RELIANCE UPON, OUR WEBSITE(S) OR THEIR CONTENT, YOUR INABILITY TO USE OUR WEBSITE(S), OR ANY UNLAWFUL ACTIVITY ON OUR WEBSITE(S) OR ANY LINKED THIRD-PARTY WEBSITE.",
      "YOU HEREBY INDEMNIFY TAYLOR INTELLIGENCE AGAINST ANY LOSS, CLAIM OR DAMAGE SUFFERED BY YOURSELF OR ANY THIRD PARTY ARISING IN ANY WAY FROM YOUR USE OF OUR WEBSITE(S), ANY LINKED THIRD-PARTY WEBSITE, OR ANY CONSULTATION OFFERED BY TAYLOR INTELLIGENCE, WHETHER TELEPHONIC, FACE TO FACE OR BY ELECTRONIC COMMUNICATION.",
    ],
  },
  {
    h: "14. Acceptable use",
    p: [
      "Do not misuse the platform: no scraping, reverse engineering, attempting to access other users\u2019 data, uploading unlawful content, or using Taylor to send spam or misleading offers.",
    ],
  },
  {
    h: "15. Availability and termination",
    p: [
      "We will use reasonable endeavours to maintain the availability of our Website(s), except during scheduled maintenance, and are entitled to discontinue them or any part of them with or without notice. We may terminate, suspend or modify our Website(s) in our sole discretion and will not be liable for doing so, other than for processing orders placed before that time to the extent possible.",
      "Failure to comply with your obligations under these Terms, including payment for any order, may lead to suspension or termination of your access without prejudice to any claim we may have against you. We are entitled, to prevent suspected fraud or abuse, to blacklist you on our database, refuse to process payment, or cancel an order in whole or in part on notice to you.",
      "You may stop using our Website(s) at any time and request deletion of your account.",
    ],
  },
  {
    h: "16. Governing law and jurisdiction",
    p: [
      "These Terms, our relationship and any dispute arising from them are governed and interpreted in accordance with the laws of the Republic of South Africa. Your continued use of our Website(s) constitutes consent and submission to the jurisdiction of the South African courts.",
      "IN THE EVENT OF ANY DISPUTE BETWEEN YOU AND TAYLOR INTELLIGENCE, YOU CONSENT TO THE JURISDICTION OF THE MAGISTRATES\u2019 COURT OF THE REPUBLIC OF SOUTH AFRICA NOTWITHSTANDING THAT THE QUANTUM OF THE ACTION MAY OTHERWISE EXCEED THE MONETARY JURISDICTION OF THAT COURT. Nothing in this clause limits your right to approach any court, tribunal or forum of competent jurisdiction.",
    ],
  },
  {
    h: "17. ECT Act information and PAIA",
    p: [
      "The information below is provided for the purposes of the Electronic Communications and Transactions Act 25 of 2002 and should be read together with our product descriptions and other terms published on our Website(s). The manual published in terms of section 51 of the Promotion of Access to Information Act 2 of 2000 is available on our Website(s).",
    ],
  },
];

function Terms() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        subtitle="Website terms and conditions governing the use of Taylor Intelligence as a shopper, a store or a delivery rider."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "Privacy policy", to: "/legal/privacy" }}
      >
        <LegalLinks />
      </PageHero>

      <Section>
        <LegalDoc
          intro={
            <p>
              PLEASE READ THESE TERMS AND CONDITIONS BEFORE CONTINUING TO BROWSE OR USE OUR
              WEBSITE(S). BY USING ANY OF OUR WEBSITE(S) YOU AGREE TO BE BOUND BY ALL TERMS AND
              CONDITIONS, INCLUDING ANY PRIVACY STATEMENTS INCORPORATED INTO THEM AND ANY AMENDMENTS
              THERETO. IF YOU DO NOT AGREE, YOU MUST IMMEDIATELY CEASE BROWSING OUR WEBSITE(S).
            </p>
          }
          sections={sections}
        />
      </Section>
    </MarketingPage>
  );
}
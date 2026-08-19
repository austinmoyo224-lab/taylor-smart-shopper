import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, PageHero, Section } from "@/components/marketing/blocks";
import { LegalDoc, LegalLinks, type LegalSection } from "@/components/marketing/legal-doc";


export const Route = createFileRoute("/legal/popi")({
  head: () => ({
    meta: [
      { title: "POPI Policy & Breach Protocol — Taylor Intelligence" },
      {
        name: "description",
        content:
          "Taylor Intelligence's Protection of Personal Information Act policy: guiding principles, data subject rights, information officer duties, complaints procedure and personal data breach protocol.",
      },
      { property: "og:title", content: "POPI Policy & Breach Protocol — Taylor Intelligence" },
      {
        property: "og:description",
        content: "How we comply with POPIA, and exactly what happens if personal data is breached.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/legal/popi" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/legal/popi" }],
  }),
  component: Popi,
});

const sections: LegalSection[] = [
  {
    h: "1. Introduction",
    p: [
      "The right to privacy is an integral human right recognised and protected in the South African Constitution and in the Protection of Personal Information Act 4 of 2013 (\u201cPOPI Act\u201d).",
      "The POPI Act promotes the protection of privacy through guiding principles applied to the processing of personal information in a context-sensitive manner. Through the provision of quality goods and services, Taylor Intelligence (\u201cthe organisation\u201d) is necessarily involved in the collection, use and disclosure of personal information of clients, customers, employees and other stakeholders, and is committed to managing that information in accordance with the POPI Act.",
    ],
  },
  {
    h: "2. Definitions",
    list: [
      "Personal information: any information that can be used to reveal a person\u2019s identity, relating to an identifiable living natural person and, where applicable, an identifiable existing juristic person \u2014 including race, gender, sex, pregnancy, marital status, origin, colour, sexual orientation, age, health, disability, religion, belief, culture, language and birth; education, medical, financial, criminal or employment history; identifying numbers, symbols, email addresses, physical addresses, telephone numbers, location information and online identifiers; biometric information; personal opinions, views or preferences; private correspondence; the views of others about the person; and the person\u2019s name where it appears with other personal information.",
      "Data subject: the natural or juristic person to whom personal information relates.",
      "Responsible party: the entity that determines the purpose of and means for processing the personal information \u2014 in this case, the organisation.",
      "Operator: a person who processes personal information for a responsible party in terms of a contract or mandate, without coming under that party\u2019s direct authority.",
      "Information Officer: the person responsible for ensuring compliance with the POPI Act, registered with the Information Regulator. Where none is appointed, the head of the organisation fulfils these duties. Deputy Information Officers may be appointed to assist.",
      "Processing: any operation concerning personal information, including collection, receipt, recording, organisation, storage, updating, retrieval, use, dissemination, merging, linking, restriction, degradation, erasure or destruction.",
      "Record: any recorded information regardless of form or medium, including writing, electronically stored data, labels, books, maps, plans, photographs, film and recordings.",
      "Filing system: any structured set of personal information, whether centralised, decentralised or dispersed, accessible according to specific criteria.",
      "Unique identifier, de-identify, re-identify, direct marketing and biometrics bear the meanings given to them in the POPI Act.",
    ],
  },
  {
    h: "3. Policy purpose",
    p: [
      "This policy protects the organisation from the compliance risks associated with the POPI Act, including breaches of confidentiality, failing to offer choice, and reputational damage.",
      "It demonstrates the organisation\u2019s commitment to protecting the privacy rights of data subjects by stating desired behaviour, cultivating a culture that recognises privacy as a valuable human right, implementing internal controls to manage compliance risk, creating business practices that balance data subject rights with legitimate business needs, and assigning specific duties to control owners including the Information Officer.",
    ],
  },
  {
    h: "4. Policy application",
    p: [
      "This policy applies to the organisation\u2019s governing body, all business units and divisions, all employees and volunteers, and all contractors, suppliers and other persons acting on behalf of the organisation. It must be read together with the POPI Act and the organisation\u2019s PAIA Manual.",
      "The duty to comply is activated wherever there is processing of personal information entered into a record by or for a responsible party domiciled in South Africa. The Act does not apply where processing is concluded in the course of purely personal or household activities, or where the personal information has been de-identified.",
    ],
  },
  {
    h: "5. Rights of data subjects",
    list: [
      "The right to access personal information the organisation holds about them.",
      "The right to have personal information corrected or deleted where the organisation is no longer authorised to retain it.",
      "The right to object, on reasonable grounds, to the processing of their personal information.",
      "The right to object to processing for purposes of direct marketing by unsolicited electronic communications.",
      "The right to complain to the Information Regulator and to institute civil proceedings regarding alleged non-compliance.",
      "The right to be informed that personal information is being collected, and to be notified where there are reasonable grounds to believe it has been accessed or acquired by an unauthorised person.",
    ],
  },
  {
    h: "6. General guiding principles",
    sub: [
      {
        h: "Accountability",
        p: [
          "The protection of personal information is everybody\u2019s responsibility. The organisation encourages desired behaviour and will take appropriate sanctions, including disciplinary action, against individuals who through intentional or negligent acts or omissions fail to comply with this policy.",
        ],
      },
      {
        h: "Processing limitation",
        p: [
          "Personal information under the organisation\u2019s control is processed in a fair, lawful and non-excessive manner, only with the informed consent of the data subject, and only for a specifically defined purpose. Personal information is not distributed between separate legal entities or individuals who are not directly involved in facilitating the purpose for which it was collected.",
        ],
      },
      {
        h: "Purpose specification and further processing",
        p: [
          "Personal information is processed only for specific, explicitly defined and legitimate reasons communicated to data subjects beforehand. It will not be processed for an incompatible secondary purpose without additional consent.",
        ],
      },
      {
        h: "Information quality",
        p: [
          "The organisation takes reasonable steps to ensure that personal information collected is complete, accurate and not misleading, verifying accuracy directly with data subjects or through independent sources where information is received from third parties.",
        ],
      },
      {
        h: "Open communication",
        p: [
          "The organisation maintains a \u201ccontact us\u201d facility for data subjects who want to enquire whether we hold their personal information, request access, request an update or correction, or complain about processing.",
        ],
      },
      {
        h: "Security safeguards",
        p: [
          "Security controls minimise the risk of loss, unauthorised access, disclosure, interference, modification or destruction, applied in a context-sensitive manner \u2014 the more sensitive the information, the greater the security. Controls are reviewed continuously, including regular testing of measures against cyber-attack. Employees sign contractual confidentiality terms, and operators and third-party service providers enter into agreements committing both parties to lawful processing.",
        ],
      },
      {
        h: "Data subject participation",
        p: [
          "Data subjects may request correction or deletion of their personal information, and every electronic newsletter or marketing communication includes an unsubscribe facility.",
        ],
      },
    ],
  },
  {
    h: "7. Information Officer",
    p: [
      "The organisation appoints an Information Officer, and where necessary a Deputy Information Officer, responsible for ensuring compliance with POPIA. Where none is appointed, the head of the organisation assumes the role. The appointment is reconsidered annually, and the Information Officer is registered with the Information Regulator before performing his or her duties.",
    ],
  },
  {
    h: "8. Specific duties and responsibilities",
    sub: [
      {
        h: "Governing body",
        list: [
          "Ensuring an Information Officer, and where necessary a Deputy, is appointed.",
          "Ensuring all persons processing personal information are appropriately trained and supervised, understand their contractual obligation to protect it, and know that wilful or negligent breach may lead to disciplinary action.",
          "Ensuring data subjects are made aware of the procedure for enquiries about their personal information.",
          "Scheduling periodic POPI audits of how personal information is collected, held, used, shared, disclosed, destroyed and processed.",
        ],
      },
      {
        h: "Information Officer",
        list: [
          "Taking steps to ensure reasonable compliance with POPIA and keeping the governing body updated, including in the case of a security breach.",
          "Continually analysing privacy regulation and aligning it with the organisation\u2019s processing procedures and related policies.",
          "Ensuring POPI audits are scheduled and conducted regularly.",
          "Making it convenient for data subjects to update information or submit POPI-related complaints.",
          "Approving contracts with operators, employees and third parties that may impact personal information.",
          "Ensuring awareness and training, addressing POPIA-related questions, requests and complaints, and acting as contact point for the Information Regulator.",
        ],
      },
      {
        h: "IT management and support",
        list: [
          "Ensuring infrastructure, filing systems and devices used for processing meet acceptable security standards.",
          "Ensuring electronically held personal information is kept only on designated drives, servers and approved cloud services, sited securely.",
          "Ensuring backups are performed, tested and protected against unauthorised access, accidental deletion and malicious attack.",
          "Ensuring personal information transferred electronically is encrypted and that systems are protected by firewalls and current security software.",
          "Performing regular IT audits, including verification of whether stored personal information has been accessed by unauthorised persons.",
          "Performing due diligence before contracting operators or third-party processors, including cloud services.",
        ],
      },
      {
        h: "Marketing and communications",
        list: [
          "Approving and maintaining protection of personal information statements and disclaimers displayed on the website and attached to emails and newsletters.",
          "Addressing personal information queries from journalists or media outlets.",
          "Ensuring outsourced marketing initiatives comply with POPIA.",
        ],
      },
      {
        h: "Employees and persons acting on behalf of the organisation",
        list: [
          "Treating personal information as a confidential business asset and respecting the privacy of data subjects.",
          "Not utilising, disclosing or making public any personal information unless already publicly known or necessary to perform their duties.",
          "Processing personal information only with consent, where necessary for a contract, to comply with a legal obligation, to protect a legitimate interest of the data subject, or to pursue legitimate interests of the organisation or a third party.",
          "Never processing or accessing personal information not required for their work, saving copies to private devices, sharing personal information informally or by insecure email, or transferring it outside South Africa without the express permission of the Information Officer.",
          "Keeping information secure and in as few places as necessary, encrypting it before sharing, password-protecting devices, locking screens, securing removable media and hard copies, and keeping printed material out of view.",
          "Keeping personal information accurate, up to date and retained only as long as needed, obtaining authorisation before updating or disposing of it.",
          "Undergoing POPI awareness training from time to time.",
          "Immediately reporting any suspected security breach to the Information Officer or Deputy Information Officer.",
        ],
      },
    ],
  },
  {
    h: "9. POPI audit",
    p: ["The Information Officer schedules periodic POPI audits in order to:"],
    list: [
      "Identify the processes used to collect, record, store, disseminate and destroy personal information.",
      "Determine the flow of personal information throughout the organisation.",
      "Redefine the purpose for gathering and processing personal information and ensure processing parameters remain adequately limited.",
      "Ensure new data subjects are made aware of the processing of their personal information.",
      "Re-establish the rationale for further processing where information is received via a third party.",
      "Verify the quality and security of personal information.",
      "Monitor compliance with POPIA and this policy, and the effectiveness of internal controls.",
    ],
  },
  {
    h: "10. Requests to access personal information",
    p: [
      "Data subjects may request what personal information the organisation holds about them and why, request access to it, and be informed how to keep it up to date.",
      "Access requests are made by email addressed to the Information Officer, who will provide a Personal Information Request Form. Once received, the Information Officer verifies the identity of the data subject before handing over any personal information. All requests are considered against the organisation\u2019s PAIA Manual and processed within a reasonable time.",
    ],
  },
  {
    h: "11. POPI complaints procedure",
    list: [
      "Complaints must be submitted in writing; the Information Officer will provide a POPI Complaint Form where required.",
      "Where a complaint is received by anyone other than the Information Officer, the full details must reach the Information Officer within 1 working day.",
      "The Information Officer will acknowledge receipt in writing within 2 working days.",
      "The complaint is considered carefully and resolved in a fair manner in accordance with POPIA, including determining whether it relates to an error or breach of confidentiality with wider impact.",
      "Where there is reason to believe personal information has been accessed or acquired by an unauthorised person, the Information Officer consults the governing body, after which affected data subjects and the Information Regulator are informed.",
      "A proposed solution, with the option of escalation to the governing body, is provided within 7 working days of receipt, with reasons for any decision and notice of any anticipated deviation from these timelines.",
      "The response may comprise a suggested remedy, a dismissal with reasons, or an apology together with any disciplinary action taken.",
      "Where the data subject is not satisfied, they have the right to complain to the Information Regulator.",
      "The complaints process is reviewed periodically to improve it and to avoid recurrence.",
    ],
  },
  {
    h: "12. Personal data breach protocol",
    p: [
      "A personal data breach is any attempt at, or occurrence of, unauthorised acquisition, exposure, disclosure, use, modification or destruction of personal or sensitive data, including data under the control of an affiliated business or third party. All personal data breaches are reported to the Regulator, investigated and contained.",
    ],
    sub: [
      {
        h: "Initial response \u2014 on discovery",
        list: [
          "Identifying the personal data breach or potential breach.",
          "Involving the Information Officer, IT/server function and any other necessary parties.",
          "Involving compliance or legal support where applicable.",
        ],
      },
      {
        h: "Immediate response \u2014 0\u20131 business day",
        list: [
          "Containment of the breach to stop further loss or disclosure.",
          "Opening an incident report or POPI breach report.",
          "Escalation to the relevant individuals or authoritative bodies.",
          "Activation of the initial response and containment plan, which may include securing or disconnecting affected systems, securing affected records, halting affected business processes, and pausing processes relying on exposed information.",
        ],
      },
      {
        h: "Continuing response \u2014 0\u201315+ days",
        list: [
          "Analysis and planning, investigation, mitigation and correction.",
          "Notification of affected parties.",
          "Closing the incident report and final reporting to the Information Officer, the Regulator and data subjects.",
          "Engagement of cyber-insurance vendors or breach-response specialists for forensics, investigation, notification and support where an active policy exists or the need is determined.",
        ],
      },
      {
        h: "Reporting to the Regulator",
        p: [
          "All documentation, investigation records and containment reports are retained throughout the protocol and included in the Information Officer\u2019s written report to the Regulator in terms of section 22 of the POPI Act. The report must contain all material information, supporting documentation, investigation outcomes and improvement plans, and must indicate whether the breach was low, moderate or high risk, the extent of the breach, any actual damages suffered, any injury to affected data subjects and any further threat created.",
        ],
      },
      {
        h: "Notifying data subjects",
        p: [
          "The Information Officer notifies all affected data subjects in writing as soon as reasonably possible after discovery, taking into account the legitimate needs of law enforcement and any measures necessary to determine the scope of the breach and restore the integrity of the information system. Notification may be by post to the last known address, by email, by prominent placement on our website, by publication in the news or media, or as directed by the Regulator.",
        ],
        list: [
          "A description of the possible consequences of the breach.",
          "A description of the measures the organisation intends to take or has taken to address it.",
          "A recommendation of measures the data subject can take to mitigate possible adverse effects.",
          "The identity of the unauthorised person or entity, if known.",
        ],
      },
    ],
  },
  {
    h: "13. Disciplinary action",
    p: [
      "Where a POPI complaint or infringement investigation has been finalised, the organisation may recommend appropriate administrative, legal or disciplinary action against any employee reasonably suspected of non-compliance. In the case of ignorance or minor negligence, further awareness training will be provided. Gross negligence or wilful mismanagement of personal information is a serious form of misconduct for which an employee may be summarily dismissed. Immediate actions may include commencing disciplinary action, referral to law enforcement for criminal investigation, and recovery of funds and assets to limit prejudice or damages.",
    ],
  },
];

function Popi() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="POPI Policy & Breach Protocol"
        subtitle="Our Protection of Personal Information Act policy: guiding principles, data subject rights, duties of the Information Officer, the complaints procedure and our personal data breach protocol."
        primary={{ label: "Contact us", to: "/contact" }}
        secondary={{ label: "PAIA manual", to: "/legal/paia" }}
      >
        <LegalLinks />
      </PageHero>
      <Section>
        <LegalDoc sections={sections} />
      </Section>
    </MarketingPage>
  );
}
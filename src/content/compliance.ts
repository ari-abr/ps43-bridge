// Content for the Legal Compliance page (/compliance). Text only; the layout lives in src/pages/CompliancePage.tsx.
// Prepared by the project team for planning; not legal advice.

export interface LawCard {
  title: string
  overview: string
  actions?: string[]
  /** Yellow warning callout, navy text. */
  highRisk?: string
  /** Navy info callout. */
  note?: string
}

export interface Section {
  id: string
  /** Short label for the jump-link bar. */
  nav: string
  title: string
  intro?: string
  cards: LawCard[]
}

export interface SupportItem {
  requirement: string
  support: string
}

export const LAST_UPDATED = '2026-10-17'

export const compliance = {
  eyebrow: 'PS43 Foundation',
  title: 'Legal Compliance',
  intro:
    "This page summarises the principal legal and regulatory obligations that apply to the PS43 Foundation's education infrastructure work in Cameroon, and how PS43 Bridge is designed to support them. It covers Canadian, United States, Cameroonian and regional requirements.",
  disclaimer:
    'This summary was prepared by the PS43 Bridge project team for planning purposes only. It does not constitute legal advice and has not been reviewed by counsel. All requirements must be confirmed by qualified legal advisers in Canada, the United States and Cameroon before the pilot begins.',

  sections: [
    {
      id: 'canada',
      nav: 'Canada',
      title: 'Canada',
      intro:
        "The PS43 Foundation Canada is a registered charity (Business No. 707303475RR0001). The Canada Revenue Agency's requirements on direction and control therefore apply directly to all activities carried out abroad.",
      cards: [
        {
          title: 'Income Tax Act and CRA guidance on activities outside Canada',
          overview:
            'A registered charity may make gifts only to qualified donees, or carry out its own charitable activities, including through intermediaries such as local partners. Where a partner carries out the work, the charity must demonstrate that it directs and controls the use of its resources. Recent amendments also permit qualifying disbursements to organisations that are not qualified donees, subject to specific accountability requirements.',
          actions: [
            'Execute a written agreement with each partner setting out the project, budget, milestones and reporting obligations.',
            'Release funds in stages, each tied to a verified milestone.',
            'Maintain separate books, records and receipts for each project.',
            'Report all foreign activities accurately on the annual T3010 information return.',
            'Determine the fair market value of in-kind donations, such as donated laptops, before issuing official donation receipts.',
          ],
        },
        {
          title: "Privacy: PIPEDA and Quebec's Law 25",
          overview:
            "The Personal Information Protection and Electronic Documents Act (PIPEDA) applies to personal information collected in the course of commercial activity. A charity's core activities, including most fundraising, generally fall outside its scope; however, certain activities, such as selling, renting or exchanging donor lists, may be considered commercial. Quebec's Law 25 has a broader reach and may apply to non-profit organisations operating in Quebec.",
          actions: [
            'Apply PIPEDA and Law 25 principles as the baseline standard for all donor, volunteer and staff data.',
            'Obtain meaningful consent and collect only the information that is necessary.',
            'Designate a privacy officer accountable for compliance.',
            'Establish a procedure for reporting and recording privacy breaches.',
            'Restrict access to personal information to authorised personnel.',
          ],
        },
        {
          title: 'Corruption of Foreign Public Officials Act',
          overview:
            'The Act prohibits bribery of foreign public officials, including small "facilitation payments", and applies to Canadian organisations and individuals acting abroad. It also creates offences relating to the falsification of books and records.',
          actions: [
            'Adopt a written anti-bribery policy.',
            'Prohibit cash payments of any kind to customs, police or other officials, and include this prohibition in all partner agreements.',
            'Record all gifts and hospitality given or received.',
            'Provide anti-bribery training to partners.',
          ],
          highRisk: 'Customs clearance and permit applications are the points of highest risk.',
        },
        {
          title: 'Anti-money laundering, anti-terrorist financing and sanctions',
          overview:
            'Charities are generally not reporting entities under anti-money laundering legislation, but their banks are. The Criminal Code prohibits providing funds to terrorist groups, whether directly or indirectly, and Canadian sanctions lists apply to all transactions.',
          actions: [
            'Screen all partners and vendors against Canadian sanctions lists before engagement.',
            "Make payments only to bank accounts held in the partner's own legal name.",
            'Avoid cash transactions.',
            "Document the organisation's risk assessment for each region of operation.",
          ],
          highRisk:
            'In the Far North, North-West and South-West regions, adopt explicit rules prohibiting any payment to armed groups, including informal "taxes" at checkpoints.',
        },
      ],
    },
    {
      id: 'united-states',
      nav: 'United States',
      title: 'United States',
      intro:
        'The PS43 Foundation is also registered in the United States as a 501(c)(3) organisation. Grants to partners outside the United States are subject to additional US requirements.',
      cards: [
        {
          title: 'US requirements for foreign grants',
          overview:
            'The applicable rules depend on whether the US entity is classified as a public charity or a private foundation. Both entities must also comply with US anti-bribery and sanctions law.',
          actions: [
            "Confirm the US entity's classification. If it is a private foundation, exercise expenditure responsibility or obtain an equivalency determination for each foreign grant.",
            'Comply with the Foreign Corrupt Practices Act (FCPA), the US anti-bribery law.',
            'Screen partners and vendors against the sanctions lists maintained by the Office of Foreign Assets Control (OFAC).',
          ],
          note: 'Counsel should first determine how responsibility for the Cameroon programme is divided between the Canadian and US entities. This is the first question to put to the legal team.',
        },
        {
          title: 'Existing grant-making process',
          overview:
            'The PS43 Foundation already operates a grant programme, as reflected on its Grantees page. Partner agreements and milestone-based payments for the Cameroon programme can be built on this established process.',
        },
      ],
    },
    {
      id: 'cameroon',
      nav: 'Cameroon',
      title: 'Cameroon',
      cards: [
        {
          title: 'Law No. 2024/017 on the protection of personal data',
          overview:
            "This general data protection statute applies to processing by both public and private bodies. Article 19 makes processing subject to prior authorisation by the Personal Data Protection Authority, and Article 32 restricts transfers of personal data outside Cameroon unless the destination country provides an adequate level of protection. Commentators note that the law provides no legitimate-interest basis for processing and prohibits pre-ticked boxes and bundled consent. The Authority's establishment depends on a presidential decree, so the practical application of the law remains uncertain. A compliance deadline of June 2026 has been reported; the law should therefore be treated as currently in force.",
          actions: [
            'Collect school-level data only; never collect data on individual students.',
            'Obtain specific, separate, opt-in consent.',
            'Determine whether prior authorisation from the Authority is required.',
            'Treat any transfer of data to Canada as a regulated cross-border transfer, and obtain authorisation or use an approved transfer mechanism.',
            'Maintain a record of all processing activities and their purposes.',
            'Apply heightened safeguards to any processing that involves minors.',
          ],
        },
        {
          title: 'Law No. 2010/012 on cybersecurity and cybercrime',
          overview:
            'This law establishes cybercrime offences and security obligations, and regulates electronic communications and, reportedly, encryption services. Parts of it have been superseded by the 2024 data protection law, but its cybercrime provisions remain relevant.',
          actions: [
            'Secure all accounts and devices.',
            'Do not intercept or disclose communications without a lawful basis.',
            'Ask counsel whether any planned encryption tools require approval.',
          ],
        },
        {
          title: 'Law No. 90/053 on associations and Law No. 99/014 on non-governmental organisations',
          overview:
            'Local organisations must be properly declared or registered. NGOs, particularly foreign NGOs, require ministerial approval to operate in Cameroon.',
          actions: [
            'Confirm whether the PS43 Foundation has a Cameroonian legal entity or an operating agreement.',
            'If it does not, operate through a registered local partner.',
            "Collect and verify each partner's registration documents.",
          ],
        },
        {
          title: 'Law No. 98/004 on education and the education ministries (MINEDUB and MINESEC)',
          overview:
            'This law establishes the framework for education in Cameroon. The Ministry of Basic Education (MINEDUB) and the Ministry of Secondary Education (MINESEC), together with their regional and local offices, oversee schools.',
          actions: [
            'Obtain written approval from the school authority and the local education delegation before installing any equipment.',
            'Ensure that devices and learning content are aligned with the national curriculum.',
            'Establish ownership of all equipment and record it in the agreement.',
            'For any construction work, confirm the role and requirements of the local council.',
          ],
        },
        {
          title: 'Telecommunications regulation (MINPOSTEL and the Telecommunications Regulatory Agency)',
          overview: 'SMS and USSD services must be provided through licensed mobile network operators.',
          actions: [
            'Use an operator-approved SMS aggregator and a registered short code.',
            'Agree message content and data-handling terms with the operator.',
            'Do not build or operate an independent messaging gateway.',
          ],
        },
        {
          title: 'CEMAC customs rules for donated equipment',
          overview: 'Donated equipment may qualify for relief from customs duties, but only with the correct documentation.',
          actions: [
            'Engage a licensed customs agent.',
            'Apply for the duty exemption before shipping.',
            'Retain donation letters and detailed inventory lists for every shipment.',
            'Confirm any conditions that apply to used or refurbished electronics, and plan for the disposal of electronic waste.',
          ],
          highRisk: 'Never pay informal "speed fees" or other unofficial charges at customs.',
        },
      ],
    },
    {
      id: 'regional',
      nav: 'Regional',
      title: 'Regional',
      cards: [
        {
          title: 'African Union Convention on Cyber Security and Personal Data Protection (Malabo Convention)',
          overview:
            'The Convention sets out regional principles for data protection and cybersecurity. It is relevant chiefly as a standard of good practice.',
          actions: [
            'Confirm whether Cameroon has ratified the Convention.',
            'Use its principles as a reference standard for data protection practice.',
          ],
        },
      ],
    },
  ] satisfies Section[],

  priorities: {
    id: 'pilot-priorities',
    nav: 'Pilot priorities',
    title: 'Pilot priorities',
    intro: 'Before the pilot begins, the following steps should be completed in order:',
    steps: [
      'Obtain advice from Canadian charity-law counsel on direction and control.',
      "Confirm the PS43 Foundation's legal status in Cameroon.",
      'Prepare a privacy notice and consent form in English and French.',
      'Determine and document how data will be transferred between Cameroon and Canada.',
      'Draft the standard partner agreement, including anti-bribery, sanctions-compliance and child-protection clauses.',
      'Complete the customs and duty-exemption process on a single shipment before scaling up.',
    ],
  },

  support: {
    id: 'app-support',
    nav: 'How PS43 Bridge supports compliance',
    title: 'How PS43 Bridge supports compliance',
    items: [
      {
        requirement: 'School-level data only',
        support:
          "Surveys record school-level information. Student names and individual progress remain on the school's device; only school totals are synchronised.",
      },
      {
        requirement: 'Direction and control of resources',
        support: 'Kits are approved centrally, matched to partners, and tracked from approval to verified delivery.',
      },
      {
        requirement: 'Verified milestones before payment',
        support:
          'Delivery is marked Verified only when both the field coordinator and the school confirm receipt, providing an evidence point for milestone payments.',
      },
      {
        requirement: 'Asset records and in-kind valuation',
        support: 'Each device carries a unique asset ID and QR tag, creating an inventory record for every shipment.',
      },
      {
        requirement: 'Partner verification',
        support:
          'Partners progress through a five-level trust ladder (Referred, Checked, Vouched, Proven, Trusted). Planned for the pilot: a verification checklist covering registration documents, sanctions screening, a signed agreement, and confirmation that PS43 can direct and control the funds.',
      },
      {
        requirement: 'Ongoing accountability',
        support: 'Monthly device check-ins record working, broken and missing equipment.',
      },
      {
        requirement: 'Reporting',
        support: 'The donor report summarises reach, delivery and learning outcomes, and exports to CSV.',
      },
    ] satisfies SupportItem[],
  },

  footer: (date: string) =>
    `Last updated: ${date}. Prepared by the PS43 Bridge project team. For planning purposes only; not legal advice.`,
}

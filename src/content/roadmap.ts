export const LAST_UPDATED = '2026-10-17'

export interface Step {
  id: string
  title: string
  months: string
  goal: string
  actions: string[]
  /** What must be true before moving to the next step. */
  check?: string[]
  ifNot?: string
}

export const roadmap = {
  eyebrow: 'PS43 FOUNDATION',
  title: 'PILOT ROADMAP',
  intro: 'A 12-month pilot of PS43 Bridge with about 20 schools surveyed and 3 to 5 equipped in Littoral, West and Centre, Cameroon.',
  notice:
    'This is a planning draft prepared by the PS43 Bridge project team. Timelines, partners and budgets will be confirmed with the PS43 Foundation, local partners, education authorities and legal counsel.',

  steps: [
    {
      id: 'prepare',
      title: 'Prepare',
      months: 'Months 1–3',
      goal: 'Get the legal, partner and technical basics in place before collecting data or shipping anything.',
      actions: [
        'Get legal advice in Canada and Cameroon, including whether Cameroon’s data protection law (Law No. 2024/017) needs prior authorisation.',
        'Prepare a privacy notice and consent forms in English and French.',
        'Choose and verify two local partners, and sign agreements (milestone payments, anti-bribery, sanctions, child protection).',
        'Get written approval from education delegations and schools.',
        'Train one field coordinator in Cameroon, build the pilot app and have Cameroonian teachers review the Times Tables course.',
      ],
      check: ['Partners signed and verified', 'Legal advice and approvals in hand', 'Pilot app tested end to end, including offline'],
      ifNot: 'Do not collect data until the issue is resolved.',
    },
    {
      id: 'baseline',
      title: 'Baseline',
      months: 'Months 3–4',
      goal: 'Find out which schools are ready for what.',
      actions: [
        'Survey about 20 schools with the offline Field Tools survey, starting near Douala.',
        'Rank schools by tier and need score on the Admin Map.',
        'Revisit a sample of schools to check the answers.',
        'Shortlist 3 to 5 schools to equip.',
      ],
      check: ['A survey takes under 30 minutes', 'At least 90% of fields complete', 'Revisits match survey answers'],
      ifNot: 'Simplify the survey and retrain before choosing schools.',
    },
    {
      id: 'deploy',
      title: 'Deploy',
      months: 'Months 5–7',
      goal: 'Equip the shortlisted schools and prove every delivery.',
      actions: [
        'Send one trial shipment first, through a licensed customs agent.',
        'Give Tier 0 schools non-device support (lighting, printed materials, teacher training).',
        'Train teachers before devices arrive and tag each device with a QR code.',
        'Confirm each delivery twice: coordinator scan and school confirmation.',
        'Trial a local learning server in one school without internet.',
      ],
      check: ['Every delivery confirmed by both sides', 'At least 80% of devices working at day 30', 'No informal payments'],
      ifNot: 'Pause shipments and fix the delivery, training or partner issue.',
    },
    {
      id: 'measure',
      title: 'Measure',
      months: 'Months 8–12',
      goal: 'Show whether devices are used, learning improves and the cost is sustainable.',
      actions: [
        'Monthly check-ins on devices working, broken and missing.',
        'Compare multiplication-table mastery with the baseline.',
        'Work out cost per school and per active learner.',
        'Produce quarterly donor reports and an impact report.',
      ],
    },
    {
      id: 'scale',
      title: 'Decide on scale',
      months: 'Month 12',
      goal: 'Expand to 20 to 50 schools only if devices stay in use, learning improves and the cost per school is sustainable.',
      actions: ['Expand with a second coordinator.', 'Reach new regions through partners already working there.', 'Add SMS check-ins and more courses if needed.'],
    },
  ] satisfies Step[],

  measure: {
    title: 'What we will measure',
    items: [
      'Survey accuracy, from revisits.',
      'Deliveries verified, and devices working at day 30 and day 90.',
      'Offline sync: time to upload and items stuck.',
      'Active learners and change in mastery rate.',
      'Attendance, cost per school and learner, and staff time (added in the pilot version).',
      'Compliance: authorisations in place and no student-level data held centrally.',
    ],
  },

  risks: {
    title: 'Main risks',
    columns: ['Risk', 'Response'],
    rows: [
      ['Power or connectivity', 'Offline-first app; kits include power where needed'],
      ['Device loss or damage', 'School-owned devices, lockable cabinets, QR register'],
      ['Unreliable partners', 'Checks before signing; pay only at verified milestones'],
      ['Customs delays or informal payments', 'Licensed agent, zero tolerance, trial shipment'],
      ['Insecurity', 'Start in Littoral, West and Centre'],
      ['Data protection', 'School-level data only; role-based access; legal review'],
      ['Limited staff', 'One coordinator and a small first cohort'],
    ],
  },

  team: {
    title: 'Team and budget',
    team: [
      'PS43 Foundation programme lead (part-time)',
      'Field coordinator in Cameroon (full-time)',
      'Two local partners, a part-time developer, a repair technician and legal counsel',
    ],
    budget: 'Price with local quotes: devices, solar and cabinets; coordinator; partner payments; customs fees; training; hosting; legal advice.',
  },

  footer: (date: string) => `Last updated: ${date}. Planning draft prepared by the PS43 Bridge project team.`,
}

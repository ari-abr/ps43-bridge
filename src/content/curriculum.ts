// Content for the Curriculum Plan page (/curriculum). Text only; the layout lives in src/pages/CurriculumPage.tsx.

export type Level = 'primary' | 'secondary'

export interface Unit {
  title: string
  description: string
  level: Level
  /** Adds a button linking to the Times Tables course. */
  courseLink?: boolean
}

export interface LevelPlan {
  goal: string
  units: Unit[]
}

export interface Subject {
  id: string
  title: string
  primary: LevelPlan
  secondary: LevelPlan
}

export const LAST_UPDATED = '2026-10-17'

const p = (title: string, description: string, extra: Partial<Unit> = {}): Unit => ({ title, description, level: 'primary', ...extra })
const s = (title: string, description: string): Unit => ({ title, description, level: 'secondary' })

export const curriculum = {
  eyebrow: 'PS43 Foundation',
  title: 'Curriculum Plan',
  intro:
    "The PS43 Bridge Curriculum Plan is a proposed supplementary programme for primary and secondary schools in Cameroon. It builds strong foundations in mathematics, science and technology while placing Cameroon's history and culture at the centre of learning. Lessons are designed to run offline on the PS43 Bridge Learning module.",
  notice:
    'This plan is a draft for discussion. It is designed to supplement, not replace, the national curricula set by the Ministry of Basic Education (MINEDUB) and the Ministry of Secondary Education (MINESEC), and will be developed with Cameroonian teachers, historians and education authorities.',

  principles: [
    { title: 'Cameroon first', text: 'Learners see their own history and cultures reflected in every subject.' },
    { title: 'Works offline', text: 'Lessons run on school devices without an internet connection.' },
    { title: 'Mastery before moving on', text: 'Learners practise until they are confident.' },
    { title: 'Building year on year', text: 'Primary units prepare learners for secondary study.' },
    { title: 'Aligned with national standards', text: 'Units extend the national curricula rather than replacing them.' },
    { title: "Respect for diversity", text: "Content reflects Cameroon's many peoples, regions and faiths." },
  ],

  levels: [
    { level: 'Primary', age: 'about 6–11', focus: 'Strong foundations' },
    { level: 'Secondary', age: 'about 12–18', focus: 'Advanced study' },
  ],

  subjects: [
    {
      id: 'history',
      title: 'History and Culture',
      primary: {
        goal: "Learners understand where they come from and take pride in Cameroon's heritage.",
        units: [
          p('Our Cameroon', 'The regions, peoples, languages and traditions of Cameroon.'),
          p('Kingdoms of Cameroon', "The Bamum, Kotoko and Mandara kingdoms, including Sultan Njoya's script, schools and map."),
          p('Great civilisations of Africa', 'Kingdoms and leaders from across the continent.'),
        ],
      },
      secondary: {
        goal: "Learners analyse how the past shapes the present and connects Cameroon to the world.",
        units: [
          s('Modern Cameroon', 'The colonial period, independence and reunification.'),
          s('Cameroon and the world', "Abram Gannibal, his descendants including Alexander Pushkin, and Africa's historical links with Asia, the Middle East and Europe."),
          s('Leadership and integrity', 'Case studies from world history on corruption and reform.'),
        ],
      },
    },
    {
      id: 'mathematics',
      title: 'Mathematics',
      primary: {
        goal: 'Learners are confident with numbers and comfortable with multiplication tables.',
        units: [
          p('Number sense', 'Counting, place value and the four operations, including traditional games such as Songo.'),
          p('Multiplication tables', 'Regular practice and mastery quizzes in the PS43 Bridge Times Tables course.', { courseLink: true }),
          p('Problem solving and early algebra', 'Patterns, logic and simple equations.'),
        ],
      },
      secondary: {
        goal: 'Learners build the algebra and calculus needed for science and technology.',
        units: [
          s('Algebra and functions', 'Graphs, functions and systems of equations.'),
          s('Advanced topics', 'Linear algebra, complex numbers and an introduction to calculus.'),
          s('Mathematics through history', 'Contributions from Africa, the Middle East and Asia.'),
        ],
      },
    },
    {
      id: 'science',
      title: 'Science and Health',
      primary: {
        goal: 'Learners understand how to stay healthy and how science improves everyday life.',
        units: [
          p('Staying healthy', 'Hygiene, clean water, nutrition and healthy habits at home and at school.'),
          p('Keeping our communities well', 'How people protect their health, from handwashing and vaccination to caring for the environment.'),
          p('Scientists who changed the world', 'The lives and discoveries of influential scientists, including African and Cameroonian innovators.'),
        ],
      },
      secondary: {
        goal: 'Learners understand the biology of health and how science develops new treatments.',
        units: [
          s('Genetics and heredity', 'How traits are inherited and what DNA tells us about living things.'),
          s('Health and disease prevention', 'How the body defends itself, how infections spread, and how vaccines, public health and treatment protect communities.'),
          s('The future of medicine', 'Diagnostic tests, new medicines and biotechnology, and the ethical questions they raise.'),
        ],
      },
    },
    {
      id: 'arts',
      title: 'Arts and Big Questions',
      primary: {
        goal: "Learners express themselves creatively and value Cameroon's artistic traditions.",
        units: [
          p('Cameroonian art traditions', 'Brass casting, beadwork, textiles and carving.'),
          p('Drawing skills', 'Drawing from observation and first steps in perspective.'),
        ],
      },
      secondary: {
        goal: 'Learners develop advanced creative skills and reason about ethics and society.',
        units: [
          s('Drawing and digital art', 'Anatomy and perspective, with free tools such as Krita, Inkscape and Blender.'),
          s('Philosophy', 'The ideas of African and diaspora thinkers, such as Zera Yacob, Anton Wilhelm Amo and Frederick Douglass.'),
        ],
      },
    },
    {
      id: 'technology',
      title: 'Technology',
      primary: {
        goal: 'Learners use computers confidently and take their first steps in programming.',
        units: [
          p('Using a computer', 'Basic skills and caring for shared devices.'),
          p('Coding foundations', 'Block-based coding that works offline.'),
        ],
      },
      secondary: {
        goal: 'Learners program confidently and use data to solve real problems.',
        units: [
          s('Programming in Python', 'Variables, loops, functions and small projects.'),
          s('How computers work', 'Operating systems such as Linux, and free versus proprietary software.'),
          s('Data science', "Analysing real data, in the spirit of the PS43 Foundation's Data Dunkers programme."),
        ],
      },
    },
  ] as Subject[],

  delivery: [
    'Lessons run offline through the PS43 Bridge Learning module; printed guides support schools without devices.',
    'Learners complete mastery quizzes, and teachers follow progress on the class dashboard.',
    "Only school-level totals leave the school; individual results stay on the school's device.",
  ],

  nextSteps: [
    'Share the plan with MINEDUB, MINESEC and local education delegations for review.',
    'Develop each unit with Cameroonian teachers, historians and communities.',
    'Pilot the Times Tables course and one history unit in the pilot schools.',
    'Confirm licences for any third-party content before distribution.',
  ],

  footer: (date: string) => `Last updated: ${date}. Draft prepared by the PS43 Bridge project team for discussion.`,
}

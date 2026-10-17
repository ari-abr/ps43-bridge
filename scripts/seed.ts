// Builds the demo seed data in src/data/ from data-raw/schools-raw.json.
// Run with: npm run seed   (same output every run: everything uses one seeded random generator)
//
// Real OpenStreetMap coordinates are kept, but school and partner names are fictional (see CLAUDE.md).

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { distanceKm, nearestKm, tierFromSurvey } from '../src/lib/scoring.ts'
import type { Power, Signal, Tier } from '../src/lib/scoring.ts'
import type {
  CourseManifest,
  CoursePack,
  Device,
  Kit,
  Lesson,
  Partner,
  QuizQuestion,
  Region,
  School,
  Shipment,
  ShipmentStatus,
  Survey,
} from '../src/lib/types.ts'

const OUT = 'src/data'
const REGIONS: Region[] = ['Littoral', 'West', 'Centre']
const PER_REGION = 100
const SURVEYED_PER_REGION = 15 // 45 of 300 = 15%
const DEMO_NOTE = 'DEMO DATA: fictional names for a hackathon demo. Coordinates come from OpenStreetMap.'

// ---------- seeded random ----------

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(43)
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)]
function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')
const round5 = (n: number) => Math.round(n * 1e5) / 1e5
function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const randomDate = (from: string, to: string) =>
  addDays(from, int(0, Math.round((Date.parse(to) - Date.parse(from)) / 86400000)))

function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 1) + '\n')
}

// ---------- 1. schools ----------

interface RawSchool {
  osmId: string
  name: string
  region: Region
  lat: number
  lng: number
}

const PLACE_START = ['Ndo', 'Mbe', 'Tolo', 'Ekon', 'Nkol', 'Mvog', 'Bana', 'Dja', 'Fon', 'Kum', 'Sanga', 'Lobe']
const PLACE_END = ['mba', 'gou', 'kou', 'lan', 'sso', 'ndé', 'tiba', 'mang', 'bele', 'ya', 'nkam', 'ton']
const SCHOOL_TYPES = [
  'Government Primary School',
  'Ecole Publique',
  'Ecole Bilingue',
  'Community Primary School',
  'Ecole Primaire Catholique',
  'Presbyterian Primary School',
]

function fictionalNames(count: number): string[] {
  const used = new Set<string>()
  const names: string[] = []
  while (names.length < count) {
    const place = pick(PLACE_START) + pick(PLACE_END)
    const base = `${pick(SCHOOL_TYPES)} ${place}`
    const name = used.has(base) ? `${base} ${int(2, 9)}` : base
    if (used.has(name)) continue
    used.add(name)
    names.push(name)
  }
  return names
}

const raw: RawSchool[] = JSON.parse(readFileSync('data-raw/schools-raw.json', 'utf8'))
const schools: School[] = []

for (const region of REGIONS) {
  const candidates = shuffle(raw.filter((s) => s.region === region).sort((a, b) => a.osmId.localeCompare(b.osmId)))
  const picked: RawSchool[] = []
  for (const c of candidates) {
    if (picked.length === PER_REGION) break
    // OSM often maps one school twice; skip a repeat of the same name within 150 m.
    const twin = picked.some((p) => p.name.toLowerCase() === c.name.toLowerCase() && distanceKm(p, c) < 0.15)
    if (!twin) picked.push(c)
  }
  picked.sort((a, b) => a.osmId.localeCompare(b.osmId))
  const names = fictionalNames(picked.length)
  picked.forEach((p, i) =>
    schools.push({ id: '', osmId: p.osmId, name: names[i], region, lat: round5(p.lat), lng: round5(p.lng) }),
  )
}
schools.forEach((s, i) => (s.id = `sch-${pad(i + 1, 3)}`))

writeJson(`${OUT}/schools.json`, { note: DEMO_NOTE, schools })

// ---------- 2. kits ----------

const kits: Kit[] = [
  {
    id: 'kit-tier-0',
    tier: 0,
    name: 'Tier 0 kit: light and paper',
    items: [
      { name: 'Solar lighting set (lamps)', qty: 6, isDevice: false },
      { name: 'Printed Times Tables workbooks', qty: 40, isDevice: false },
      { name: 'Teacher training day', qty: 2, isDevice: false },
    ],
  },
  {
    id: 'kit-tier-1',
    tier: 1,
    name: 'Tier 1 kit: solar learning corner',
    items: [
      { name: 'Solar panel and battery set', qty: 1, isDevice: false },
      { name: 'Raspberry Pi learning server', qty: 1, isDevice: true },
      { name: 'Small laptop', qty: 8, isDevice: true },
      { name: 'Charging cabinet', qty: 1, isDevice: false },
    ],
  },
  {
    id: 'kit-tier-2',
    tier: 2,
    name: 'Tier 2 kit: protected laptop lab',
    items: [
      { name: 'Surge protection', qty: 2, isDevice: false },
      { name: 'Battery backup (UPS)', qty: 1, isDevice: false },
      { name: 'Raspberry Pi learning server', qty: 1, isDevice: true },
      { name: 'Laptop', qty: 15, isDevice: true },
    ],
  },
  {
    id: 'kit-tier-3',
    tier: 3,
    name: 'Tier 3 kit: full lab',
    items: [
      { name: 'Surge protection', qty: 4, isDevice: false },
      { name: 'Battery backup (UPS)', qty: 2, isDevice: false },
      { name: 'Learning server', qty: 1, isDevice: true },
      { name: 'Laptop', qty: 30, isDevice: true },
      { name: 'Projector', qty: 1, isDevice: false },
      { name: 'Wi-Fi access point', qty: 2, isDevice: false },
    ],
  },
].map((k) => ({
  ...k,
  tier: k.tier as Tier,
  deviceCount: k.items.filter((i) => i.isDevice).reduce((sum, i) => sum + i.qty, 0),
}))

writeJson(`${OUT}/kits.json`, { note: DEMO_NOTE, kits })

// ---------- 3. partners ----------

const TRUST_LABELS = ['Referred', 'Checked', 'Vouched', 'Proven', 'Trusted'] as const
const partnerRows: [string, Partner['type'], string, number, number, string[], 1 | 2 | 3 | 4 | 5][] = [
  ['Wouri Refurb Works', 'refurbisher', 'Douala', 4.0511, 9.7679, ['refurbished laptops', 'Raspberry Pi servers', 'repairs'], 4],
  ['Littoral Roadrunner Freight', 'transporter', 'Douala', 4.0435, 9.7061, ['road freight', 'kit delivery'], 2],
  ['Sanaga Solar Services', 'solar installer', 'Yaoundé', 3.848, 11.5021, ['solar panels', 'batteries', 'installation'], 3],
  ['Mfoundi Cargo Link', 'transporter', 'Yaoundé', 3.8667, 11.5167, ['road freight', 'kit delivery'], 4],
  ['Capital Laptop Giving Circle', 'laptop donor', 'Yaoundé', 3.8721, 11.4935, ['donated laptops'], 5],
  ['Highland Haulage', 'transporter', 'Bafoussam', 5.4737, 10.4179, ['road freight', 'kit delivery'], 5],
  ['Grassfields Laptop Donors', 'laptop donor', 'Bafoussam', 5.4812, 10.4263, ['donated laptops', 'chargers'], 3],
  ['Noun Valley Solar', 'solar installer', 'Foumban', 5.7266, 10.8986, ['solar panels', 'installation'], 1],
]
const partners: Partner[] = partnerRows.map(([name, type, city, lat, lng, supplies, trust], i) => ({
  id: `partner-${pad(i + 1)}`,
  name,
  type,
  city,
  lat,
  lng,
  supplies,
  trust,
  trustLabel: TRUST_LABELS[trust - 1],
}))

writeJson(`${OUT}/partners.json`, {
  note: 'DEMO DATA: all partners are fictional.',
  trustLevels: TRUST_LABELS.map((label, i) => ({ level: i + 1, label })),
  partners,
})

// ---------- 4. demo state: surveys and shipments ----------

// Survey answers that give each tier (checked below against tierFromSurvey).
const ANSWERS_BY_TIER: Record<Tier, [Power, Signal][]> = {
  0: [['none', 'none'], ['none', '2G'], ['none', '3G']],
  1: [['solar possible', 'none'], ['solar possible', '2G'], ['solar possible', '3G'], ['unreliable grid', 'none']],
  2: [['unreliable grid', '2G'], ['unreliable grid', '3G'], ['reliable grid', '2G'], ['reliable grid', 'none']],
  3: [['reliable grid', '3G'], ['reliable grid', '4G']],
}
// 15 surveyed per region: 4 / 4 / 4 / 3 across tiers 0-3
const TIER_PLAN: Tier[] = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3]

const surveys: Record<string, Survey> = {}
for (const region of REGIONS) {
  const regionSchools = shuffle(schools.filter((s) => s.region === region)).slice(0, SURVEYED_PER_REGION)
  regionSchools.forEach((school, i) => {
    const tier = TIER_PLAN[i]
    const [power, signal] = pick(ANSWERS_BY_TIER[tier])
    if (tierFromSurvey(power, signal) !== tier) throw new Error(`Bad answers for tier ${tier}: ${power} / ${signal}`)
    const pupils = int(80, 650)
    surveys[school.id] = {
      power,
      signal,
      pupils,
      teachers: Math.max(2, Math.round(pupils / int(28, 55))),
      secureRoom: rand() < 0.3 + tier * 0.2,
      surveyedAt: randomDate('2026-08-01', '2026-09-15'),
    }
  })
}

const STATUSES: ShipmentStatus[] = ['approved', 'in transit', 'delivered', 'verified']
const transporterByRegion: Record<Region, string> = {
  Littoral: partners.find((p) => p.name === 'Littoral Roadrunner Freight')!.id,
  West: partners.find((p) => p.name === 'Highland Haulage')!.id,
  Centre: partners.find((p) => p.name === 'Mfoundi Cargo Link')!.id,
}

// 8 shipments: two per status, spread over regions
const shipmentSchools = REGIONS.flatMap((region) =>
  shuffle(schools.filter((s) => s.region === region && surveys[s.id])),
)
const chosen: School[] = []
for (let i = 0; chosen.length < 8; i++) chosen.push(shipmentSchools[(i % 3) * SURVEYED_PER_REGION + Math.floor(i / 3)])

const shipments: Shipment[] = chosen.map((school, i) => {
  const status = STATUSES[i % 4]
  const tier = tierFromSurvey(surveys[school.id].power, surveys[school.id].signal)
  const kit = kits.find((k) => k.tier === tier)!
  const id = `ship-${pad(i + 1)}`

  const devices: Device[] = []
  if (status !== 'approved') {
    let n = 0
    for (const item of kit.items.filter((it) => it.isDevice)) {
      for (let q = 0; q < item.qty; q++) {
        devices.push({
          id: `DEV-${pad(i + 1)}-${pad(++n)}`,
          type: item.name.toLowerCase().includes('server') ? 'server' : 'laptop',
        })
      }
    }
  }

  const shipment: Shipment = {
    id,
    schoolId: school.id,
    kitId: kit.id,
    tier,
    transporterId: transporterByRegion[school.region],
    status,
    approvedAt: randomDate('2026-09-16', '2026-09-22'),
    devices,
  }
  if (status !== 'approved') shipment.shippedAt = addDays(shipment.approvedAt, int(3, 7))
  if (status === 'delivered' || status === 'verified') shipment.deliveredAt = addDays(shipment.shippedAt!, int(4, 10))
  if (status === 'verified') shipment.verifiedAt = addDays(shipment.deliveredAt!, int(2, 6))
  return shipment
})

writeJson(`${OUT}/demo-state.json`, {
  note: 'DEMO DATA: made-up survey answers and shipments for the demo. Schools not listed in "surveys" are unsurveyed (grey).',
  surveys,
  shipments,
})

// ---------- 5. course packs ----------

function facts(table: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${table} × ${i + 1} = ${table * (i + 1)}`)
}

function question(n: number, text: string, answer: number, a: number, b: number): QuizQuestion {
  const wrong = new Set<number>()
  for (const c of shuffle([answer + a, answer - a, answer + b, answer - b, answer + 1, answer - 1, answer + 10, answer - 10])) {
    if (c > 0 && c !== answer && wrong.size < 3) wrong.add(c)
  }
  const options = shuffle([answer, ...wrong])
  return {
    id: `q${n}`,
    question: text,
    options: options.map(String),
    answerIndex: options.indexOf(answer),
  }
}

const baseLessons: Lesson[] = [
  {
    id: 'lesson-1',
    title: 'Tables 2 to 5',
    tip: 'Times tables are repeated adding. 3 × 4 means 3 + 3 + 3 + 3.',
    rows: [2, 3, 4, 5].flatMap(facts),
  },
  {
    id: 'lesson-2',
    title: 'Tables 6 to 9',
    tip: 'If you know 6 × 4, you also know 4 × 6. The order does not matter.',
    rows: [6, 7, 8, 9].flatMap(facts),
  },
  {
    id: 'lesson-3',
    title: 'Tables 10 to 12',
    tip: 'To multiply by 10, add a zero. 10 × 7 = 70. Then 11 and 12 are just one or two more groups.',
    rows: [10, 11, 12].flatMap(facts),
  },
]
const mixedLesson: Lesson = {
  id: 'lesson-4',
  title: 'Mixed practice',
  tip: 'Try these without looking. Then check the answer.',
  tryThese: [
    { q: '4 × 6', a: '24' },
    { q: '7 × 5', a: '35' },
    { q: '9 × 3', a: '27' },
    { q: '8 × 8', a: '64' },
    { q: '12 × 4', a: '48' },
    { q: '6 × 11', a: '66' },
  ],
}
const tricksLesson: Lesson = {
  id: 'lesson-5',
  title: 'Tricks for 9s and 11s',
  tip: 'For 9 × a number up to 10, the two digits of the answer always add up to 9. For 11 × a single digit, write the digit twice: 11 × 4 = 44.',
  tryThese: [
    { q: '9 × 7', a: '63' },
    { q: '9 × 4', a: '36' },
    { q: '11 × 6', a: '66' },
    { q: '11 × 9', a: '99' },
  ],
}

const quizV1: QuizQuestion[] = [
  question(1, 'What is 3 × 4?', 12, 3, 4),
  question(2, 'What is 5 × 6?', 30, 5, 6),
  question(3, 'What is 7 × 8?', 56, 7, 8),
  question(4, 'What is 6 × 9?', 54, 6, 9),
  question(5, 'What is 9 × 4?', 36, 9, 4),
  question(6, 'What is 12 × 3?', 36, 12, 3),
  question(7, 'What is 8 × 8?', 64, 8, 8),
  question(8, 'What is 11 × 5?', 55, 11, 5),
  question(9, 'What is 4 × 7?', 28, 4, 7),
  question(10, 'What is 10 × 9?', 90, 10, 9),
]
const quizV2Extra: QuizQuestion[] = [
  question(11, 'What is 9 × 7?', 63, 9, 7),
  question(12, 'What is 11 × 8?', 88, 11, 8),
  question(13, 'A box holds 6 books. How many books are in 7 boxes?', 42, 6, 7),
  question(14, 'What number makes this true: ? × 6 = 48', 8, 6, 8),
  question(15, 'What is 12 × 12?', 144, 12, 12),
]

const packV1: CoursePack = {
  id: 'times-tables',
  title: 'Times Tables',
  version: 1,
  releaseNotes: 'First version: 4 lessons and a 10-question quiz.',
  lessons: [...baseLessons, mixedLesson],
  quiz: quizV1,
}
const packV2: CoursePack = {
  id: 'times-tables',
  title: 'Times Tables',
  version: 2,
  releaseNotes: 'New lesson "Tricks for 9s and 11s" and 5 more quiz questions (15 in total).',
  lessons: [...baseLessons, tricksLesson, mixedLesson],
  quiz: [...quizV1, ...quizV2Extra],
}
const manifest: CourseManifest = {
  packs: [
    {
      id: 'times-tables',
      title: 'Times Tables',
      latestVersion: 2,
      files: { '1': 'times-tables-v1.json', '2': 'times-tables-v2.json' },
    },
  ],
}

mkdirSync(`${OUT}/courses`, { recursive: true })
writeJson(`${OUT}/courses/times-tables-v1.json`, packV1)
writeJson(`${OUT}/courses/times-tables-v2.json`, packV2)
writeJson(`${OUT}/courses/manifest.json`, manifest)

// ---------- summary ----------

console.log('Schools per region:')
for (const region of REGIONS) console.log(`  ${region}: ${schools.filter((s) => s.region === region).length}`)
console.log(`  Total: ${schools.length}`)

console.log(`\nSurveyed: ${Object.keys(surveys).length} of ${schools.length}`)
const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
for (const s of Object.values(surveys)) tierCounts[tierFromSurvey(s.power, s.signal)]++
for (const t of [0, 1, 2, 3]) console.log(`  Tier ${t}: ${tierCounts[t]}`)

console.log('\nShipments per status:')
for (const status of STATUSES) console.log(`  ${status}: ${shipments.filter((s) => s.status === status).length}`)

const equipped = shipments
  .filter((s) => s.status === 'delivered' || s.status === 'verified')
  .map((s) => schools.find((x) => x.id === s.schoolId)!)
const sample = schools.find((s) => surveys[s.id])!
console.log(
  `\nCheck: ${equipped.length} equipped schools; nearest one to ${sample.id} is ${nearestKm(sample, equipped)?.toFixed(1)} km away`,
)

console.log('\nQuiz questions: v1 =', packV1.quiz.length, ', v2 =', packV2.quiz.length)
console.log('Lessons:        v1 =', packV1.lessons.length, ', v2 =', packV2.lessons.length)

console.log('\nFile sizes:')
for (const f of [
  'schools.json',
  'demo-state.json',
  'kits.json',
  'partners.json',
  'courses/manifest.json',
  'courses/times-tables-v1.json',
  'courses/times-tables-v2.json',
]) {
  console.log(`  src/data/${f}: ${(statSync(`${OUT}/${f}`).size / 1024).toFixed(1)} KB`)
}

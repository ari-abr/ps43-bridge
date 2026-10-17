// Shapes of the seed JSON files in src/data/. Shared by scripts/seed.ts and the app.
import type { Power, Signal, Tier } from './scoring.ts'

export type Region = 'Littoral' | 'West' | 'Centre'

export interface School {
  id: string
  osmId: string
  name: string // fictional demo name
  region: Region
  lat: number
  lng: number
}

export interface Survey {
  power: Power
  signal: Signal
  pupils: number
  teachers: number
  secureRoom: boolean
  surveyedAt: string // YYYY-MM-DD (seed) or full ISO time (new surveys); compared as strings
}

/** Never stored: worked out by shipmentStatus() in src/lib/shipments.ts. */
export type ShipmentStatus = 'approved' | 'in transit' | 'delivered' | 'verified'

/** Where a school is in the journey, from its surveys and shipments. */
export type SchoolStatus = 'unassessed' | 'assessed' | 'kit approved' | 'in transit' | 'delivered' | 'verified'

export interface Device {
  assetId: string // "PS43-0001", unique across all shipments; printed as a QR code on the device
  type: 'laptop' | 'server'
}

/** A shipment as stored. Its status comes from inTransitAt and the delivery confirmations. */
export interface Shipment {
  id: string
  schoolId: string
  tier: Tier
  kitId: string
  kitItems: KitItem[]
  partnerId: string // supplier
  transporterId: string
  devices: Device[] // created from the kit's device counts when the kit is approved
  createdAt: string
  inTransitAt: string | null
}

export type Party = 'coordinator' | 'teacher'

/**
 * One per party per shipment, id "conf-<shipmentId>-<party>". Kept apart from the shipment so two
 * offline confirmations can never overwrite each other.
 */
export interface Confirmation {
  id: string
  shipmentId: string
  party: Party
  confirmedAt: string
  scannedAssetIds?: string[] // coordinator only
  photoTaken?: boolean // coordinator only
  devicesReceived?: number // teacher only
  note: string
}

/** A monthly check-in on a school's delivered devices. */
export interface Checkin {
  id: string
  schoolId: string
  shipmentId: string
  working: number
  broken: number
  missing: number
  note: string
  checkedAt: string
}

export interface KitItem {
  name: string
  qty: number
  isDevice: boolean // tagged with a QR code
}

export interface Kit {
  id: string
  tier: Tier
  name: string
  items: KitItem[]
  deviceCount: number
}

export type PartnerType = 'refurbisher' | 'solar installer' | 'transporter' | 'laptop donor' | 'education NGO'

export interface Partner {
  id: string
  name: string // fictional demo name
  type: PartnerType
  city: string
  lat: number
  lng: number
  supplies: string[]
  trust: 1 | 2 | 3 | 4 | 5
  trustLabel: 'Referred' | 'Checked' | 'Vouched' | 'Proven' | 'Trusted'
}

export interface Lesson {
  id: string
  title: string
  tip: string
  rows?: string[] // worked facts, e.g. "3 × 4 = 12"
  tryThese?: { q: string; a: string }[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  answerIndex: number
}

export interface CoursePack {
  id: string
  title: string
  version: number
  releaseNotes: string
  lessons: Lesson[]
  quiz: QuizQuestion[]
}

export interface CourseManifest {
  packs: { id: string; title: string; latestVersion: number; files: Record<string, string> }[]
}

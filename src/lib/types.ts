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
  surveyedAt: string // YYYY-MM-DD
}

export type ShipmentStatus = 'approved' | 'in transit' | 'delivered' | 'verified'

/** Where a school is in the journey, from its surveys and shipments. */
export type SchoolStatus = 'unassessed' | 'assessed' | 'kit approved' | 'in transit' | 'delivered' | 'verified'

export interface Device {
  id: string // printed as a QR code on the device
  type: 'laptop' | 'server'
}

export interface Shipment {
  id: string
  schoolId: string
  kitId: string
  tier: Tier
  transporterId: string
  status: ShipmentStatus
  approvedAt: string
  shippedAt?: string
  deliveredAt?: string
  verifiedAt?: string
  devices: Device[] // tagged when the shipment leaves; empty while only approved
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

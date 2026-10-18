// Helpers for the Admin "Demo controls" (stage use). Everything goes through api.ts.

import { createShipment, getKits, getLocal, getPartners, getSchools, resetDemoData, setLocal, type SchoolView } from './api.ts'
import { matchTransporters, topPartner } from './matching.ts'
import type { Region } from './types.ts'

const REGIONS: Region[] = ['Littoral', 'West', 'Centre']
const SCENE_KEY = 'demoScene'
/** Tier 1 has the smallest kit with devices (9), so scanning it on stage is quick. */
const DELIVERY_TIER = 1

export interface SceneSchool {
  id: string
  name: string
  region: Region
}

export interface DemoScene {
  /** Unassessed (grey) schools, one per region, for the live survey. */
  surveySchools: SceneSchool[]
  /** An assessed school with an approved kit, for the delivery demo. */
  delivery: SceneSchool & { shipmentId: string; devices: number }
}

export const getDemoScene = () => getLocal<DemoScene | null>(SCENE_KEY, null)

/** Clear every "ps43:" key and reload. The footer and the Demo controls ask first (ResetDemoButton). */
export function resetAndReload() {
  resetDemoData()
  window.location.assign('/')
}

/** Short, unique names are easy to find in the school search on stage. */
function pick(candidates: SchoolView[], all: SchoolView[]): SchoolView | undefined {
  const count = new Map<string, number>()
  all.forEach((s) => count.set(s.name, (count.get(s.name) ?? 0) + 1))
  const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name))
  return sorted.find((s) => count.get(s.name) === 1 && s.name.length <= 36) ?? sorted[0]
}

const brief = (s: SchoolView): SceneSchool => ({ id: s.id, name: s.name, region: s.region })

/**
 * Reset the demo data, then choose the schools for the stage demo: one unassessed school per
 * region, and one assessed Tier 1 school that gets an approved kit. Online only (the kit is approved
 * through the fake server like any other).
 */
export async function setUpDemoScene(): Promise<DemoScene> {
  resetDemoData()
  const [schools, kits, partners] = await Promise.all([getSchools(), getKits(), getPartners()])

  const surveySchools = REGIONS.map((region) => {
    const school = pick(
      schools.filter((s) => s.region === region && s.status === 'unassessed'),
      schools,
    )
    if (!school) throw new Error(`No unassessed school left in ${region}.`)
    return brief(school)
  })

  const target = pick(
    schools.filter((s) => s.status === 'assessed' && s.tier === DELIVERY_TIER),
    schools,
  )
  const kit = kits.find((k) => k.tier === DELIVERY_TIER)
  if (!target || !kit) throw new Error('No assessed Tier 1 school or kit found for the delivery demo.')

  const supplier = topPartner(DELIVERY_TIER, target, partners)
  const transporter = matchTransporters(target, partners)[0]
  if (!supplier || !transporter) throw new Error('No partner found to supply the kit.')

  const result = await createShipment({
    schoolId: target.id,
    tier: DELIVERY_TIER,
    kit,
    partnerId: supplier.partner.id,
    transporterId: transporter.partner.id,
  })
  if (result !== 'uploaded') throw new Error('Could not approve the kit. Check you are Online and try again.')

  const shipment = (await getSchools()).find((s) => s.id === target.id)?.shipment
  if (!shipment) throw new Error('The approved kit was not found.')

  const scene: DemoScene = {
    surveySchools,
    delivery: { ...brief(target), shipmentId: shipment.id, devices: shipment.devices.length },
  }
  setLocal(SCENE_KEY, scene)
  return scene
}

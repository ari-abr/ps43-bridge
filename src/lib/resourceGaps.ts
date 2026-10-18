// What partners have pledged versus what the next schools need. Plain sums, no AI.
// Pure functions: no storage, no server calls.
import type { SchoolView } from './api.ts'
import { needScore, type NeedWeights, type Tier } from './scoring.ts'
import type { ResourceType } from './types.ts'

export const RESOURCES: ResourceType[] = ['laptops', 'solar kits', 'funding', 'trainer days']

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  laptops: 'Laptops',
  'solar kits': 'Solar kits',
  funding: 'Funding',
  'trainer days': 'Volunteer trainer days',
}

export const RESOURCE_UNITS: Record<ResourceType, string> = {
  laptops: 'laptops',
  'solar kits': 'solar kits',
  funding: 'CFA francs',
  'trainer days': 'trainer days',
}

/** "How many schools" choices on the card. */
export const NEXT_COUNTS = [5, 10, 20] as const
export const DEFAULT_NEXT_COUNT = 20

/**
 * What one school of each tier needs. DEMO DATA.
 * Laptops, solar kits and Tier 0 trainer days are the kit contents in src/data/kits.json.
 * Estimates (kits.json has no such numbers):
 *   - trainer days for Tiers 1 to 3 (kits.json lists training for Tier 0 only)
 *   - funding: other kit costs not pledged in kind (server, power protection, cabinet,
 *     workbooks, transport, installation), in CFA francs
 */
export const TIER_NEEDS: Record<Tier, Record<ResourceType, number>> = {
  // kits.json: 1 solar lighting set (6 lamps), 40 workbooks, 2 teacher training days
  0: { laptops: 0, 'solar kits': 1, 'trainer days': 2, funding: 300_000 },
  // kits.json: 8 small laptops, 1 solar panel and battery set (+ server, charging cabinet)
  1: { laptops: 8, 'solar kits': 1, 'trainer days': 2, funding: 900_000 },
  // kits.json: 15 laptops (+ server, surge protection, battery backup); grid power, no solar
  2: { laptops: 15, 'solar kits': 0, 'trainer days': 2, funding: 1_200_000 },
  // kits.json: 30 laptops (+ server, projector, Wi-Fi, power protection); grid power, no solar
  3: { laptops: 30, 'solar kits': 0, 'trainer days': 3, funding: 2_500_000 },
}

const zero = (): Record<ResourceType, number> => ({ laptops: 0, 'solar kits': 0, funding: 0, 'trainer days': 0 })

// ---------- demand ----------

export interface RankedSchool {
  school: SchoolView
  score: number
}

/** Assessed schools, highest need score first (ties: by name). The priority list uses this. */
export function rankByNeed(schools: SchoolView[], weights: NeedWeights): RankedSchool[] {
  return schools
    .flatMap((school) => (school.need ? [{ school, score: needScore(school.need, weights) }] : []))
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name))
}

/** "Next to equip": assessed, with no kit approved, on its way or delivered yet. */
export const isNextToEquip = (s: SchoolView) => s.status === 'assessed'

/** What these schools need in total, from their tiers. */
export function demandFor(tiers: Tier[]): Record<ResourceType, number> {
  const total = zero()
  for (const tier of tiers) for (const r of RESOURCES) total[r] += TIER_NEEDS[tier][r]
  return total
}

// ---------- supply ----------

export interface PledgeLike {
  partnerId: string
  resource: ResourceType
  quantity: number
  status: 'pledged' | 'delivered'
}

export interface Supply {
  /** Pledged but not delivered yet: the part that can still go to the next schools. */
  available: number
  delivered: number
}

export function supplyOf(pledges: PledgeLike[]): Record<ResourceType, Supply> {
  const out = Object.fromEntries(RESOURCES.map((r) => [r, { available: 0, delivered: 0 }])) as Record<ResourceType, Supply>
  for (const p of pledges) out[p.resource][p.status === 'delivered' ? 'delivered' : 'available'] += p.quantity
  return out
}

// ---------- gaps ----------

export interface ResourceGap extends Supply {
  resource: ResourceType
  needed: number
  /** The part of the need that available pledges cover. */
  covered: number
  /** Needed minus available, never below 0. */
  gap: number
  /** Available minus needed, never below 0. */
  surplus: number
  /** Partners with a pledge of this resource (delivered or not), in the order they first pledged. */
  partnerIds: string[]
  /** No partner has pledged this resource at all. */
  noPledge: boolean
}

export function resourceGaps(demand: Record<ResourceType, number>, pledges: PledgeLike[]): ResourceGap[] {
  const supply = supplyOf(pledges)
  return RESOURCES.map((resource) => {
    const needed = demand[resource]
    const { available, delivered } = supply[resource]
    const own = pledges.filter((p) => p.resource === resource)
    return {
      resource,
      needed,
      available,
      delivered,
      covered: Math.min(needed, available),
      gap: Math.max(0, needed - available),
      surplus: Math.max(0, available - needed),
      partnerIds: [...new Set(own.map((p) => p.partnerId))],
      noPledge: own.length === 0,
    }
  })
}

/**
 * The resource with the largest share of its need not covered (units differ, so shares compare
 * fairly). Ties: the larger need. Null when every need is covered.
 */
export function biggestGap(rows: ResourceGap[]): ResourceGap | null {
  const short = rows.filter((r) => r.gap > 0)
  if (short.length === 0) return null
  return short.reduce((best, r) => {
    const share = r.gap / r.needed
    const bestShare = best.gap / best.needed
    return share > bestShare || (share === bestShare && r.needed > best.needed) ? r : best
  })
}

// ---------- wording ----------

/** "40 laptops", "9,000,000 CFA francs". */
export function amount(resource: ResourceType, n: number): string {
  return `${n.toLocaleString('en')} ${RESOURCE_UNITS[resource]}`
}

/** "40 laptops pledged, 95 needed for the next 20 schools. Short by 55." */
export function gapSentence(row: ResourceGap, schoolCount: number): string {
  const forSchools = `for the next ${schoolCount} school${schoolCount === 1 ? '' : 's'}`
  const pledged = `${amount(row.resource, row.available)} pledged`
  if (row.needed === 0) {
    return `${pledged}. None needed ${forSchools}${row.available > 0 ? `, so all ${row.available.toLocaleString('en')} are spare` : ''}.`
  }
  const needed = `${row.needed.toLocaleString('en')} needed ${forSchools}`
  if (row.gap > 0) return `${pledged}, ${needed}. Short by ${row.resource === 'funding' ? amount('funding', row.gap) : row.gap.toLocaleString('en')}.`
  if (row.surplus > 0) return `${pledged}, ${needed}. Covered, with ${row.surplus.toLocaleString('en')} spare.`
  return `${pledged}, ${needed}. Exactly covered.`
}

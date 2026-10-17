// Which partners can supply a kit. Plain lookup by tier, no AI.
import { distanceKm, type Point, type Tier } from './scoring.ts'
import type { Partner, PartnerType } from './types.ts'

/** Partner types that supply the parts of each tier's kit. Transporters are shown on the shipment instead. */
const SUPPLIER_TYPES: Record<Tier, PartnerType[]> = {
  0: ['solar installer'], // solar lamps; the workbooks and training are not covered by a partner yet
  1: ['solar installer', 'refurbisher', 'laptop donor'],
  2: ['refurbisher', 'laptop donor'],
  3: ['refurbisher', 'laptop donor'],
}

export interface MatchedPartner {
  partner: Partner
  km: number
}

/** The `count` most trusted suppliers for the tier (ties: nearer wins), listed nearest first. */
export function matchPartners(tier: Tier, school: Point, partners: Partner[], count = 3): MatchedPartner[] {
  return partners
    .filter((p) => SUPPLIER_TYPES[tier].includes(p.type))
    .map((partner) => ({ partner, km: distanceKm(school, partner) }))
    .sort((a, b) => b.partner.trust - a.partner.trust || a.km - b.km)
    .slice(0, count)
    .sort((a, b) => a.km - b.km)
}

// Which partners can supply a kit. Plain lookup by tier, no AI.
import { distanceKm, type Point, type Tier } from './scoring.ts'
import type { Partner, PartnerType } from './types.ts'

/** Partner types that supply the parts of each tier's kit. Transporters are shown on the shipment instead. */
const SUPPLIER_TYPES: Record<Tier, PartnerType[]> = {
  0: ['solar installer', 'education NGO'], // solar lamps, printed workbooks and training
  1: ['solar installer', 'refurbisher', 'laptop donor'],
  2: ['refurbisher', 'laptop donor'],
  3: ['refurbisher', 'laptop donor'],
}

/** Every tier's kit has a teacher training day, so any tier can also list an education NGO. */
const TRAINING_TYPE: PartnerType = 'education NGO'

export interface MatchedPartner {
  partner: Partner
  km: number
}

function rank(tier: PartnerType[], school: Point, partners: Partner[]): MatchedPartner[] {
  return partners
    .filter((p) => tier.includes(p.type))
    .map((partner) => ({ partner, km: distanceKm(school, partner) }))
    .sort((a, b) => b.partner.trust - a.partner.trust || a.km - b.km)
}

/**
 * The `count` most trusted suppliers for the tier (ties: nearer wins), plus the best education NGO
 * for the teacher training item if it is not already among them. Listed nearest first.
 */
export function matchPartners(tier: Tier, school: Point, partners: Partner[], count = 3): MatchedPartner[] {
  const matches = rank(SUPPLIER_TYPES[tier], school, partners).slice(0, count)
  if (!matches.some((m) => m.partner.type === TRAINING_TYPE)) {
    const trainer = rank([TRAINING_TYPE], school, partners)[0]
    if (trainer) matches.push(trainer)
  }
  return matches.sort((a, b) => a.km - b.km)
}

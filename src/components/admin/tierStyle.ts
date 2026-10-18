import type { Tier } from '../../lib/scoring'
import type { SchoolStatus } from '../../lib/types'

// Brand colours as a readiness scale: red (not ready) → yellow → navy → green (ready). Unassessed is mid grey.
// The number is always shown in or beside the colour, so nobody has to tell red from green.
export const UNASSESSED_COLOR = '#A3A3A3'

export const TIER_COLORS: Record<Tier, string> = {
  0: '#CE1126', // brand red
  1: '#FDBB2F', // brand yellow
  2: '#002D62', // brand navy
  3: '#007A5E', // brand green
}

export const tierColor = (tier: Tier | null) => (tier === null ? UNASSESSED_COLOR : TIER_COLORS[tier])

/** CSS class that sets background and a text colour that passes WCAG AA on it. */
export const tierClass = (tier: Tier | null) => (tier === null ? 'tier-none' : `tier-${tier}`)

/** One plain sentence per tier: what it means for the school. */
export const TIER_HELP: Record<Tier, string> = {
  0: 'No power yet. Starts with solar lamps and printed workbooks.',
  1: 'Solar power is possible. Gets a small solar learning corner.',
  2: 'Has grid power. Gets laptops protected against power cuts.',
  3: 'Reliable power and fast signal. Ready for a full computer lab.',
}

export const TIER_EXPLAINER =
  'The readiness tier (0 to 3) says how ready a school is for devices. It follows from the survey answers on power and mobile signal.'

export const STATUSES: SchoolStatus[] = ['unassessed', 'assessed', 'kit approved', 'in transit', 'delivered', 'verified']

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ---------- learning colours: mastery rate in three bands ----------

export type ColorBy = 'tier' | 'learning'

export const MASTERY_BANDS = [
  { label: 'Under 50% mastered', color: '#CE1126', className: 'band-low' },
  { label: '50-79% mastered', color: '#FDBB2F', className: 'band-mid' },
  { label: '80% or more mastered', color: '#007A5E', className: 'band-high' },
] as const

function band(rate: number) {
  return MASTERY_BANDS[rate >= 80 ? 2 : rate >= 50 ? 1 : 0]
}

/** Colour for a mastery rate (percent); grey when the school has no learning data. */
export function masteryColor(rate: number | null): string {
  return rate === null ? UNASSESSED_COLOR : band(rate).color
}

export function masteryClass(rate: number | null): string {
  return rate === null ? 'band-none' : band(rate).className
}

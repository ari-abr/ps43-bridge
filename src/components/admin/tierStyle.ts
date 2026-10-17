import type { Tier } from '../../lib/scoring'
import type { SchoolStatus } from '../../lib/types'

export const UNASSESSED_COLOR = '#9aa0a6'

export const TIER_COLORS: Record<Tier, string> = {
  0: '#c0392b', // red
  1: '#f0a500', // amber
  2: '#2e86c1', // blue
  3: '#1e8449', // green
}

export const tierColor = (tier: Tier | null) => (tier === null ? UNASSESSED_COLOR : TIER_COLORS[tier])

export const STATUSES: SchoolStatus[] = ['unassessed', 'assessed', 'kit approved', 'in transit', 'delivered', 'verified']

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ---------- learning colours: mastery rate in three bands ----------

export type ColorBy = 'tier' | 'learning'

export const MASTERY_BANDS = [
  { label: 'Under 50%', color: '#c0392b' },
  { label: '50-79%', color: '#f0a500' },
  { label: '80%+', color: '#1e8449' },
] as const

/** Colour for a mastery rate (percent); grey when the school has no learning data. */
export function masteryColor(rate: number | null): string {
  if (rate === null) return UNASSESSED_COLOR
  return MASTERY_BANDS[rate >= 80 ? 2 : rate >= 50 ? 1 : 0].color
}

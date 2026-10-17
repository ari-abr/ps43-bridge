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

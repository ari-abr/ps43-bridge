// Tier and need-score rules. Used by scripts/seed.ts and by the app, so both agree.
// Plain rules and a weighted sum. No AI.

export type Power = 'none' | 'solar possible' | 'unreliable grid' | 'reliable grid'
export type Signal = 'none' | '2G' | '3G' | '4G'
export type Tier = 0 | 1 | 2 | 3

export const POWER_OPTIONS: Power[] = ['none', 'solar possible', 'unreliable grid', 'reliable grid']
export const SIGNAL_OPTIONS: Signal[] = ['none', '2G', '3G', '4G']

export const TIER_LABELS: Record<Tier, string> = {
  0: 'Tier 0: no power',
  1: 'Tier 1: solar',
  2: 'Tier 2: grid, protected',
  3: 'Tier 3: full lab',
}

/**
 * Readiness tier from survey answers:
 *   Tier 3  reliable grid and 3G or 4G
 *   Tier 2  unreliable grid with any signal, or reliable grid with weak/no signal
 *   Tier 1  solar possible, or unreliable grid with no signal
 *   Tier 0  no power
 */
export function tierFromSurvey(power: Power, signal: Signal): Tier {
  const hasSignal = signal !== 'none'
  const fastSignal = signal === '3G' || signal === '4G'
  switch (power) {
    case 'none':
      return 0
    case 'solar possible':
      return 1
    case 'unreliable grid':
      return hasSignal ? 2 : 1
    case 'reliable grid':
      return fastSignal ? 3 : 2
  }
}

// ---------- need score ----------

export interface NeedWeights {
  pupilsPerDevice: number // pupils per device gap
  readiness: number // how far the tier is from 3
  distance: number // distance to the nearest equipped school
}

/** Defaults. The map's sliders can pass their own weights to needScore(). */
export const DEFAULT_WEIGHTS: NeedWeights = {
  pupilsPerDevice: 0.4,
  readiness: 0.35,
  distance: 0.25,
}

/** One device for every 10 pupils counts as "no gap". */
export const TARGET_PUPILS_PER_DEVICE = 10
/** Distances beyond this count as the maximum gap. */
export const MAX_DISTANCE_KM = 100

export interface NeedInput {
  pupils: number
  devices: number // working devices the school already has (0 if none)
  tier: Tier
  /** km to the nearest equipped school, or null if there is none. */
  distanceToEquippedKm: number | null
}

export interface NeedBreakdown {
  pupilsPerDeviceGap: number // 0..1
  readinessGap: number // 0..1
  distanceGap: number // 0..1
  score: number // 0..100
}

export function needBreakdown(input: NeedInput, weights: NeedWeights = DEFAULT_WEIGHTS): NeedBreakdown {
  const ppd = input.pupils / Math.max(input.devices, 1)
  const pupilsPerDeviceGap = ppd <= TARGET_PUPILS_PER_DEVICE ? 0 : 1 - TARGET_PUPILS_PER_DEVICE / ppd
  const readinessGap = (3 - input.tier) / 3
  const distanceGap =
    input.distanceToEquippedKm === null ? 1 : Math.min(1, input.distanceToEquippedKm / MAX_DISTANCE_KM)

  const total = weights.pupilsPerDevice + weights.readiness + weights.distance
  const weighted =
    weights.pupilsPerDevice * pupilsPerDeviceGap + weights.readiness * readinessGap + weights.distance * distanceGap
  const score = total > 0 ? Math.round((weighted / total) * 1000) / 10 : 0
  return { pupilsPerDeviceGap, readinessGap, distanceGap, score }
}

/** Need score from 0 to 100. Higher means more in need. */
export function needScore(input: NeedInput, weights: NeedWeights = DEFAULT_WEIGHTS): number {
  return needBreakdown(input, weights).score
}

// ---------- distance ----------

export interface Point {
  lat: number
  lng: number
}

export function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/** Distance to the closest point in `others` (ignoring identical points), or null if the list is empty. */
export function nearestKm(from: Point, others: Point[]): number | null {
  let best: number | null = null
  for (const p of others) {
    if (p.lat === from.lat && p.lng === from.lng) continue
    const d = distanceKm(from, p)
    if (best === null || d < best) best = d
  }
  return best
}

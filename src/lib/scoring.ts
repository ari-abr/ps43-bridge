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

/** One factor of the need score, in plain words for the "Why this score?" panel. */
export interface ScoreFactor {
  key: keyof NeedWeights
  label: string
  /** The school's value in plain words, e.g. "42 pupils per device". */
  value: string
  /** Short phrase for "Mostly driven by: ...", e.g. "no devices". */
  driver: string
  gap: number // 0..1
  /** The most points this factor can give with the current weights. */
  maxPoints: number
  /** Points it gives this school. The factors' points add up exactly to the score. */
  points: number
}

export interface ScoreBreakdown {
  factors: ScoreFactor[]
  score: number // 0..100
}

const READINESS_DRIVER: Record<Tier, string> = {
  0: 'no power',
  1: 'only solar power possible',
  2: 'unreliable power or weak signal',
  3: 'nothing (ready for a full lab)',
}

/** The need score and what each factor adds to it. needScore() uses this, so both always agree. */
export function getScoreBreakdown(input: NeedInput, weights: NeedWeights = DEFAULT_WEIGHTS): ScoreBreakdown {
  const ppd = input.pupils / Math.max(input.devices, 1)
  const pupilsPerDeviceGap = ppd <= TARGET_PUPILS_PER_DEVICE ? 0 : 1 - TARGET_PUPILS_PER_DEVICE / ppd
  const readinessGap = (3 - input.tier) / 3
  const km = input.distanceToEquippedKm
  const distanceGap = km === null ? 1 : Math.min(1, km / MAX_DISTANCE_KM)

  const total = weights.pupilsPerDevice + weights.readiness + weights.distance
  const weighted =
    weights.pupilsPerDevice * pupilsPerDeviceGap + weights.readiness * readinessGap + weights.distance * distanceGap
  const score = total > 0 ? Math.round((weighted / total) * 1000) / 10 : 0

  const factors: Omit<ScoreFactor, 'maxPoints' | 'points'>[] = [
    {
      key: 'pupilsPerDevice',
      label: 'Pupils per device',
      value: input.devices === 0 ? `${input.pupils} pupils, no devices yet` : `${Math.round(ppd)} pupils per device`,
      driver: input.devices === 0 ? 'no devices' : 'many pupils per device',
      gap: pupilsPerDeviceGap,
    },
    {
      key: 'readiness',
      label: 'Readiness gap',
      value: TIER_LABELS[input.tier],
      driver: READINESS_DRIVER[input.tier],
      gap: readinessGap,
    },
    {
      key: 'distance',
      label: 'Distance',
      value: km === null ? 'No school with a kit yet' : `${Math.round(km)} km to the nearest school with a kit`,
      driver: km === null ? 'no school with a kit nearby' : 'far from a school with a kit',
      gap: distanceGap,
    },
  ]
  const share = (f: { key: keyof NeedWeights }) => (total > 0 ? weights[f.key] / total : 0)
  const maxTenths = factors.map((f) => Math.round(share(f) * 1000))
  const points = splitTenths(
    factors.map((f) => share(f) * f.gap * 1000),
    maxTenths,
    Math.round(score * 10),
  )
  return {
    factors: factors.map((f, i) => ({ ...f, maxPoints: maxTenths[i] / 10, points: points[i] / 10 })),
    score,
  }
}

/**
 * Round each part to a whole number so they add up to `target`: largest remainder first, and
 * preferring parts still under their cap, so a factor rarely shows more than its maximum.
 */
function splitTenths(parts: number[], caps: number[], target: number): number[] {
  const whole = parts.map(Math.floor)
  const order = parts.map((_, i) => i).sort((a, b) => parts[b] - whole[b] - (parts[a] - whole[a]))
  let left = target - whole.reduce((a, b) => a + b, 0)
  // Normally 0 to 3 tenths to add; a tiny float error can make it -1, so then take one back.
  for (; left > 0; left--) {
    const i = order.find((j) => whole[j] < caps[j] && whole[j] < Math.ceil(parts[j])) ?? order.find((j) => whole[j] < caps[j]) ?? order[0]
    whole[i]++
  }
  for (const i of [...order].reverse()) {
    if (left < 0 && whole[i] > 0) {
      whole[i]--
      left++
    }
  }
  return whole
}

/** Need score from 0 to 100. Higher means more in need. */
export function needScore(input: NeedInput, weights: NeedWeights = DEFAULT_WEIGHTS): number {
  return getScoreBreakdown(input, weights).score
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

import { TIER_LABELS, type Tier } from '../../lib/scoring'
import { tierClass } from './tierStyle'

/** Round tier marker with the number inside (grey "?" when unassessed), plus the tier in words if `withLabel`. */
export default function TierBadge({ tier, withLabel = false }: { tier: Tier | null; withLabel?: boolean }) {
  const words = tier === null ? 'Unassessed' : TIER_LABELS[tier]
  return (
    <span className="tier-badge-wrap">
      <span className={`tier-badge ${tierClass(tier)}`} aria-hidden="true" title={withLabel ? undefined : words}>
        {tier ?? '?'}
      </span>
      {withLabel ? <span>{words}</span> : <span className="sr-only">{words}</span>}
    </span>
  )
}

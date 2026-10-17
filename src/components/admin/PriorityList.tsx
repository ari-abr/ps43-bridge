import type { SchoolView } from '../../lib/api'
import { TIER_LABELS } from '../../lib/scoring'
import { capitalise, tierColor } from './tierStyle'

export interface RankedSchool {
  school: SchoolView
  score: number
}

interface Props {
  loading: boolean
  ranked: RankedSchool[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function PriorityList({ loading, ranked, selectedId, onSelect }: Props) {
  if (loading) return <p className="muted small">Loading schools…</p>
  if (ranked.length === 0) return <p className="muted small">No assessed schools match the filters.</p>

  return (
    <ol className="priority-list">
      {ranked.map(({ school, score }, i) => (
        <li key={school.id}>
          <button
            type="button"
            className={`priority-row ${school.id === selectedId ? 'is-selected' : ''}`}
            onClick={() => onSelect(school.id)}
            aria-pressed={school.id === selectedId}
          >
            <span className="rank">{i + 1}</span>
            <span className="priority-main">
              <span className="priority-name">{school.name}</span>
              <span className="muted small">
                {school.region} · {capitalise(school.status)}
              </span>
            </span>
            <span className="priority-score">
              <strong>{score.toFixed(1)}</strong>
              <span className="tier-dot" style={{ background: tierColor(school.tier) }} aria-hidden="true" />
              <span className="sr-only">{school.tier === null ? 'Unassessed' : TIER_LABELS[school.tier]}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

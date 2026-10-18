import { useState } from 'react'
import type { SchoolView } from '../../lib/api'
import type { RankedSchool } from '../../lib/resourceGaps'
import TierBadge from './TierBadge'
import { capitalise } from './tierStyle'

interface Props {
  loading: boolean
  /** Assessed schools with no kit yet, highest need score first. */
  next: RankedSchool[]
  /** Schools with a kit approved, in transit, delivered or verified, highest need score first. */
  inProgress: RankedSchool[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const STATUS_CHIP: Partial<Record<SchoolView['status'], string>> = {
  'kit approved': 'chip-wait',
  'in transit': 'chip-wait',
  delivered: 'chip-ok',
  verified: 'chip-ok',
}

interface RowProps extends RankedSchool {
  /** Shown for "Next to equip" only. */
  rank?: number
  selectedId: string | null
  onSelect: (id: string) => void
}

function Row({ school, score, rank, selectedId, onSelect }: RowProps) {
  return (
    <li>
      <button
        type="button"
        className={`priority-row ${school.id === selectedId ? 'is-selected' : ''}`}
        onClick={() => onSelect(school.id)}
        aria-pressed={school.id === selectedId}
      >
        {rank !== undefined && <span className="rank">{rank}</span>}
        <span className="priority-main">
          <span className="priority-name">{school.name}</span>
          {rank !== undefined ? (
            <span className="muted small">{school.region}</span>
          ) : (
            <span className="priority-status">
              <span className={`chip ${STATUS_CHIP[school.status] ?? ''}`}>{capitalise(school.status)}</span>
              <span className="muted small">{school.region}</span>
            </span>
          )}
        </span>
        <span className="priority-score">
          <strong>{score.toFixed(1)}</strong>
          <TierBadge tier={school.tier} />
        </span>
      </button>
    </li>
  )
}

export default function PriorityList({ loading, next, inProgress, selectedId, onSelect }: Props) {
  const [showInProgress, setShowInProgress] = useState(false)

  if (loading) return <p className="muted small">Loading schools…</p>
  if (next.length === 0 && inProgress.length === 0) return <p className="muted small">No assessed schools match the filters.</p>

  return (
    <>
      <h3 className="label-rule">Next to equip ({next.length})</h3>
      {next.length === 0 ? (
        <p className="muted small">Every assessed school shown already has a kit.</p>
      ) : (
        <ol className="priority-list">
          {next.map((r, i) => (
            <Row key={r.school.id} {...r} rank={i + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ol>
      )}

      {inProgress.length > 0 && (
        <>
          <button
            type="button"
            className="btn-link list-toggle"
            aria-expanded={showInProgress}
            aria-controls="in-progress-list"
            onClick={() => setShowInProgress((v) => !v)}
          >
            {showInProgress ? 'Hide in progress' : `Show in progress (${inProgress.length})`}
          </button>
          <div id="in-progress-list" hidden={!showInProgress}>
            <h3 className="label-rule">In progress ({inProgress.length})</h3>
            <p className="muted small">Kit already approved, on its way or delivered.</p>
            <ul className="priority-list">
              {inProgress.map((r) => (
                <Row key={r.school.id} {...r} selectedId={selectedId} onSelect={onSelect} />
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  )
}

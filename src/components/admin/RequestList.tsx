import { useMemo, useState } from 'react'
import type { SchoolView } from '../../lib/api'
import { REQUEST_CATEGORIES, byPriorityThenDate, isOpen } from '../../lib/requests'
import { PriorityChip, RequestStatusChip, dateOf } from '../ui/RequestBits'

interface Props {
  loading: boolean
  /** The schools the filters show. */
  schools: SchoolView[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Open requests from the schools shown, Urgent first, oldest first within a priority. */
export default function RequestList({ loading, schools, selectedId, onSelect }: Props) {
  const [category, setCategory] = useState('all')

  const open = useMemo(
    () =>
      schools
        .flatMap((school) => school.requests.filter((r) => isOpen(r.status)).map((request) => ({ school, request })))
        .filter(({ request }) => category === 'all' || request.category === category)
        .sort((a, b) => byPriorityThenDate(a.request, b.request)),
    [schools, category],
  )

  return (
    <>
      <div className="picker-filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {REQUEST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="muted small">Loading requests…</p>
      ) : open.length === 0 ? (
        <p className="muted small">No open requests{category === 'all' ? '' : ` for ${category}`} in the schools shown.</p>
      ) : (
        <ol className="priority-list">
          {open.map(({ school, request }) => (
            <li key={request.id}>
              <button
                type="button"
                className={`priority-row ${school.id === selectedId ? 'is-selected' : ''}`}
                onClick={() => onSelect(school.id)}
                aria-pressed={school.id === selectedId}
              >
                <span className="priority-main">
                  <span className="priority-name">
                    {request.item} × {request.quantity}
                  </span>
                  <span className="muted small">
                    {school.name} · {request.category} · {dateOf(request.createdAt)}
                  </span>
                  <span className="request-chips">
                    <PriorityChip priority={request.priority} />
                    <RequestStatusChip status={request.status} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

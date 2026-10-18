import { useState } from 'react'
import type { AttentionItem, Severity } from '../../lib/attention'

const FIRST_SHOWN = 6

const SEVERITY_LABEL: Record<Severity, string> = { high: 'High', medium: 'Medium', low: 'Low' }

interface Props {
  loading: boolean
  items: AttentionItem[]
  selectedId: string | null
  onSelect: (schoolId: string) => void
}

/** Things that are stuck and need a person to act. Items come from getAttentionItems() in src/lib/attention.ts. */
export default function AttentionPanel({ loading, items, selectedId, onSelect }: Props) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? items : items.slice(0, FIRST_SHOWN)

  return (
    <section className="admin-attention card" aria-labelledby="attention-title">
      <h2 id="attention-title" className="section-title">
        Needs attention{!loading && ` (${items.length})`}
      </h2>
      {loading ? (
        <p className="muted small">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">Nothing needs attention right now.</p>
      ) : (
        <>
          <ul className="attention-list" id="attention-list">
            {shown.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`attention-row ${item.schoolId === selectedId ? 'is-selected' : ''}`}
                  onClick={() => onSelect(item.schoolId)}
                >
                  <span className={`severity-dot severity-${item.severity}`} aria-hidden="true" />
                  <span className="priority-main">
                    <span className="attention-title">
                      <span className="sr-only">{SEVERITY_LABEL[item.severity]}: </span>
                      {item.title}
                    </span>
                    <span className="small">{item.detail}</span>
                    <span className="muted small attention-school">{item.schoolName}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {items.length > FIRST_SHOWN && (
            <button
              type="button"
              className="btn-link"
              aria-expanded={showAll}
              aria-controls="attention-list"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show fewer' : `Show all (${items.length})`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

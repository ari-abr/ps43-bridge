import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSchools, subscribe, type SchoolView } from '../../lib/api'
import { setDeviceSchool } from '../../lib/learning'
import { capitalise, tierColor } from '../admin/tierStyle'

interface Props {
  /** Shown when changing an already chosen school. */
  onCancel?: () => void
  onChosen: () => void
}

const hasDevices = (s: SchoolView) => s.status === 'delivered' || s.status === 'verified'

/** "Which school is this device at?" Uses the same school list and ids as the Admin Map. */
export default function DeviceSchoolPicker({ onCancel, onChosen }: Props) {
  const [schools, setSchools] = useState<SchoolView[] | null>(null)
  const [search, setSearch] = useState('')

  // Each fake-server call takes ~300 ms, so ignore answers that arrive out of order.
  const latestLoad = useRef(0)
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    const result = await getSchools()
    if (id === latestLoad.current) setSchools(result)
  }, [])

  useEffect(() => {
    void load()
    return subscribe(() => void load())
  }, [load])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const shown = (schools ?? [])
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
    return [
      { title: 'Schools with devices', schools: shown.filter(hasDevices) },
      { title: 'Other schools', schools: shown.filter((s) => !hasDevices(s)) },
    ]
  }, [schools, search])

  function choose(id: string) {
    setDeviceSchool(id)
    onChosen()
  }

  return (
    <div className="card">
      <h2>Which school is this device at?</h2>
      <p className="muted small">Asked once. Student names and progress stay on this device.</p>
      <div className="picker-filters">
        <input
          type="search"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search schools by name"
        />
      </div>

      {schools === null ? (
        <p className="muted">Loading schools…</p>
      ) : (
        <div className="picker-list">
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="picker-group">
                {g.title} <span className="muted small">({g.schools.length})</span>
              </h3>
              <ul className="recent-list">
                {g.schools.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="picker-row" onClick={() => choose(s.id)}>
                      <span className="picker-main">
                        <span className="picker-name">{s.name}</span>
                        <span className="muted small">{s.region}</span>
                      </span>
                      <span className="picker-status small">
                        <span className="tier-dot" style={{ background: tierColor(s.tier) }} />
                        <span className="pill">{capitalise(s.status)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {g.schools.length === 0 && <p className="muted small">No schools match.</p>}
            </div>
          ))}
        </div>
      )}

      {onCancel && (
        <button type="button" className="btn-link" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}

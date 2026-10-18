import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getOutbox, getSchools, subscribe, type SchoolView, type SurveyRecord } from '../../lib/api'
import { tierFromSurvey, type Tier } from '../../lib/scoring'
import TierBadge from '../admin/TierBadge'

interface Props {
  onSelect: (school: SchoolView) => void
}

/** Tier of the newest survey this device has not uploaded yet, per school. */
function waitingTiers(): Map<string, Tier> {
  const tiers = new Map<string, Tier>()
  // getOutbox is newest first, so the first one seen per school wins.
  for (const item of getOutbox('surveys')) {
    const s = item.record as SurveyRecord
    if (item.state === 'waiting' && !tiers.has(s.schoolId)) tiers.set(s.schoolId, tierFromSurvey(s.power, s.signal))
  }
  return tiers
}

export default function SchoolPicker({ onSelect }: Props) {
  const [schools, setSchools] = useState<SchoolView[] | null>(null)
  const [waiting, setWaiting] = useState(waitingTiers)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')

  // Each fake-server call takes ~300 ms, so ignore answers that arrive out of order.
  const latestLoad = useRef(0)
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    const result = await getSchools()
    if (id === latestLoad.current) setSchools(result)
  }, [])

  useEffect(() => {
    void load()
    return subscribe(() => {
      setWaiting(waitingTiers())
      void load()
    })
  }, [load])

  const regions = useMemo(() => [...new Set((schools ?? []).map((s) => s.region))].sort(), [schools])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (schools ?? [])
      .filter((s) => (region === 'all' || s.region === region) && (!q || s.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        const aNew = a.tier === null && !waiting.has(a.id)
        const bNew = b.tier === null && !waiting.has(b.id)
        return Number(bNew) - Number(aNew) || a.name.localeCompare(b.name)
      })
  }, [schools, search, region, waiting])

  return (
    <div className="card">
      <h2 className="section-title">Choose a school</h2>
      <p className="help">Grey schools (?) have no survey yet and are listed first.</p>
      <div className="picker-filters">
        <input
          type="search"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search schools by name"
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {schools === null ? (
        <p className="muted">Loading schools…</p>
      ) : (
        <>
          <p className="muted small">
            {shown.length} school{shown.length === 1 ? '' : 's'}, unassessed first
          </p>
          <ul className="picker-list">
            {shown.map((s) => {
              const pending = waiting.get(s.id)
              const tier = pending ?? s.tier
              return (
                <li key={s.id}>
                  <button type="button" className="picker-row" onClick={() => onSelect(s)}>
                    <span className="picker-main">
                      <span className="picker-name">{s.name}</span>
                      <span className="muted small">{s.region}</span>
                    </span>
                    <span className="picker-status small">
                      <TierBadge tier={tier} withLabel={false} />
                      <span aria-hidden="true">{tier === null ? 'Unassessed' : `Tier ${tier}`}</span>
                      {pending !== undefined && <span className="pill pill-demo">waiting to upload</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {shown.length === 0 && <p className="muted">No schools match.</p>}
        </>
      )}
    </div>
  )
}

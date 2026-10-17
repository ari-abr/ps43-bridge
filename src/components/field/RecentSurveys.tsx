import { useEffect, useState } from 'react'
import { getOutbox, schoolName, subscribe, type SurveyRecord } from '../../lib/api'
import { tierFromSurvey } from '../../lib/scoring'
import { tierColor } from '../admin/tierStyle'

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** Surveys saved on this device, with their upload state. */
export default function RecentSurveys() {
  const [items, setItems] = useState(() => getOutbox('surveys'))
  useEffect(() => subscribe(() => setItems(getOutbox('surveys'))), [])

  return (
    <div className="card">
      <h2>My recent surveys</h2>
      {items.length === 0 ? (
        <p className="muted">No surveys saved on this device yet.</p>
      ) : (
        <ul className="recent-list">
          {items.map((item) => {
            const s = item.record as SurveyRecord
            const tier = tierFromSurvey(s.power, s.signal)
            return (
              <li key={s.id} className="recent-row">
                <span className="picker-main">
                  <span className="picker-name">{schoolName(s.schoolId)}</span>
                  <span className="muted small">
                    <span className="tier-dot" style={{ background: tierColor(tier) }} /> Tier {tier} · saved{' '}
                    {timeOf(item.savedAt)}
                  </span>
                </span>
                {item.state === 'waiting' ? (
                  <span className="badge badge-wait">Waiting to upload</span>
                ) : (
                  <span className="badge badge-ok">Uploaded {timeOf(item.uploadedAt!)}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

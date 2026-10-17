import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  getOutbox,
  getSchools,
  newId,
  saveRecord,
  schoolName,
  subscribe,
  type CheckinRecord,
  type SchoolView,
} from '../../lib/api'
import { capitalise } from '../admin/tierStyle'

const timeOf = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const hasKit = (s: SchoolView) => s.status === 'delivered' || s.status === 'verified'

/** Monthly check-in: how many of a school's delivered devices are working, broken or missing. */
export default function Checkins() {
  const [schools, setSchools] = useState<SchoolView[] | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (schools ?? [])
      .filter((s) => hasKit(s) && (!q || s.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [schools, search])

  const school = schools?.find((s) => s.id === schoolId)
  if (school?.shipment) return <CheckinForm key={school.id} school={school} onDone={() => setSchoolId(null)} />

  return (
    <>
      <div className="card">
        <h2>Monthly check-in</h2>
        <p className="muted small">Schools with a delivered or verified kit.</p>
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
        ) : shown.length === 0 ? (
          <p className="muted">No schools with a delivered kit{search ? ' match' : ' yet'}.</p>
        ) : (
          <ul className="picker-list">
            {shown.map((s) => (
              <li key={s.id}>
                <button type="button" className="picker-row" onClick={() => setSchoolId(s.id)}>
                  <span className="picker-main">
                    <span className="picker-name">{s.name}</span>
                    <span className="muted small">
                      {s.region} · {s.shipment!.devices.length} devices
                      {s.checkin ? ` · last check-in ${timeOf(s.checkin.checkedAt)}` : ' · no check-in yet'}
                    </span>
                  </span>
                  <span className="picker-status small">
                    <span className="pill">{capitalise(s.status)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <RecentCheckins />
    </>
  )
}

type Counts = { working: string; broken: string; missing: string }

function CheckinForm({ school, onDone }: { school: SchoolView; onDone: () => void }) {
  const shipment = school.shipment!
  const delivered = shipment.devices.length
  const [counts, setCounts] = useState<Counts>({ working: String(delivered), broken: '0', missing: '0' })
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'editing' | 'saving' | 'queued' | 'uploaded'>('editing')

  const n = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN)
  const total = n(counts.working) + n(counts.broken) + n(counts.missing)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if ([counts.working, counts.broken, counts.missing].some((v) => Number.isNaN(n(v)))) {
      setError('Use whole numbers (0 or more) in each box.')
      return
    }
    if (total !== delivered) {
      setError(`Working + broken + missing must add up to ${delivered} (now ${total}).`)
      return
    }
    setError(null)
    setState('saving')
    const record: CheckinRecord = {
      id: newId('ci'),
      schoolId: school.id,
      shipmentId: shipment.id,
      working: n(counts.working),
      broken: n(counts.broken),
      missing: n(counts.missing),
      note: note.trim(),
      checkedAt: new Date().toISOString(),
    }
    try {
      setState(await saveRecord('checkins', record))
    } catch {
      setState('editing')
      setError('Could not save (device storage full?). Try again.')
    }
  }

  if (state === 'queued' || state === 'uploaded') {
    return (
      <div className="card">
        <h2>{school.name}</h2>
        <div className={`save-result ${state === 'queued' ? 'is-queued' : 'is-uploaded'}`} role="status">
          <strong>{state === 'queued' ? 'Check-in saved on this device, will upload when Online.' : 'Check-in uploaded.'}</strong>
          <p>
            {counts.working} working · {counts.broken} broken · {counts.missing} missing
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onDone}>
          Done
        </button>
      </div>
    )
  }

  const field = (key: keyof Counts, label: string) => (
    <label className="count">
      <span className="count-label">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={counts[key]}
        onChange={(e) => setCounts({ ...counts, [key]: e.target.value })}
      />
    </label>
  )

  return (
    <form className="card survey-form" onSubmit={submit} noValidate>
      <button type="button" className="btn-link" onClick={onDone}>
        ← All schools
      </button>
      <h2>{school.name}</h2>
      <p className="muted small">
        {delivered} devices delivered ({shipment.id}). Count every one.
      </p>
      <div className="count-row count-row-3">
        {field('working', 'Working')}
        {field('broken', 'Broken')}
        {field('missing', 'Missing')}
      </div>
      <p className={`small ${Number.isNaN(total) || total !== delivered ? 'field-error' : 'muted'}`}>
        Total: {Number.isNaN(total) ? '–' : total} of {delivered}
      </p>
      <label className="stack-label">
        Note (optional)
        <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={state === 'saving'}>
        {state === 'saving' ? 'Saving…' : 'Save check-in'}
      </button>
    </form>
  )
}

function RecentCheckins() {
  const [items, setItems] = useState(() => getOutbox('checkins'))
  useEffect(() => subscribe(() => setItems(getOutbox('checkins'))), [])
  if (items.length === 0) return null
  return (
    <div className="card">
      <h2>My recent check-ins</h2>
      <ul className="recent-list">
        {items.map((item) => {
          const c = item.record as CheckinRecord
          return (
            <li key={c.id} className="recent-row">
              <span className="picker-main">
                <span className="picker-name">{schoolName(c.schoolId)}</span>
                <span className="muted small">
                  {c.working} working · {c.broken} broken · {c.missing} missing
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
    </div>
  )
}

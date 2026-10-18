import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  getQueuedRecords,
  getSchools,
  saveRequestEvent,
  subscribe,
  type RequestEventRecord,
  type RequestView,
  type SchoolView,
} from '../../lib/api'
import { REQUEST_CATEGORIES, byPriorityThenDate, isOpen } from '../../lib/requests'
import { toast, toastSaved } from '../../lib/toast'
import { Arrow, ArrowLeft } from '../ui/Icons'
import { PriorityChip, RequestFacts, RequestHistory, RequestStatusChip } from '../ui/RequestBits'

interface OpenRequest {
  school: SchoolView
  request: RequestView
}

/** This device's checks that have not uploaded yet, by request id. */
const waitingChecks = () => new Set(getQueuedRecords<RequestEventRecord>('requestEvents').map((e) => e.requestId))

/** Open requests from schools. On a visit, open one and mark it as checked with what you found. */
export default function Requests() {
  const [schools, setSchools] = useState<SchoolView[] | null>(null)
  const [region, setRegion] = useState('all')
  const [category, setCategory] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

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

  const all = useMemo<OpenRequest[]>(
    () => (schools ?? []).flatMap((school) => school.requests.map((request) => ({ school, request }))),
    [schools],
  )
  const shown = all
    .filter(({ request }) => isOpen(request.status))
    .filter(({ school }) => region === 'all' || school.region === region)
    .filter(({ request }) => category === 'all' || request.category === category)
    .sort((a, b) => byPriorityThenDate(a.request, b.request))

  // Keep showing an opened request after it is decided, so the save message stays on screen.
  const open = all.find((o) => o.request.id === openId)
  if (open) return <CheckForm key={open.request.id} item={open} onBack={() => setOpenId(null)} />

  const waiting = waitingChecks()

  return (
    <div className="card">
      <h2 className="section-title">Requests</h2>
      <p className="help">
        Equipment and resource requests from teachers, Urgent first. On your visit, open one and mark it as checked
        with what you found.
      </p>
      <div className="picker-filters picker-filters-split">
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
          <option value="all">All regions</option>
          {['Littoral', 'West', 'Centre'].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {REQUEST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {schools === null ? (
        <p className="muted">Loading requests…</p>
      ) : shown.length === 0 ? (
        <p className="muted">No open requests{region === 'all' && category === 'all' ? '' : ' match these filters'}.</p>
      ) : (
        <ul className="picker-list">
          {shown.map(({ school, request }) => (
            <li key={request.id}>
              <button type="button" className="picker-row" onClick={() => setOpenId(request.id)}>
                <span className="picker-main">
                  <span className="picker-name">{school.name}</span>
                  <span className="small">
                    {request.item} × {request.quantity}
                  </span>
                  <span className="muted small request-reason-short">{request.reason}</span>
                </span>
                <span className="picker-status small">
                  <PriorityChip priority={request.priority} />
                  <RequestStatusChip status={request.status} />
                  {waiting.has(request.id) && <span className="pill pill-demo">checked, waiting to upload</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CheckForm({ item, onBack }: { item: OpenRequest; onBack: () => void }) {
  const { school, request } = item
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'editing' | 'saving' | 'queued' | 'uploaded'>('editing')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (note.trim().length < 5) {
      setError('Write what you found on the visit, for example "Confirmed on visit: 3 laptops broken".')
      return
    }
    setError(null)
    setState('saving')
    try {
      const result = await saveRequestEvent({
        requestId: request.id,
        status: 'Checked by coordinator',
        party: 'coordinator',
        note: note.trim(),
      })
      setState(result)
      toastSaved(result, 'Check')
    } catch {
      setState('editing')
      setError('Could not save (device storage full?). Try again.')
      toast('error', 'Could not save the check.')
    }
  }

  const head = (
    <>
      <button type="button" className="btn-link" onClick={onBack}>
        <ArrowLeft /> All requests
      </button>
      <p className="eyebrow eyebrow-dark">
        {school.name} · {school.region}
      </p>
      <h2 className="panel-title">
        {request.item} × {request.quantity}
      </h2>
      <p className="request-chips">
        <PriorityChip priority={request.priority} />
        <RequestStatusChip status={request.status} />
        {request.demo && <span className="chip chip-demo">Demo data</span>}
      </p>
      <RequestFacts request={request} />
      <p className="request-reason">{request.reason}</p>
      <RequestHistory events={request.events} />
    </>
  )

  if (state === 'queued' || state === 'uploaded') {
    return (
      <div className="card survey-form">
        {head}
        <div className={`save-result ${state === 'queued' ? 'is-queued' : 'is-uploaded'}`} role="status">
          <div>
            <strong>
              {state === 'queued'
                ? 'Check saved on this phone. It will upload when you are Online.'
                : 'Check saved and uploaded.'}
            </strong>
            <p>“{note.trim()}”</p>
          </div>
        </div>
        <button type="button" className="btn-primary btn-block" onClick={onBack}>
          Done
        </button>
      </div>
    )
  }

  return (
    <form className="card survey-form" onSubmit={submit} noValidate>
      {head}
      {isOpen(request.status) ? (
        <>
          <label className={`stack-label ${error ? 'has-error' : ''}`}>
            What did you find?
            <textarea
              rows={3}
              maxLength={300}
              value={note}
              placeholder="Confirmed on visit: 3 laptops broken"
              onChange={(e) => setNote(e.target.value)}
              aria-invalid={Boolean(error)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary btn-block btn-big" disabled={state === 'saving'}>
            {state === 'saving' ? 'Saving…' : 'Mark as checked'} {state !== 'saving' && <Arrow />}
          </button>
          <p className="muted small">Works offline: the check waits on this phone until you are Online.</p>
        </>
      ) : (
        <p className="muted">This request is already {request.status.toLowerCase()}, so it no longer needs a check.</p>
      )}
    </form>
  )
}

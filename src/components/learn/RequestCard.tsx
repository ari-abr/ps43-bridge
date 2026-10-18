import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getQueuedRecords, getSchools, saveRequest, subscribe, type RequestRecord, type RequestView } from '../../lib/api'
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '../../lib/requests'
import { toast } from '../../lib/toast'
import type { RequestCategory, RequestPriority, ResourceRequest } from '../../lib/types'
import { useSyncStatus } from '../../lib/useSyncStatus'
import { Choice, Count } from '../field/SurveyForm'
import { Arrow, Check } from '../ui/Icons'
import { PriorityChip, RequestStatusChip, dateOf, partyLabel } from '../ui/RequestBits'

interface Answers {
  category: RequestCategory | ''
  item: string
  quantity: string
  priority: RequestPriority | ''
  reason: string
  pupilsAffected: string
  requestedByRole: ResourceRequest['requestedByRole'] | ''
}

type Errors = Partial<Record<keyof Answers, string>>

const BLANK: Answers = { category: '', item: '', quantity: '', priority: '', reason: '', pupilsAffected: '', requestedByRole: '' }
const ROLES = ['Teacher', 'Headteacher'] as const

function countError(value: string, what: string, max: number): string | undefined {
  const v = value.trim()
  if (!v) return `Enter ${what}.`
  if (!/^\d+$/.test(v)) return 'Use a whole number (no letters, signs or decimals).'
  const n = Number(v)
  if (n < 1) return 'It must be at least 1.'
  if (n > max) return `That looks too high (max ${max}).`
  return undefined
}

function validate(a: Answers): Errors {
  const errors: Errors = {}
  if (!a.category) errors.category = 'Choose a category.'
  if (!a.item.trim()) errors.item = 'Say what is needed.'
  else if (a.item.trim().length < 3) errors.item = 'Describe what is needed in a few words.'
  errors.quantity = countError(a.quantity, 'how many are needed', 999)
  if (!a.priority) errors.priority = 'Choose how soon it is needed.'
  if (!a.reason.trim()) errors.reason = 'Say why it is needed.'
  else if (a.reason.trim().length < 10) errors.reason = 'Add a little more detail (at least 10 characters).'
  errors.pupilsAffected = countError(a.pupilsAffected, 'the number of pupils affected', 9999)
  if (!a.requestedByRole) errors.requestedByRole = 'Say who is asking: Teacher or Headteacher.'
  return errors
}

/** Teacher: ask PS43 for equipment or resources, and follow what happens to each request. */
export default function RequestCard({ schoolId }: { schoolId: string }) {
  const [answers, setAnswers] = useState<Answers>(BLANK)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ id: string; result: 'queued' | 'uploaded' } | null>(null)
  const [failed, setFailed] = useState(false)
  // Re-renders when the queue changes, so a queued request shows "Request sent" once it uploads.
  useSyncStatus()
  const result =
    saved?.result === 'queued' && !getQueuedRecords('requests').some((r) => r.id === saved.id) ? 'uploaded' : saved?.result

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
    setSaved(null)
    setFailed(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validate(answers)
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setSaving(true)
    try {
      const done = await saveRequest({
        schoolId,
        category: answers.category as RequestCategory,
        item: answers.item.trim(),
        quantity: Number(answers.quantity),
        priority: answers.priority as RequestPriority,
        reason: answers.reason.trim(),
        pupilsAffected: Number(answers.pupilsAffected),
        requestedByRole: answers.requestedByRole as ResourceRequest['requestedByRole'],
      })
      setSaved(done)
      setFailed(false)
      setAnswers(BLANK)
      if (done.result === 'uploaded') toast('success', 'Request sent.')
      else toast('warning', 'Request saved on this device, will be sent when online.')
    } catch {
      setFailed(true)
      toast('error', 'Could not save the request on this device.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form className="card survey-form" onSubmit={submit} noValidate>
        <h2 className="section-title">Request equipment or resources</h2>
        <p className="help">
          Ask PS43 for what your school needs. A coordinator checks it on a visit, then PS43 decides. Please do not
          write anyone's name.
        </p>

        <label className={`stack-label ${errors.category ? 'has-error' : ''}`}>
          Category
          <select
            value={answers.category}
            onChange={(e) => set('category', e.target.value as Answers['category'])}
            aria-invalid={Boolean(errors.category)}
          >
            <option value="">Choose a category</option>
            {REQUEST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </label>

        <label className={`stack-label ${errors.item ? 'has-error' : ''}`}>
          What is needed?
          <input
            type="text"
            maxLength={100}
            placeholder="For example: laptop chargers"
            value={answers.item}
            onChange={(e) => set('item', e.target.value)}
            aria-invalid={Boolean(errors.item)}
          />
          {errors.item && <span className="field-error">{errors.item}</span>}
        </label>

        <div className="count-row">
          <Count label="Quantity" value={answers.quantity} error={errors.quantity} onChange={(v) => set('quantity', v)} />
          <Count
            label="Pupils affected"
            value={answers.pupilsAffected}
            error={errors.pupilsAffected}
            onChange={(v) => set('pupilsAffected', v)}
          />
        </div>

        <Choice
          label="How soon is it needed?"
          name="priority"
          options={REQUEST_PRIORITIES}
          value={answers.priority}
          error={errors.priority}
          onChange={(v) => set('priority', v)}
        />

        <label className={`stack-label ${errors.reason ? 'has-error' : ''}`}>
          Why is it needed?
          <textarea
            rows={3}
            maxLength={500}
            value={answers.reason}
            onChange={(e) => set('reason', e.target.value)}
            aria-invalid={Boolean(errors.reason)}
          />
          {errors.reason && <span className="field-error">{errors.reason}</span>}
        </label>

        <Choice
          label="Who is asking?"
          name="requestedByRole"
          options={ROLES}
          value={answers.requestedByRole}
          error={errors.requestedByRole}
          onChange={(v) => set('requestedByRole', v)}
        />

        {Object.values(errors).some(Boolean) && (
          <p className="form-error" role="alert">
            Please fix the highlighted answers.
          </p>
        )}
        {failed && (
          <p className="form-error" role="alert">
            Could not save on this device (storage may be full). Try again.
          </p>
        )}
        {(result === 'queued' || result === 'uploaded') && (
          <div className={`save-result ${result === 'queued' ? 'is-queued' : 'is-uploaded'}`} role="status">
            <span className="save-result-icon" aria-hidden="true">
              <Check size={28} strokeWidth={3} />
            </span>
            <div>
              <strong>{result === 'queued' ? 'Saved on this device, will be sent when online' : 'Request sent'}</strong>
              <p>You can follow it under "My requests".</p>
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary btn-block btn-big" disabled={saving}>
          {saving ? 'Saving…' : 'Send request'} {!saving && <Arrow />}
        </button>
      </form>

      <MyRequests schoolId={schoolId} />
    </>
  )
}

interface Mine {
  request: ResourceRequest
  view: RequestView | null
  waiting: boolean
}

/** This school's requests, newest first: status, the latest note, and whether it has been sent. */
function MyRequests({ schoolId }: { schoolId: string }) {
  const [views, setViews] = useState<RequestView[] | null>(null)

  // Each fake-server call takes ~300 ms, so ignore answers that arrive out of order.
  const latestLoad = useRef(0)
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    const school = (await getSchools()).find((s) => s.id === schoolId)
    if (id === latestLoad.current) setViews(school?.requests ?? [])
  }, [schoolId])

  useEffect(() => {
    void load()
    return subscribe(() => void load())
  }, [load])

  // Every load renders again, so the upload queue read here stays current.
  const queued = getQueuedRecords<RequestRecord>('requests').filter((r) => r.schoolId === schoolId)
  const waitingIds = new Set(queued.map((r) => r.id))
  const sentIds = new Set((views ?? []).map((v) => v.id))
  const items: Mine[] = [
    ...queued.filter((r) => !sentIds.has(r.id)).map((r) => ({ request: r, view: null, waiting: true })),
    ...(views ?? []).map((v) => ({ request: v, view: v, waiting: waitingIds.has(v.id) })),
  ].sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt))

  return (
    <div className="card">
      <h2 className="section-title">My requests</h2>
      {views === null ? (
        <p className="muted">Loading requests…</p>
      ) : items.length === 0 ? (
        <p className="muted">No requests from this school yet.</p>
      ) : (
        <ul className="recent-list">
          {items.map(({ request, view, waiting }) => (
            <li key={request.id} className="recent-row request-row">
              <span className="picker-main">
                <span className="picker-name">
                  {request.item} × {request.quantity}
                </span>
                <span className="muted small">
                  {request.category} · {dateOf(request.createdAt)}
                </span>
                <span className="request-chips">
                  <RequestStatusChip status={view?.status ?? 'Submitted'} />
                  <PriorityChip priority={request.priority} />
                  {request.demo && <span className="chip chip-demo">Demo data</span>}
                </span>
                {view?.latestNote && (
                  <span className="small request-note">
                    {partyLabel(view.latestNote.party)}: “{view.latestNote.note}”
                  </span>
                )}
              </span>
              {waiting ? <span className="badge badge-wait">Waiting to send</span> : <span className="badge badge-ok">Sent</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

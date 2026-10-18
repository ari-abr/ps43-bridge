import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPledges, markPledgeDelivered, savePledge, subscribe, type PledgeView } from '../../lib/api'
import {
  DEFAULT_NEXT_COUNT,
  NEXT_COUNTS,
  RESOURCES,
  RESOURCE_LABELS,
  amount,
  biggestGap,
  demandFor,
  gapSentence,
  resourceGaps,
  type RankedSchool,
  type ResourceGap,
} from '../../lib/resourceGaps'
import type { Partner, ResourceType } from '../../lib/types'
import { toast, toastSaved } from '../../lib/toast'

interface Props {
  /** The "Next to equip" list as the priority list shows it (current filters and Priority settings). */
  next: RankedSchool[]
  loading: boolean
  partners: Partner[]
  /** True when Region, Tier or Status filters are set. */
  filtered: boolean
}

/** Pledged resources versus what the next schools in the priority list need. Admin only. */
export default function ResourcesCard({ next, loading, partners, filtered }: Props) {
  const [count, setCount] = useState<number>(DEFAULT_NEXT_COUNT)
  const [pledges, setPledges] = useState<PledgeView[] | null>(null)
  const [showPledges, setShowPledges] = useState(false)
  const [adding, setAdding] = useState(false)

  // Each fake-server call takes ~300 ms, so ignore answers that arrive out of order.
  const latestLoad = useRef(0)
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    const result = await getPledges()
    if (id === latestLoad.current) setPledges(result)
  }, [])
  useEffect(() => {
    void load()
    return subscribe(() => void load())
  }, [load])

  const partnerName = useMemo(() => {
    const names = new Map(partners.map((p) => [p.id, p.name]))
    return (id: string) => names.get(id) ?? id
  }, [partners])

  const top = useMemo(() => next.slice(0, count), [next, count])
  const rows = useMemo(
    () => resourceGaps(demandFor(top.map((r) => r.school.tier!)), pledges ?? []),
    [top, pledges],
  )
  const biggest = useMemo(() => biggestGap(rows), [rows])
  const schoolCount = top.length

  return (
    <section className="admin-resources card" aria-labelledby="resources-title">
      <h2 id="resources-title" className="section-title">
        Resources and gaps
      </h2>
      <p className="help">
        What partners have pledged, against what the next schools in the priority list need for their kits.{' '}
        <span className="chip chip-demo">Demo data</span>
      </p>

      <label className="field-inline resources-count">
        <span>Next</span>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
          {NEXT_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n} schools
            </option>
          ))}
        </select>
      </label>

      {loading || pledges === null ? (
        <p className="muted small">Loading…</p>
      ) : schoolCount === 0 ? (
        <p className="muted">No school is waiting for a kit{filtered ? ' with these filters' : ''}.</p>
      ) : (
        <>
          <p className="resources-headline" role="status">
            {biggest
              ? `Biggest gap: ${RESOURCE_LABELS[biggest.resource].toLowerCase()} (${
                  biggest.resource === 'funding' ? amount('funding', biggest.gap) : biggest.gap.toLocaleString('en')
                } short).`
              : `Pledges cover what the next ${schoolCount} school${schoolCount === 1 ? '' : 's'} need.`}
          </p>
          {(schoolCount < count || filtered) && (
            <p className="muted small">
              {schoolCount < count && `Only ${schoolCount} school${schoolCount === 1 ? ' is' : 's are'} waiting for a kit. `}
              {filtered && 'Counting only the schools that match the filters.'}
            </p>
          )}
          <ul className="gap-rows">
            {rows.map((row) => (
              <GapRow key={row.resource} row={row} schoolCount={schoolCount} partnerName={partnerName} />
            ))}
          </ul>
          <p className="muted small">
            Only pledges not yet delivered count as available. Needs per school follow the kit for its readiness tier;
            funding covers kit costs not pledged as items (transport, installation, printing, power protection).
          </p>
        </>
      )}

      {pledges !== null && (
        <>
          <button
            type="button"
            className="btn-link list-toggle"
            aria-expanded={showPledges}
            aria-controls="pledge-list"
            onClick={() => setShowPledges((v) => !v)}
          >
            {showPledges ? 'Hide pledges' : `Show pledges (${pledges.length})`}
          </button>
          <div id="pledge-list" hidden={!showPledges}>
            <PledgeList pledges={pledges} partnerName={partnerName} />
          </div>
        </>
      )}

      {adding ? (
        <PledgeForm partners={partners} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="btn-secondary btn-block resources-add" onClick={() => setAdding(true)}>
          Add pledge
        </button>
      )}
    </section>
  )
}

function GapRow({ row, schoolCount, partnerName }: { row: ResourceGap; schoolCount: number; partnerName: (id: string) => string }) {
  // One scale per row: the larger of need and available.
  const scale = Math.max(row.needed, row.available)
  const pct = (n: number) => `${scale > 0 ? (n / scale) * 100 : 0}%`
  return (
    <li className="gap-row">
      <span className="score-bar-head">
        <span>{RESOURCE_LABELS[row.resource]}</span>
        {row.gap > 0 ? (
          <span className="chip chip-error">Short</span>
        ) : row.needed > 0 ? (
          <span className="chip chip-ok">Covered</span>
        ) : null}
      </span>
      <span className="gap-bar" aria-hidden="true">
        <span className="gap-covered" style={{ width: pct(row.covered) }} />
        <span className="gap-short" style={{ width: pct(row.gap) }} />
        <span className="gap-surplus" style={{ width: pct(row.surplus) }} />
      </span>
      <span className="small">{gapSentence(row, schoolCount)}</span>
      <span className="muted small">
        {row.noPledge ? (
          <strong className="gap-none">No partner has pledged {RESOURCE_LABELS[row.resource].toLowerCase()} yet.</strong>
        ) : (
          <>
            From {row.partnerIds.map(partnerName).join(', ')}
            {row.delivered > 0 && ` · ${amount(row.resource, row.delivered)} already delivered`}
          </>
        )}
      </span>
    </li>
  )
}

function PledgeList({ pledges, partnerName }: { pledges: PledgeView[]; partnerName: (id: string) => string }) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function deliver(p: PledgeView) {
    setBusyId(p.id)
    try {
      toastSaved(await markPledgeDelivered(p.id), 'Delivery')
    } catch {
      toast('error', 'Could not save the delivery.')
    } finally {
      setBusyId(null)
    }
  }

  if (pledges.length === 0) return <p className="muted small">No pledges yet.</p>
  return (
    <ul className="pledge-list">
      {pledges.map((p) => (
        <li key={p.id} className="pledge-row">
          <span className="priority-main">
            <span className="priority-name">{partnerName(p.partnerId)}</span>
            <span className="small">
              {amount(p.resource, p.quantity)}
              {p.note && <span className="muted"> · {p.note}</span>}
            </span>
            <span className="priority-status">
              <span className={`chip ${p.status === 'delivered' ? 'chip-ok' : ''}`}>
                {p.status === 'delivered' ? 'Delivered' : 'Pledged'}
              </span>
              {p.waiting && <span className="chip chip-wait">Waiting to upload</span>}
              {p.demo && <span className="chip chip-demo">Demo data</span>}
            </span>
          </span>
          {p.status === 'pledged' && (
            <button type="button" className="btn-secondary pledge-deliver" disabled={busyId === p.id} onClick={() => deliver(p)}>
              Mark delivered
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function PledgeForm({ partners, onDone }: { partners: Partner[]; onDone: () => void }) {
  const [partnerId, setPartnerId] = useState('')
  const [resource, setResource] = useState<ResourceType>('laptops')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const qty = Number(quantity)
    if (!partnerId) return setError('Choose a partner.')
    if (!Number.isInteger(qty) || qty < 1) return setError('Enter a whole number of 1 or more.')
    setBusy(true)
    setError(null)
    try {
      toastSaved(await savePledge({ partnerId, resource, quantity: qty, note: note.trim() }), 'Pledge')
      onDone()
    } catch {
      setError('Could not save the pledge (device storage full?).')
      toast('error', 'Could not save the pledge.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="approve-form pledge-form" onSubmit={save} noValidate>
      <h3 className="label-rule">Add pledge</h3>
      <label className="stack-label">
        Partner
        <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
          <option value="">Choose a partner</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type})
            </option>
          ))}
        </select>
      </label>
      <label className="stack-label">
        Resource
        <select value={resource} onChange={(e) => setResource(e.target.value as ResourceType)}>
          {RESOURCES.map((r) => (
            <option key={r} value={r}>
              {RESOURCE_LABELS[r]}
              {r === 'funding' && ' (CFA francs)'}
            </option>
          ))}
        </select>
      </label>
      <label className="stack-label">
        Quantity{resource === 'funding' ? ' (CFA francs)' : ''}
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} />
      </label>
      <label className="stack-label">
        Note (optional)
        <textarea rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="panel-actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save pledge'}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone} disabled={busy}>
          Cancel
        </button>
      </div>
      <p className="muted small">A pledge cannot be changed after saving. Offline, it waits on this device and uploads when you are Online.</p>
    </form>
  )
}

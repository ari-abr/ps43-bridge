import { useState } from 'react'
import { getQueuedRecords, saveRequestEvent, type RequestEventRecord, type RequestView, type SchoolView } from '../../lib/api'
import { isOpen } from '../../lib/requests'
import type { Kit, Partner } from '../../lib/types'
import { toast, toastSaved } from '../../lib/toast'
import { PriorityChip, RequestFacts, RequestHistory, RequestStatusChip } from '../ui/RequestBits'
import { ApproveForm } from './ShipmentSection'

interface Props {
  school: SchoolView
  kit: Kit | undefined
  partners: Partner[]
}

/** The school's equipment and resource requests, with Approve / Decline and "Create shipment from request". */
export default function RequestsSection({ school, kit, partners }: Props) {
  return (
    <section className="panel-section" aria-label="Requests">
      <h3 className="label-rule">Requests</h3>
      {school.requests.length === 0 ? (
        <p className="muted">No requests from this school. Teachers send them from the Teacher screen.</p>
      ) : (
        <ul className="request-items">
          {school.requests.map((r) => (
            <li key={r.id}>
              <RequestItem request={r} school={school} kit={kit} partners={partners} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RequestItem({ request, school, kit, partners }: { request: RequestView } & Props) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [shipping, setShipping] = useState(false)
  // This device's own decisions that have not uploaded yet (the status changes once they do).
  const waiting = getQueuedRecords<RequestEventRecord>('requestEvents').filter((e) => e.requestId === request.id)
  const canShip = (isOpen(request.status) || request.status === 'Approved') && !request.shipmentId

  async function decide(status: 'Approved' | 'Declined') {
    setBusy(true)
    try {
      const result = await saveRequestEvent({ requestId: request.id, status, party: 'admin', note: note.trim() })
      toastSaved(result, status === 'Approved' ? 'Approval' : 'Decline')
      setNote('')
    } catch {
      toast('error', 'Could not save the decision.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="confirm-box request-item">
      <div className="request-head">
        <strong>
          {request.item} × {request.quantity}
        </strong>
        <span className="request-chips">
          <PriorityChip priority={request.priority} />
          <RequestStatusChip status={request.status} />
          {request.demo && <span className="chip chip-demo">Demo data</span>}
        </span>
      </div>
      <RequestFacts request={request} />
      <p className="small request-reason">{request.reason}</p>
      <RequestHistory events={request.events} />
      {request.shipmentId && <p className="small">Linked shipment: {request.shipmentId}</p>}
      {waiting.length > 0 && (
        <p className="small">
          <span className="badge badge-wait">
            {waiting.map((e) => e.status).join(', ')}: saved on this device, waiting to upload
          </span>
        </p>
      )}

      {isOpen(request.status) && (
        <div className="request-decide">
          <label className="stack-label small">
            Note to the school (optional)
            <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="panel-actions">
            <button type="button" className="btn-primary" onClick={() => decide('Approved')} disabled={busy}>
              Approve
            </button>
            <button type="button" className="btn-secondary" onClick={() => decide('Declined')} disabled={busy}>
              Decline
            </button>
          </div>
        </div>
      )}

      {canShip &&
        (shipping && kit ? (
          <div className="request-ship">
            <p className="small">
              <strong>New shipment for {school.name}</strong>
              {school.shipment && ` (replaces ${school.shipment.id} as the school's current shipment)`}
            </p>
            <ApproveForm school={school} kit={kit} partners={partners} requestId={request.id} onDone={() => setShipping(false)} />
            <button type="button" className="btn-link" onClick={() => setShipping(false)}>
              Cancel
            </button>
          </div>
        ) : kit ? (
          <button type="button" className="btn-secondary btn-block request-ship-btn" onClick={() => setShipping(true)}>
            Create shipment from request
          </button>
        ) : (
          <p className="muted small">A shipment needs a survey first (the kit depends on the readiness tier).</p>
        ))}
    </div>
  )
}

// Small pieces every request screen shares: the status chip, the details line and the history.
import type { RequestEvent, RequestPriority, RequestStatus, ResourceRequest } from '../../lib/types'

const STATUS_CLASS: Record<RequestStatus, string> = {
  Submitted: 'chip',
  'Checked by coordinator': 'chip chip-wait',
  Approved: 'chip chip-ok',
  Declined: 'chip chip-error',
  Fulfilled: 'chip chip-ok',
}

export const RequestStatusChip = ({ status }: { status: RequestStatus }) => (
  <span className={STATUS_CLASS[status]}>{status}</span>
)

export const PriorityChip = ({ priority }: { priority: RequestPriority }) => (
  <span className={`pill priority-${priority === 'Urgent' ? 'urgent' : priority === 'Soon' ? 'soon' : 'later'}`}>{priority}</span>
)

export const dateOf = (iso: string) => new Date(iso).toLocaleDateString([], { dateStyle: 'medium' })
const timeOf = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

/** "Coordinator" or "PS43" (the admin team). */
export const partyLabel = (party: RequestEvent['party']) => (party === 'coordinator' ? 'Coordinator' : 'PS43')

/** "Repairs · quantity 3 · 45 pupils · Headteacher, 5 Oct 2026" */
export function RequestFacts({ request }: { request: ResourceRequest }) {
  return (
    <span className="muted small">
      {request.category} · quantity {request.quantity} · {request.pupilsAffected} pupils · {request.requestedByRole},{' '}
      {dateOf(request.createdAt)}
    </span>
  )
}

/** Every status change, oldest first, with who made it and their note. */
export function RequestHistory({ events }: { events: RequestEvent[] }) {
  if (events.length === 0) return null
  return (
    <ol className="request-history small">
      {events.map((e) => (
        <li key={e.id}>
          <strong>{e.status}</strong> by {partyLabel(e.party)}, {timeOf(e.createdAt)}
          {e.note && <span className="request-note">“{e.note}”</span>}
        </li>
      ))}
    </ol>
  )
}

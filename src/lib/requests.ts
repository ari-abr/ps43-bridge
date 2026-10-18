// Equipment and resource request rules shared by the app and scripts/seed.ts. Plain rules, no AI.
import type { RequestCategory, RequestEvent, RequestPriority, RequestStatus, ShipmentStatus } from './types.ts'

export const REQUEST_CATEGORIES: RequestCategory[] = [
  'Devices',
  'Power and solar',
  'Internet',
  'Books and printed materials',
  'Furniture',
  'Repairs',
  'Teacher training',
  'Other',
]

export const REQUEST_PRIORITIES: RequestPriority[] = ['Urgent', 'Soon', 'When possible']

const STAGE: Record<RequestEvent['status'], number> = { 'Checked by coordinator': 1, Approved: 2, Declined: 2 }

/**
 * The one place a request's status is decided:
 *   Fulfilled   a shipment linked to it is delivered or verified
 *   otherwise   the latest event (Checked by coordinator, Approved or Declined)
 *   Submitted   no events yet
 * A coordinator check that syncs late never moves an Approved or Declined request back.
 */
export function requestStatus(
  events: RequestEvent[],
  shipmentStatusOf: (shipmentId: string) => ShipmentStatus | undefined,
): RequestStatus {
  const delivered = events.some((e) => {
    const st = e.shipmentId ? shipmentStatusOf(e.shipmentId) : undefined
    return st === 'delivered' || st === 'verified'
  })
  if (delivered) return 'Fulfilled'
  const latest = latestEvent(events)
  return latest ? latest.status : 'Submitted'
}

/** The event that sets the status: furthest stage first, then newest. */
function latestEvent(events: RequestEvent[]): RequestEvent | undefined {
  return [...events].sort((a, b) => STAGE[a.status] - STAGE[b.status] || a.createdAt.localeCompare(b.createdAt)).pop()
}

/** Open = still waiting for a decision. */
export const isOpen = (status: RequestStatus) => status === 'Submitted' || status === 'Checked by coordinator'

/** Urgent first, then Soon, then When possible; oldest first within a priority. */
export function byPriorityThenDate<T extends { priority: RequestPriority; createdAt: string }>(a: T, b: T): number {
  return REQUEST_PRIORITIES.indexOf(a.priority) - REQUEST_PRIORITIES.indexOf(b.priority) || a.createdAt.localeCompare(b.createdAt)
}

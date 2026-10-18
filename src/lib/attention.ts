// "Needs attention" on the Admin map: things that are stuck and need a person to act.
// Worked out from the schools as getSchools() returns them; nothing extra is stored. Plain rules, no AI.
import type { SchoolView } from './api.ts'
import { isOpen } from './requests.ts'
import type { RequestPriority } from './types.ts'

/** A request still open (Submitted or Checked by coordinator) for more than this many days. */
export const REQUEST_WAIT_DAYS = 7
/** A shipment In transit for more than this many days. */
export const SHIPMENT_SLOW_DAYS = 14
/** One delivery confirmation in, the other still missing after this many days. */
export const CONFIRM_WAIT_DAYS = 5
/** A latest check-in with at least this many broken devices. */
export const BROKEN_DEVICES_MIN = 2
/** A delivered kit with no check-in for more than this many days. */
export const CHECKIN_DUE_DAYS = 30

export type AttentionKind = 'request-waiting' | 'shipment-slow' | 'delivery-unconfirmed' | 'device-problems' | 'no-checkin'
export type Severity = 'high' | 'medium' | 'low'

export interface AttentionItem {
  id: string
  schoolId: string
  schoolName: string
  kind: AttentionKind
  severity: Severity
  title: string
  detail: string
  ageDays: number
}

const DAY_MS = 86_400_000
const SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low']
const REQUEST_SEVERITY: Record<RequestPriority, Severity> = { Urgent: 'high', Soon: 'medium', 'When possible': 'low' }

/** Whole days from `date` (YYYY-MM-DD or ISO time) to `now`. */
const daysSince = (date: string, now: number) => Math.floor((now - Date.parse(date)) / DAY_MS)
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

/** Everything that needs a person to act, most severe first, then oldest first. `now` is a time in ms. */
export function getAttentionItems(schools: SchoolView[], now: number): AttentionItem[] {
  const items: AttentionItem[] = []

  for (const school of schools) {
    const add = (item: Omit<AttentionItem, 'schoolId' | 'schoolName'>) =>
      items.push({ ...item, schoolId: school.id, schoolName: school.name })

    for (const r of school.requests) {
      const age = daysSince(r.createdAt, now)
      if (isOpen(r.status) && age > REQUEST_WAIT_DAYS) {
        add({
          id: `request-waiting:${r.id}`,
          kind: 'request-waiting',
          severity: REQUEST_SEVERITY[r.priority],
          title: `${r.priority} request waiting: ${r.item}`,
          detail: `Waiting ${days(age)} for a decision (${r.status.toLowerCase()})`,
          ageDays: age,
        })
      }
    }

    const sh = school.shipment
    if (sh) {
      const { coordinator, teacher } = sh
      if (coordinator || teacher) {
        // One side confirmed the delivery, the other has not yet.
        const done = coordinator ?? teacher!
        const age = daysSince(done.confirmedAt, now)
        if (!(coordinator && teacher) && age > CONFIRM_WAIT_DAYS) {
          add({
            id: `delivery-unconfirmed:${sh.id}`,
            kind: 'delivery-unconfirmed',
            severity: coordinator ? 'medium' : 'high',
            title: 'Delivery not confirmed',
            detail: `${coordinator ? 'Teacher' : 'Coordinator'} has not confirmed delivery (${days(age)})`,
            ageDays: age,
          })
        }
      } else if (sh.inTransitAt) {
        const age = daysSince(sh.inTransitAt, now)
        if (age > SHIPMENT_SLOW_DAYS) {
          add({
            id: `shipment-slow:${sh.id}`,
            kind: 'shipment-slow',
            severity: 'medium',
            title: 'Shipment slow',
            detail: `In transit for ${days(age)}`,
            ageDays: age,
          })
        }
      }

      // Check-ins count devices, so they only apply to kits that have some.
      const delivered = sh.status === 'delivered' || sh.status === 'verified'
      if (delivered && sh.devices.length > 0) {
        const c = school.checkin
        if (c && c.broken >= BROKEN_DEVICES_MIN) {
          add({
            id: `device-problems:${c.id}`,
            kind: 'device-problems',
            severity: 'high',
            title: 'Device problems',
            detail: `${c.broken} of ${c.working + c.broken + c.missing} devices broken in the latest check-in${c.missing > 0 ? `, ${c.missing} missing` : ''}`,
            ageDays: daysSince(c.checkedAt, now),
          })
        }
        // Count from the last check-in, or from the delivery if there has been none.
        const since = c?.checkedAt ?? coordinator?.confirmedAt
        const age = since ? daysSince(since, now) : 0
        if (age > CHECKIN_DUE_DAYS) {
          add({
            id: `no-checkin:${school.id}`,
            kind: 'no-checkin',
            severity: 'low',
            title: 'No recent check-in',
            detail: c ? `Last check-in ${days(age)} ago` : `No check-in since delivery ${days(age)} ago`,
            ageDays: age,
          })
        }
      }
    }
  }

  return items.sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.ageDays - a.ageDays,
  )
}

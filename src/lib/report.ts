// Numbers for the Admin summary bar and the donor report. One place, so both agree.
import type { SchoolView } from './api.ts'

export interface Summary {
  schoolsMapped: number
  assessed: number
  /** Coordinator confirmed (status delivered or verified). */
  kitsDelivered: number
  /** Confirmed by both the coordinator and the teacher. */
  kitsVerified: number
  devicesDelivered: number
  /** Devices counted in the latest check-ins, and how many of them work. */
  devicesChecked: number
  devicesWorking: number
  /** Working share across schools with a check-in, in percent. Null with no check-ins. */
  devicesWorkingPct: number | null
  activeLearners: number
  schoolsWithProgress: number
  /** Mastery rate across all active learners (each school weighted by its active learners). Null with no data. */
  averageMastery: number | null
}

const isDelivered = (s: SchoolView) => s.status === 'delivered' || s.status === 'verified'

export function summarise(schools: SchoolView[]): Summary {
  const withCheckin = schools.filter((s) => s.checkin)
  const devicesChecked = withCheckin.reduce((n, s) => n + s.checkin!.working + s.checkin!.broken + s.checkin!.missing, 0)
  const devicesWorking = withCheckin.reduce((n, s) => n + s.checkin!.working, 0)

  const withProgress = schools.filter((s) => s.progress)
  const activeLearners = withProgress.reduce((n, s) => n + s.progress!.activeStudents, 0)
  const rated = withProgress.filter((s) => s.progress!.masteryRate !== null)
  const ratedLearners = rated.reduce((n, s) => n + s.progress!.activeStudents, 0)
  const masteryWeighted = rated.reduce((n, s) => n + s.progress!.masteryRate! * s.progress!.activeStudents, 0)

  return {
    schoolsMapped: schools.length,
    assessed: schools.filter((s) => s.status !== 'unassessed').length,
    kitsDelivered: schools.filter(isDelivered).length,
    kitsVerified: schools.filter((s) => s.status === 'verified').length,
    devicesDelivered: schools.filter(isDelivered).reduce((n, s) => n + (s.shipment?.devices.length ?? 0), 0),
    devicesChecked,
    devicesWorking,
    devicesWorkingPct: devicesChecked > 0 ? Math.round((devicesWorking / devicesChecked) * 100) : null,
    activeLearners,
    schoolsWithProgress: withProgress.length,
    averageMastery: ratedLearners > 0 ? Math.round(masteryWeighted / ratedLearners) : null,
  }
}

/** Devices in a school's latest check-in: "x of y". Null without a check-in. */
export function workingOfTotal(s: SchoolView): string | null {
  if (!s.checkin) return null
  return `${s.checkin.working} of ${s.checkin.working + s.checkin.broken + s.checkin.missing}`
}

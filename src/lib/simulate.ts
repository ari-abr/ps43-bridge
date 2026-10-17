// "Simulate 30 days": demo data for schools with a verified kit, saved through api.ts like real synced data.
// Seeded by school id, so every run gives the same numbers. Never replaces data from a real device.

import {
  getPublishedVersion,
  getQueue,
  getRecords,
  getSchools,
  saveRecord,
  type CheckinRecord,
  type ProgressRow,
} from './api.ts'

function seededRandom(seed: string) {
  let a = 2166136261
  for (const ch of seed) a = Math.imul(a ^ ch.charCodeAt(0), 16777619)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SimulationResult {
  /** Schools that got simulated learning totals. */
  progressFilled: number
  /** Schools skipped because a real device already sent progress. */
  skippedReal: number
  /** Simulated check-ins written (schools with devices only). */
  checkins: number
}

export async function simulate30Days(): Promise<SimulationResult> {
  const schools = await getSchools()
  const queue = getQueue()

  // Real data, uploaded or still waiting in this device's queue, is never replaced.
  const realCheckins = new Set(
    [
      ...(await getRecords<CheckinRecord>('checkins')),
      ...queue.filter((q) => q.collection === 'checkins').map((q) => q.record as CheckinRecord),
    ]
      .filter((c) => !c.simulated)
      .map((c) => c.schoolId),
  )
  const realQueuedProgress = new Set(
    queue
      .filter((q) => q.collection === 'progress')
      .map((q) => q.record as ProgressRow)
      .filter((p) => !p.simulated && p.activeStudents > 0)
      .map((p) => p.schoolId),
  )

  let courseVersion = 1
  try {
    courseVersion = await getPublishedVersion('times-tables')
  } catch {
    // Offline: the simulated totals say version 1.
  }

  const result: SimulationResult = { progressFilled: 0, skippedReal: 0, checkins: 0 }
  const now = new Date().toISOString()

  for (const school of schools.filter((s) => s.status === 'verified' && s.shipment)) {
    const rand = seededRandom(school.id)
    const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

    const hasReal = (school.progress && !school.progress.simulated) || realQueuedProgress.has(school.id)
    if (hasReal) {
      result.skippedReal++
    } else {
      const pupils = school.survey?.pupils ?? 200
      const active = Math.max(5, Math.round(pupils * (0.25 + rand() * 0.3)))
      const mastery = between(30, 95)
      const record: ProgressRow = {
        id: `progress-${school.id}`,
        schoolId: school.id,
        activeStudents: active,
        lessonsCompleted: Math.round(active * (1.8 + rand() * 1.8)),
        quizAttempts: Math.round(active * (1.1 + rand() * 0.9)),
        masteryRate: mastery,
        averageScore: Math.min(98, Math.max(35, mastery - 5 + between(-8, 8))),
        courseVersion,
        updatedAt: now,
        simulated: true,
      }
      await saveRecord('progress', record)
      result.progressFilled++
    }

    const devices = school.shipment!.devices.length
    if (devices > 0 && !realCheckins.has(school.id)) {
      const broken = between(0, Math.min(3, Math.ceil(devices * 0.15)))
      const missing = rand() < 0.3 ? 1 : 0
      const checkin: CheckinRecord = {
        id: `ci-sim-${school.id}`,
        schoolId: school.id,
        shipmentId: school.shipment!.id,
        working: Math.max(0, devices - broken - missing),
        broken,
        missing,
        note: 'Simulated demo data',
        checkedAt: now,
        simulated: true,
      }
      await saveRecord('checkins', checkin)
      result.checkins++
    }
  }
  return result
}

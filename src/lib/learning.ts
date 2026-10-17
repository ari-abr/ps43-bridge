// Learning module: device setup, course packs, students and school-level totals.
//
// Stays on this device (device-only storage via api.ts):
//   learn:school     the school id this device is at
//   learn:pack       the installed course pack version and when it was last checked
//   learn:students   students (names) and their individual progress
//   learn:current    the student using the device now
// Leaves the device (through the upload queue in api.ts):
//   'progress' collection, one record per school: a snapshot of current totals, no names.

import manifestJson from '../data/courses/manifest.json'
import { getLocal, getOutbox, getPublishedVersion, newId, saveRecord, setLocal, type DataRecord } from './api'
import type { CourseManifest, CoursePack } from './types'

export const MASTERY_PERCENT = 80
export const PACK_ID = 'times-tables'

const SCHOOL_KEY = 'learn:school'
const PACK_KEY = 'learn:pack'
const STUDENTS_KEY = 'learn:students'
const CURRENT_KEY = 'learn:current'
const CHANGED_KEY = 'learn:progressChangedAt'

// ---------- course packs ----------
//
// Every version ships inside the app bundle, so "downloading" an update just switches
// the installed version. A real app would fetch the pack file instead.

const manifest = manifestJson as CourseManifest
const packFiles = import.meta.glob<CoursePack>('../data/courses/*-v*.json', { eager: true, import: 'default' })

function packFile(packId: string, version: number): CoursePack | undefined {
  const file = manifest.packs.find((p) => p.id === packId)?.files[String(version)]
  return file ? packFiles[`../data/courses/${file}`] : undefined
}

/** The newest version of a pack that exists in the app (what the Admin can publish). */
export function latestPackVersion(packId: string): number {
  return manifest.packs.find((p) => p.id === packId)?.latestVersion ?? 1
}

export interface UpdateNotice {
  from: number
  to: number
  releaseNotes: string
  newLessons: string[]
  newQuestions: number
}

interface PackState {
  version: number
  lastCheckedAt: string | null
  notice: UpdateNotice | null
}

const FIRST_INSTALL: PackState = { version: 1, lastCheckedAt: null, notice: null }

export function getPackState(): PackState {
  const state = getLocal<PackState>(PACK_KEY, FIRST_INSTALL)
  return packFile(PACK_ID, state.version) ? state : FIRST_INSTALL
}

export function getInstalledPack(): CoursePack {
  return packFile(PACK_ID, getPackState().version)!
}

export function dismissUpdateNotice() {
  setLocal(PACK_KEY, { ...getPackState(), notice: null })
}

let checking: Promise<number | null> | null = null

/**
 * Online only: ask the fake server for the published version and install it if it is newer.
 * Returns the new version, or null if nothing changed (or the check could not run).
 * A call during a check waits for that check instead of starting another.
 */
export function checkForCourseUpdate(): Promise<number | null> {
  checking ??= runCheck().finally(() => {
    checking = null
  })
  return checking
}

async function runCheck(): Promise<number | null> {
  try {
    const published = await getPublishedVersion(PACK_ID)
    const state = getPackState()
    const next = packFile(PACK_ID, published)
    if (published <= state.version || !next) {
      setLocal(PACK_KEY, { ...state, lastCheckedAt: new Date().toISOString() })
      return null
    }
    const old = packFile(PACK_ID, state.version)!
    const oldLessons = new Set(old.lessons.map((l) => l.id))
    const oldQuestions = new Set(old.quiz.map((q) => q.id))
    const notice: UpdateNotice = {
      from: state.version,
      to: published,
      releaseNotes: next.releaseNotes,
      newLessons: next.lessons.filter((l) => !oldLessons.has(l.id)).map((l) => l.title),
      newQuestions: next.quiz.filter((q) => !oldQuestions.has(q.id)).length,
    }
    setLocal(PACK_KEY, { version: published, lastCheckedAt: new Date().toISOString(), notice })
    void syncProgress() // courseVersion is part of the totals
    return published
  } catch {
    return null // Offline, or went offline during the check: keep the installed version
  }
}

// ---------- device school ----------

export function getDeviceSchool(): string | null {
  return getLocal<string | null>(SCHOOL_KEY, null)
}

export function setDeviceSchool(schoolId: string) {
  const previous = getDeviceSchool()
  setLocal(SCHOOL_KEY, schoolId)
  if (previous === schoolId) return
  // This device's totals now count for the new school, so the old school's snapshot goes to zero.
  if (previous && getOutbox('progress').some((o) => o.record.id === progressId(previous))) {
    void saveRecord('progress', emptyRecord(previous)).catch(() => {})
  }
  void syncProgress()
}

// ---------- students (device only, never uploaded) ----------

export interface QuizAttempt {
  at: string
  correct: number
  total: number
  percent: number
  version: number
}

export interface Student {
  id: string
  name: string
  createdAt: string
  lastActiveAt: string
  lessonsDone: string[]
  attempts: QuizAttempt[]
  demo?: boolean
}

export function getStudents(): Student[] {
  return getLocal<Student[]>(STUDENTS_KEY, [])
}

function saveStudents(students: Student[]) {
  setLocal(STUDENTS_KEY, students)
}

/** "  amina  BELLO " -> "amina bello": how names are compared. */
export const normaliseName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()
/** Trim and collapse spaces, keeping the student's capitals. */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ')

export const NAME_MAX = 30

/** An error message, or null if the name is fine. */
export function nameError(name: string): string | null {
  const n = cleanName(name)
  if (!n) return 'Please type your name.'
  if (n.length > NAME_MAX) return `Use ${NAME_MAX} characters or fewer.`
  if (!/^[\p{L}\p{M} '’-]+$/u.test(n) || !/\p{L}/u.test(n)) {
    return "Use letters, spaces, hyphens (-) and apostrophes (') only."
  }
  return null
}

export function findStudent(name: string): Student | undefined {
  const key = normaliseName(name)
  return getStudents().find((s) => normaliseName(s.name) === key)
}

/** Edit distance, to catch typos like "Amian" for "Amina". */
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

/** Students on this device whose name looks like what is being typed (excluding an exact match). */
export function similarStudents(typed: string, students: Student[]): Student[] {
  const t = normaliseName(typed)
  if (!t) return []
  return students.filter((s) => {
    const n = normaliseName(s.name)
    if (n === t) return false
    return n.startsWith(t) || t.startsWith(n) || (t.length >= 4 && distance(n, t) <= 1)
  })
}

/** Find the student with this name (any case or spacing) or add them. Returns the student. */
export function signIn(name: string): Student {
  const now = new Date().toISOString()
  const existing = findStudent(name)
  const students = getStudents()
  let student: Student
  if (existing) {
    student = { ...existing, lastActiveAt: now }
    saveStudents(students.map((s) => (s.id === student.id ? student : s)))
  } else {
    student = { id: newId('st'), name: cleanName(name), createdAt: now, lastActiveAt: now, lessonsDone: [], attempts: [] }
    saveStudents([...students, student])
  }
  setLocal(CURRENT_KEY, student.id)
  return student
}

export function getCurrentStudent(): Student | null {
  const id = getLocal<string | null>(CURRENT_KEY, null)
  return getStudents().find((s) => s.id === id) ?? null
}

export function signOut() {
  setLocal(CURRENT_KEY, null)
}

function updateStudent(id: string, change: (s: Student) => Student) {
  const now = new Date().toISOString()
  saveStudents(getStudents().map((s) => (s.id === id ? { ...change(s), lastActiveAt: now } : s)))
  void syncProgress()
}

export function markLessonDone(studentId: string, lessonId: string) {
  updateStudent(studentId, (s) => (s.lessonsDone.includes(lessonId) ? s : { ...s, lessonsDone: [...s.lessonsDone, lessonId] }))
}

export function recordAttempt(studentId: string, correct: number, total: number) {
  const attempt: QuizAttempt = {
    at: new Date().toISOString(),
    correct,
    total,
    percent: Math.round((correct / total) * 100),
    version: getPackState().version,
  }
  updateStudent(studentId, (s) => ({ ...s, attempts: [...s.attempts, attempt] }))
}

// ---------- per-student and class figures ----------

export interface StudentSummary {
  student: Student
  lessonsDone: number
  latest: number | null
  best: number | null
  active: boolean
  mastered: boolean
}

export function summariseStudent(student: Student, pack: CoursePack): StudentSummary {
  const lessonIds = new Set(pack.lessons.map((l) => l.id))
  const lessonsDone = student.lessonsDone.filter((id) => lessonIds.has(id)).length
  const percents = student.attempts.map((a) => a.percent)
  const best = percents.length ? Math.max(...percents) : null
  return {
    student,
    lessonsDone,
    latest: percents.length ? percents[percents.length - 1] : null,
    best,
    active: lessonsDone > 0 || percents.length > 0,
    mastered: best !== null && best >= MASTERY_PERCENT,
  }
}

export interface ClassTotals {
  activeStudents: number
  lessonsCompleted: number
  quizAttempts: number
  /** Percent of active students whose best score is 80% or more. Null with no active students. */
  masteryRate: number | null
  /** Average of each student's latest quiz score, in percent. Null with no attempts. */
  averageScore: number | null
}

export function classTotals(summaries: StudentSummary[]): ClassTotals {
  const active = summaries.filter((s) => s.active)
  const latest = summaries.flatMap((s) => (s.latest === null ? [] : [s.latest]))
  return {
    activeStudents: active.length,
    lessonsCompleted: summaries.reduce((n, s) => n + s.lessonsDone, 0),
    quizAttempts: summaries.reduce((n, s) => n + s.student.attempts.length, 0),
    masteryRate: active.length ? Math.round((active.filter((s) => s.mastered).length / active.length) * 100) : null,
    averageScore: latest.length ? Math.round(latest.reduce((a, b) => a + b, 0) / latest.length) : null,
  }
}

// ---------- school totals upload ----------

export type ProgressRecord = DataRecord &
  ClassTotals & { schoolId: string; courseVersion: number; updatedAt: string }

export const progressId = (schoolId: string) => `progress-${schoolId}`

function buildRecord(schoolId: string): ProgressRecord {
  const pack = getInstalledPack()
  const totals = classTotals(getStudents().map((s) => summariseStudent(s, pack)))
  return {
    id: progressId(schoolId),
    schoolId,
    ...totals,
    courseVersion: pack.version,
    updatedAt: new Date().toISOString(),
  }
}

function emptyRecord(schoolId: string): ProgressRecord {
  return {
    id: progressId(schoolId),
    schoolId,
    activeStudents: 0,
    lessonsCompleted: 0,
    quizAttempts: 0,
    masteryRate: null,
    averageScore: null,
    courseVersion: getPackState().version,
    updatedAt: new Date().toISOString(),
  }
}

let syncing = false
let syncAgain = false

/**
 * Save this school's current totals to the 'progress' collection (uploads Online, queues Offline).
 * Always the same record id and a full snapshot, so re-sending never double counts.
 * Saves run one at a time; a change during a save triggers one more, so the newest snapshot lands last.
 */
export async function syncProgress(): Promise<void> {
  if (!getDeviceSchool()) return
  setLocal(CHANGED_KEY, new Date().toISOString())
  if (syncing) {
    syncAgain = true
    return
  }
  syncing = true
  try {
    do {
      syncAgain = false
      const schoolId = getDeviceSchool()
      if (schoolId) await saveRecord('progress', buildRecord(schoolId))
    } while (syncAgain)
  } catch {
    // Storage full: the progress is still on the device; the next change retries.
  } finally {
    syncing = false
  }
}

export type ProgressSync =
  | { state: 'none' }
  | { state: 'waiting' }
  | { state: 'uploading' }
  | { state: 'uploaded'; at: string }

/** Upload state of this school's totals, for "Progress saved on this device" / "Progress uploaded". */
export function getProgressSync(): ProgressSync {
  const schoolId = getDeviceSchool()
  const changedAt = getLocal<string | null>(CHANGED_KEY, null)
  if (!schoolId || !changedAt) return { state: 'none' }
  const item = getOutbox('progress').find((o) => o.record.id === progressId(schoolId))
  if (item?.state === 'waiting') return { state: 'waiting' }
  if (item?.state === 'uploaded' && (item.record as ProgressRecord).updatedAt >= changedAt) {
    return { state: 'uploaded', at: item.uploadedAt! }
  }
  return { state: 'uploading' }
}

// ---------- demo class ----------

/** Fictional students with fixed, varied progress: [name, lessons done, quiz scores in percent]. */
const DEMO_CLASS: [string, number, number[]][] = [
  ['Brenda Mbah', 4, [70, 90]],
  ['Junior Fotso', 3, [60]],
  ['Clarisse Ngo', 4, [100]],
  ['Ibrahim Moussa', 2, [40, 50, 70]],
  ['Grace Tabi', 4, [80]],
  ['Eric Kamga', 1, []],
  ['Aïcha Oumarou', 3, [90, 100]],
  ['Samuel Nfor', 0, []],
]

export function addDemoClass() {
  const pack = getInstalledPack()
  const students = getStudents()
  const taken = new Set(students.map((s) => normaliseName(s.name)))
  const day = 24 * 60 * 60 * 1000
  const now = Date.now()
  const added: Student[] = DEMO_CLASS.filter(([name]) => !taken.has(normaliseName(name))).map(([name, lessons, scores], i) => {
    const total = pack.quiz.length
    const attempts: QuizAttempt[] = scores.map((p, j) => {
      const correct = Math.round((p / 100) * total)
      return {
        at: new Date(now - (scores.length - j) * day - i * 3600_000).toISOString(),
        correct,
        total,
        percent: Math.round((correct / total) * 100),
        version: pack.version,
      }
    })
    const created = new Date(now - 7 * day + i * 3600_000).toISOString()
    return {
      id: newId('st'),
      name,
      createdAt: created,
      lastActiveAt: attempts[attempts.length - 1]?.at ?? created,
      lessonsDone: pack.lessons.slice(0, lessons).map((l) => l.id),
      attempts,
      demo: true,
    }
  })
  saveStudents([...students, ...added])
  void syncProgress()
}

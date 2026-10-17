// Fake server for the demo. Every module reads and writes through this file only.
//
// - "Uploaded" data lives under its own localStorage keys (ps43:server:<collection>).
// - Every server call waits ~300 ms to feel like a network.
// - While Offline, writes go into an upload queue (ps43:queue).
//   Switching to Online flushes the queue automatically.
// - Other open windows are told about changes through the browser "storage" event.
//   That event does not fire in the window that made the change, so we also
//   notify local listeners directly.

import demoState from '../data/demo-state.json'
import kitsSeed from '../data/kits.json'
import partnersSeed from '../data/partners.json'
import schoolsSeed from '../data/schools.json'
import { needScore, nearestKm, tierFromSurvey, type NeedInput, type Tier } from './scoring.ts'
import type { Kit, Partner, School, SchoolStatus, Shipment, ShipmentStatus, Survey } from './types.ts'

export const KEY_PREFIX = 'ps43:'
const SERVER_PREFIX = KEY_PREFIX + 'server:'
const QUEUE_KEY = KEY_PREFIX + 'queue'
const SENT_KEY = KEY_PREFIX + 'sent'
const ONLINE_KEY = KEY_PREFIX + 'online'
/** Set this key to "1" in devtools to make every upload fail (to test retries). */
const FAIL_UPLOADS_KEY = KEY_PREFIX + 'debug:failUploads'
const DELAY_MS = 300
const SENT_LIMIT = 50

export interface DataRecord {
  id: string
  [field: string]: unknown
}

export interface QueueItem {
  /** "<collection>:<record id>", so the same record is never queued or uploaded twice. */
  id: string
  collection: string
  record: DataRecord
  queuedAt: string
}

/** An item this device has uploaded (kept so screens can show "Uploaded 14:32"). */
interface SentItem {
  id: string
  collection: string
  record: DataRecord
  savedAt: string
  uploadedAt: string
}

// ---------- helpers ----------

const wait = (ms = DELAY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A unique id like "sv-mgu1x2k3a9f0". Works without crypto.randomUUID (missing on plain-http LAN addresses). */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
  notify()
}

// ---------- change notifications ----------

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((fn) => fn())
}

// Another window changed one of our keys: refresh this window too.
window.addEventListener('storage', (e) => {
  if (e.key === null || e.key.startsWith(KEY_PREFIX)) notify()
})

/** Call `fn` whenever app data changes (in this window or another). Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ---------- connectivity ----------

export function isOnline(): boolean {
  return readJson<boolean>(ONLINE_KEY, true)
}

export function setOnline(online: boolean) {
  writeJson(ONLINE_KEY, online)
  if (online) void flushQueue()
}

// The real network went away (e.g. devtools Offline): switch the demo toggle to Offline too.
// Coming back online for real does not flip it; the presenter does that.
if (!navigator.onLine && isOnline()) setOnline(false)
window.addEventListener('offline', () => setOnline(false))

// ---------- upload queue ----------

const queueId = (collection: string, record: DataRecord) => `${collection}:${record.id}`

export function getQueue(): QueueItem[] {
  // Items queued by older builds have no id: derive it.
  return readJson<QueueItem[]>(QUEUE_KEY, []).map((item) => ({ ...item, id: item.id ?? queueId(item.collection, item.record) }))
}

export function getQueueCount(): number {
  return getQueue().length
}

/** Add a record to the queue, replacing a queued copy of the same record. */
function enqueue(collection: string, record: DataRecord) {
  const item: QueueItem = { id: queueId(collection, record), collection, record, queuedAt: new Date().toISOString() }
  const queue = getQueue()
  const i = queue.findIndex((q) => q.id === item.id)
  if (i >= 0) queue[i] = { ...item, queuedAt: queue[i].queuedAt }
  else queue.push(item)
  writeJson(QUEUE_KEY, queue)
}

function getSent(): SentItem[] {
  return readJson<SentItem[]>(SENT_KEY, [])
}

function logSent(collection: string, record: DataRecord, savedAt: string) {
  const item: SentItem = { id: queueId(collection, record), collection, record, savedAt, uploadedAt: new Date().toISOString() }
  const rest = getSent().filter((s) => s.id !== item.id)
  writeJson(SENT_KEY, [item, ...rest].slice(0, SENT_LIMIT))
}

let flushing = false

/**
 * Upload queued items one by one.
 * - Stops if we go Offline mid-way; the item being sent stays queued.
 * - An item that fails stays queued and is retried on the next flush.
 * - Items are removed by id and uploads replace by record id, so two flushes
 *   (or two windows flushing at once) never create duplicates.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return
  flushing = true
  const tried = new Set<string>()
  try {
    while (isOnline()) {
      // Re-read each time: items may have been added or removed (by another window) while we waited.
      const next = getQueue().find((q) => !tried.has(q.id))
      if (!next) break
      tried.add(next.id)
      await wait()
      if (!isOnline()) break // the "network" dropped during the upload
      try {
        upsert(next.collection, next.record)
      } catch {
        continue // keep it queued for the next flush
      }
      logSent(next.collection, next.record, next.queuedAt)
      writeJson(QUEUE_KEY, getQueue().filter((q) => q.id !== next.id))
    }
  } finally {
    flushing = false
  }
}

/** This device's saved records in a collection, newest first: still waiting, or uploaded (and when). */
export interface OutboxItem {
  record: DataRecord
  state: 'waiting' | 'uploaded'
  savedAt: string
  uploadedAt?: string
}

export function getOutbox(collection: string): OutboxItem[] {
  const waiting: OutboxItem[] = getQueue()
    .filter((q) => q.collection === collection)
    .map((q) => ({ record: q.record, state: 'waiting', savedAt: q.queuedAt }))
  const waitingIds = new Set(waiting.map((w) => w.record.id))
  const uploaded: OutboxItem[] = getSent()
    .filter((s) => s.collection === collection && !waitingIds.has(s.record.id))
    .map((s) => ({ record: s.record, state: 'uploaded', savedAt: s.savedAt, uploadedAt: s.uploadedAt }))
  return [...waiting, ...uploaded].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

// ---------- records ----------

function upsert(collection: string, record: DataRecord) {
  if (localStorage.getItem(FAIL_UPLOADS_KEY) === '1') throw new Error('Simulated network error')
  const key = SERVER_PREFIX + collection
  const rows = readJson<DataRecord[]>(key, [])
  const i = rows.findIndex((r) => r.id === record.id)
  if (i >= 0) rows[i] = record
  else rows.push(record)
  writeJson(key, rows)
}

/** Read all "uploaded" records in a collection from the fake server. */
export async function getRecords<T extends DataRecord = DataRecord>(collection: string): Promise<T[]> {
  await wait()
  return readJson<T[]>(SERVER_PREFIX + collection, [])
}

/**
 * Save a record (insert or replace by id).
 * Online: uploads after a short delay. Offline: adds it to the upload queue.
 * If the upload fails or we go Offline during it, the record is queued instead.
 * Returns whether it was uploaded now or queued.
 */
export async function saveRecord(collection: string, record: DataRecord): Promise<'uploaded' | 'queued'> {
  const savedAt = new Date().toISOString()
  if (!isOnline()) {
    enqueue(collection, record)
    return 'queued'
  }
  await wait()
  try {
    if (!isOnline()) throw new Error('Went offline during upload')
    upsert(collection, record)
  } catch {
    enqueue(collection, record)
    return 'queued'
  }
  logSent(collection, record, savedAt)
  return 'uploaded'
}

// ---------- schools, surveys, shipments ----------
//
// Uploaded collections (saved with saveRecord):
//   'surveys'   { id, schoolId, ...Survey }  one record per survey; the latest surveyedAt wins
//   'shipments' Shipment                     replaces the seed shipment with the same id

export type SurveyRecord = DataRecord & Survey & { schoolId: string }
export type ShipmentRecord = DataRecord & Shipment

export interface SchoolView extends School {
  survey: Survey | null
  /** Readiness tier from the survey, or null if not assessed. */
  tier: Tier | null
  /** Inputs for needScore(), so screens can re-rank with their own weights. Null if not assessed. */
  need: NeedInput | null
  /** Need score (0-100) with the default weights. Null if not assessed. */
  needScore: number | null
  status: SchoolStatus
  shipment: Shipment | null
}

const seedSurveys = demoState.surveys as Record<string, Survey>
const seedShipments = demoState.shipments as Shipment[]

/** Seed shipments plus uploaded ones (an uploaded shipment replaces a seed one with the same id). */
export async function getShipments(): Promise<Shipment[]> {
  const uploaded = await getRecords<ShipmentRecord>('shipments')
  const byId = new Map<string, Shipment>(seedShipments.map((s) => [s.id, s]))
  uploaded.forEach((s) => byId.set(s.id, s))
  return [...byId.values()]
}

/** The latest survey of each school: seed surveys plus uploaded ones. */
export async function getLatestSurveys(): Promise<Map<string, Survey>> {
  const uploaded = await getRecords<SurveyRecord>('surveys')
  const latest = new Map<string, Survey>(Object.entries(seedSurveys))
  for (const u of uploaded) {
    const current = latest.get(u.schoolId)
    if (!current || u.surveyedAt >= current.surveyedAt) latest.set(u.schoolId, u)
  }
  return latest
}

const SHIPMENT_STATUS: Record<ShipmentStatus, SchoolStatus> = {
  approved: 'kit approved',
  'in transit': 'in transit',
  delivered: 'delivered',
  verified: 'verified',
}

/** Every school with its latest survey, tier, need score, status and shipment. */
export async function getSchools(): Promise<SchoolView[]> {
  const [surveys, shipments] = await Promise.all([getLatestSurveys(), getShipments()])

  // One shipment per school: the most recently approved.
  const shipmentOf = new Map<string, Shipment>()
  for (const sh of shipments) {
    const current = shipmentOf.get(sh.schoolId)
    if (!current || sh.approvedAt >= current.approvedAt) shipmentOf.set(sh.schoolId, sh)
  }

  const schools = schoolsSeed.schools as School[]
  const isEquipped = (s: School) => {
    const st = shipmentOf.get(s.id)?.status
    return st === 'delivered' || st === 'verified'
  }
  const equippedPoints = schools.filter(isEquipped)

  return schools.map((school) => {
    const survey = surveys.get(school.id) ?? null
    const shipment = shipmentOf.get(school.id) ?? null
    const status: SchoolStatus = shipment ? SHIPMENT_STATUS[shipment.status] : survey ? 'assessed' : 'unassessed'

    let tier: Tier | null = null
    let need: NeedInput | null = null
    let score: number | null = null
    if (survey) {
      tier = tierFromSurvey(survey.power, survey.signal)
      need = {
        pupils: survey.pupils,
        // The survey does not count existing devices; only delivered kits count.
        devices: isEquipped(school) && shipment ? shipment.devices.length : 0,
        tier,
        distanceToEquippedKm: nearestKm(school, equippedPoints),
      }
      score = needScore(need)
    }
    return { ...school, survey, tier, need, needScore: score, status, shipment }
  })
}

const schoolNames = new Map((schoolsSeed.schools as School[]).map((s) => [s.id, s.name]))

/** A school's name from the seed list (no server call; for labelling device-local items). */
export function schoolName(id: string): string {
  return schoolNames.get(id) ?? id
}

// ---------- partners and kits (seed data) ----------

export async function getPartners(): Promise<Partner[]> {
  await wait()
  return partnersSeed.partners as Partner[]
}

export async function getKits(): Promise<Kit[]> {
  await wait()
  return kitsSeed.kits as Kit[]
}

// ---------- course packs ----------
//
// 'courseReleases' { id: packId, version, publishedAt }  the version devices should install.
// A pack with no record is published at version 1.

interface CourseRelease extends DataRecord {
  version: number
  publishedAt: string
}

const FIRST_VERSION = 1

/** The published version of a course pack. Throws while Offline (the server can't be reached). */
export async function getPublishedVersion(packId: string): Promise<number> {
  if (!isOnline()) throw new Error('Offline')
  const releases = await getRecords<CourseRelease>('courseReleases')
  if (!isOnline()) throw new Error('Offline')
  return releases.find((r) => r.id === packId)?.version ?? FIRST_VERSION
}

/** Admin: publish a version of a course pack. Online only; not queued. */
export async function publishCourseVersion(packId: string, version: number): Promise<void> {
  if (!isOnline()) throw new Error('Offline')
  await wait()
  if (!isOnline()) throw new Error('Offline')
  upsert('courseReleases', { id: packId, version, publishedAt: new Date().toISOString() })
}

// ---------- device-only storage ----------
//
// For data that never leaves the device (e.g. student names and their progress).
// Same "ps43:" prefix, so other windows refresh and "Reset demo data" clears it.

export function getLocal<T>(key: string, fallback: T): T {
  return readJson<T>(KEY_PREFIX + key, fallback)
}

/** Save device-only data and notify listeners. Throws if storage is full. */
export function setLocal(key: string, value: unknown) {
  writeJson(KEY_PREFIX + key, value)
}

// ---------- demo reset ----------

/** Remove every app key from localStorage. */
export function resetDemoData() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(KEY_PREFIX))
    .forEach((k) => localStorage.removeItem(k))
  notify()
}

// If the app opens Online with items still queued (e.g. the tab was closed mid-flush), send them.
if (isOnline() && getQueueCount() > 0) void flushQueue()

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
import { isOpen, requestStatus } from './requests.ts'
import { needScore, nearestKm, tierFromSurvey, type NeedInput, type Tier } from './scoring.ts'
import { assetNumber, confirmationId, devicesForKit, latestBySchool, shipmentStatus } from './shipments.ts'
import type {
  Checkin,
  Confirmation,
  Kit,
  Partner,
  Party,
  Progress,
  RequestEvent,
  RequestStatus,
  ResourceRequest,
  School,
  SchoolStatus,
  Shipment,
  ShipmentStatus,
  Survey,
} from './types.ts'

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

/** Records in a collection still waiting in this device's upload queue. */
export function getQueuedRecords<T extends DataRecord>(collection: string): T[] {
  return getQueue()
    .filter((q) => q.collection === collection)
    .map((q) => q.record as T)
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
//   'surveys'       { id, schoolId, ...Survey }  one record per survey; the latest surveyedAt wins
//   'shipments'     Shipment                     replaces the seed shipment with the same id (Admin only)
//   'confirmations' Confirmation                 one per party per shipment: "conf-<shipmentId>-<party>"
//   'checkins'      Checkin                      one per check-in (unique ids)
//   'requests'      ResourceRequest              one per request (unique ids), never edited
//   'requestEvents' RequestEvent                 one per status change (unique ids)

export type SurveyRecord = DataRecord & Survey & { schoolId: string }
export type ShipmentRecord = DataRecord & Shipment
export type ConfirmationRecord = DataRecord & Confirmation
export type CheckinRecord = DataRecord & Checkin
export type ProgressRow = DataRecord & Progress
export type RequestRecord = DataRecord & ResourceRequest
export type RequestEventRecord = DataRecord & RequestEvent

/** A request with its status changes (oldest first) and the status they give it. */
export interface RequestView extends ResourceRequest {
  status: RequestStatus
  events: RequestEvent[]
  /** The newest event with a note, or null. */
  latestNote: RequestEvent | null
  /** The shipment created for this request, or null. */
  shipmentId: string | null
}

/** A shipment with its confirmations and the status they give it. */
export interface ShipmentView extends Shipment {
  status: ShipmentStatus
  coordinator: Confirmation | null
  teacher: Confirmation | null
}

export interface SchoolView extends School {
  survey: Survey | null
  /** Readiness tier from the survey, or null if not assessed. */
  tier: Tier | null
  /** Inputs for needScore(), so screens can re-rank with their own weights. Null if not assessed. */
  need: NeedInput | null
  /** Need score (0-100) with the default weights. Null if not assessed. */
  needScore: number | null
  status: SchoolStatus
  shipment: ShipmentView | null
  /** The newest check-in, or null. */
  checkin: Checkin | null
  /** The school's learning totals, or null if no student has used a device there yet. */
  progress: Progress | null
  /** The school's equipment and resource requests, newest first. */
  requests: RequestView[]
  /** Requests still Submitted or Checked by coordinator. */
  openRequests: number
}

const seedSurveys = demoState.surveys as Record<string, Survey>
const seedShipments = demoState.shipments as Shipment[]
const seedConfirmations = demoState.confirmations as Confirmation[]
const seedRequests = demoState.requests as ResourceRequest[]
const seedRequestEvents = demoState.requestEvents as RequestEvent[]

/** Seed records plus uploaded ones (an uploaded record replaces a seed one with the same id). */
async function seedPlusUploaded<T extends { id: string }>(collection: string, seed: T[]): Promise<T[]> {
  const uploaded = await getRecords<DataRecord & T>(collection)
  const byId = new Map<string, T>(seed.map((r) => [r.id, r]))
  uploaded.forEach((r) => byId.set(r.id, r))
  return [...byId.values()]
}

/** Every shipment with its confirmations and derived status. */
export async function getShipments(): Promise<ShipmentView[]> {
  const [shipments, confirmations] = await Promise.all([
    seedPlusUploaded('shipments', seedShipments),
    seedPlusUploaded('confirmations', seedConfirmations),
  ])
  const byId = new Map(confirmations.map((c) => [c.id, c]))
  return shipments.map((sh) => {
    const coordinator = byId.get(confirmationId(sh.id, 'coordinator')) ?? null
    const teacher = byId.get(confirmationId(sh.id, 'teacher')) ?? null
    return { ...sh, status: shipmentStatus(sh, coordinator, teacher), coordinator, teacher }
  })
}

export async function getShipment(id: string): Promise<ShipmentView | null> {
  return (await getShipments()).find((s) => s.id === id) ?? null
}

/** The newest check-in of each school. */
async function getLatestCheckins(): Promise<Map<string, Checkin>> {
  const latest = new Map<string, Checkin>()
  for (const c of await getRecords<CheckinRecord>('checkins')) {
    const current = latest.get(c.schoolId)
    if (!current || c.checkedAt >= current.checkedAt) latest.set(c.schoolId, c)
  }
  return latest
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

/** Learning totals per school. A record with nothing counted yet (e.g. a device just set up) is no progress. */
async function getProgressBySchool(): Promise<Map<string, Progress>> {
  const bySchool = new Map<string, Progress>()
  for (const p of await getRecords<ProgressRow>('progress')) {
    if (p.activeStudents > 0 || p.lessonsCompleted > 0 || p.quizAttempts > 0) bySchool.set(p.schoolId, p)
  }
  return bySchool
}

/** Every request with its events and derived status, grouped by school (newest first). */
async function getRequestsBySchool(shipments: ShipmentView[]): Promise<Map<string, RequestView[]>> {
  const [requests, events] = await Promise.all([
    seedPlusUploaded('requests', seedRequests),
    seedPlusUploaded('requestEvents', seedRequestEvents),
  ])
  const shipmentById = new Map(shipments.map((s) => [s.id, s]))
  const eventsOf = new Map<string, RequestEvent[]>()
  for (const e of [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    eventsOf.set(e.requestId, [...(eventsOf.get(e.requestId) ?? []), e])
  }

  const bySchool = new Map<string, RequestView[]>()
  for (const r of [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const own = eventsOf.get(r.id) ?? []
    const view: RequestView = {
      ...r,
      events: own,
      status: requestStatus(own, (id) => shipmentById.get(id)?.status),
      latestNote: [...own].reverse().find((e) => e.note) ?? null,
      shipmentId: [...own].reverse().find((e) => e.shipmentId)?.shipmentId ?? null,
    }
    bySchool.set(r.schoolId, [...(bySchool.get(r.schoolId) ?? []), view])
  }
  return bySchool
}

const SHIPMENT_STATUS: Record<ShipmentStatus, SchoolStatus> = {
  approved: 'kit approved',
  'in transit': 'in transit',
  delivered: 'delivered',
  verified: 'verified',
}

/** Every school with its latest survey, tier, need score, status, shipment, latest check-in and requests. */
export async function getSchools(): Promise<SchoolView[]> {
  const [surveys, shipments, checkins, progress] = await Promise.all([
    getLatestSurveys(),
    getShipments(),
    getLatestCheckins(),
    getProgressBySchool(),
  ])
  const requests = await getRequestsBySchool(shipments)

  // One shipment per school: the most recently created.
  const shipmentOf = latestBySchool(shipments)

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
    const own = requests.get(school.id) ?? []
    return {
      ...school,
      survey,
      tier,
      need,
      needScore: score,
      status,
      shipment,
      checkin: checkins.get(school.id) ?? null,
      progress: progress.get(school.id) ?? null,
      requests: own,
      openRequests: own.filter((r) => isOpen(r.status)).length,
    }
  })
}

// ---------- shipment actions (Admin) ----------

export interface NewShipment {
  schoolId: string
  tier: Tier
  kit: Kit
  partnerId: string
  transporterId: string
  /** Set by createShipmentForRequest, which links the request to this id. */
  id?: string
}

/**
 * Approve a kit: create the shipment with one device per kit device, numbered after the highest
 * asset id in use (uploaded, or still queued on this device), so asset ids never repeat.
 */
export async function createShipment(input: NewShipment): Promise<'uploaded' | 'queued'> {
  const queued = getQueue()
    .filter((q) => q.collection === 'shipments')
    .map((q) => q.record as ShipmentRecord)
  const used = [...(await getShipments()), ...queued].flatMap((s) => s.devices.map((d) => assetNumber(d.assetId)))
  const shipment: ShipmentRecord = {
    id: input.id ?? newId('ship'),
    schoolId: input.schoolId,
    tier: input.tier,
    kitId: input.kit.id,
    kitItems: input.kit.items,
    partnerId: input.partnerId,
    transporterId: input.transporterId,
    devices: devicesForKit(input.kit.items, Math.max(0, ...used) + 1),
    createdAt: new Date().toISOString(),
    inTransitAt: null,
  }
  return saveRecord('shipments', shipment)
}

export async function markInTransit(s: Shipment): Promise<'uploaded' | 'queued'> {
  // Only the stored fields: status and confirmations are never saved on the shipment.
  const { id, schoolId, tier, kitId, kitItems, partnerId, transporterId, devices, createdAt } = s
  const record: ShipmentRecord = {
    id,
    schoolId,
    tier,
    kitId,
    kitItems,
    partnerId,
    transporterId,
    devices,
    createdAt,
    inTransitAt: new Date().toISOString(),
  }
  return saveRecord('shipments', record)
}

// ---------- requests ----------

export type NewRequest = Omit<ResourceRequest, 'id' | 'createdAt' | 'demo'>

/** Teacher: send a new request (queued while Offline). Returns the new id too, so the screen can follow it. */
export async function saveRequest(input: NewRequest): Promise<{ id: string; result: 'uploaded' | 'queued' }> {
  const record: RequestRecord = { ...input, id: newId('rq'), createdAt: new Date().toISOString() }
  return { id: record.id, result: await saveRecord('requests', record) }
}

/** Coordinator or admin: record a status change as its own event (queued while Offline). */
export async function saveRequestEvent(input: Omit<RequestEvent, 'id' | 'createdAt'>): Promise<'uploaded' | 'queued'> {
  const record: RequestEventRecord = { ...input, id: newId('rqe'), createdAt: new Date().toISOString() }
  return saveRecord('requestEvents', record)
}

/**
 * Admin: approve a kit for the request's school through the usual shipment flow, and link the
 * request to the new shipment (an "Approved" event with its id). The request becomes Fulfilled
 * once that shipment is delivered.
 */
export async function createShipmentForRequest(input: NewShipment, requestId: string): Promise<'uploaded' | 'queued'> {
  const shipmentId = newId('ship')
  const result = await createShipment({ ...input, id: shipmentId })
  await saveRequestEvent({
    requestId,
    status: 'Approved',
    party: 'admin',
    note: `Shipment ${shipmentId} created for this request.`,
    shipmentId,
  })
  return result
}

/** This device's own confirmation for a shipment (waiting to upload, or uploaded), if any. */
export function getMyConfirmation(shipmentId: string, party: Party): OutboxItem | undefined {
  const id = confirmationId(shipmentId, party)
  return getOutbox('confirmations').find((o) => o.record.id === id)
}

const schoolNames = new Map((schoolsSeed.schools as School[]).map((s) => [s.id, s.name]))
const schoolRegions = new Map((schoolsSeed.schools as School[]).map((s) => [s.id, s.region]))

/** A school's region from the seed list (no server call). */
export function schoolRegion(id: string): string {
  return schoolRegions.get(id) ?? ''
}

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

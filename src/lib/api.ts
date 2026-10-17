// Fake server for the demo. Every module reads and writes through this file only.
//
// - "Uploaded" data lives under its own localStorage keys (ps43:server:<collection>).
// - Every server call waits ~300 ms to feel like a network.
// - While Offline, writes go into an upload queue (ps43:queue).
//   Switching to Online flushes the queue automatically.
// - Other open windows are told about changes through the browser "storage" event.
//   That event does not fire in the window that made the change, so we also
//   notify local listeners directly.

export const KEY_PREFIX = 'ps43:'
const SERVER_PREFIX = KEY_PREFIX + 'server:'
const QUEUE_KEY = KEY_PREFIX + 'queue'
const ONLINE_KEY = KEY_PREFIX + 'online'
const DELAY_MS = 300

export interface DataRecord {
  id: string
  [field: string]: unknown
}

interface QueueItem {
  collection: string
  record: DataRecord
  queuedAt: string
}

// ---------- helpers ----------

const wait = (ms = DELAY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms))

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

// ---------- upload queue ----------

export function getQueue(): QueueItem[] {
  return readJson<QueueItem[]>(QUEUE_KEY, [])
}

export function getQueueCount(): number {
  return getQueue().length
}

let flushing = false

/** Upload queued items one by one. Stops early if we go Offline mid-way. */
export async function flushQueue(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    while (isOnline()) {
      const [next] = getQueue()
      if (!next) break
      await wait()
      upsert(next.collection, next.record)
      // Re-read the queue: new items may have been added while we waited.
      writeJson(QUEUE_KEY, getQueue().slice(1))
    }
  } finally {
    flushing = false
  }
}

// ---------- records ----------

function upsert(collection: string, record: DataRecord) {
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
 * Returns whether it was uploaded now or queued.
 */
export async function saveRecord(collection: string, record: DataRecord): Promise<'uploaded' | 'queued'> {
  if (!isOnline()) {
    writeJson(QUEUE_KEY, [...getQueue(), { collection, record, queuedAt: new Date().toISOString() }])
    return 'queued'
  }
  await wait()
  upsert(collection, record)
  return 'uploaded'
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

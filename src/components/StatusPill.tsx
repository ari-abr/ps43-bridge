import { useEffect, useRef, useState } from 'react'
import { getQueue, setOnline } from '../lib/api'
import { toast } from '../lib/toast'
import { useSyncStatus } from '../lib/useSyncStatus'

/** How long the queue may sit unchanged while Online before we call it a failed upload. */
const STUCK_MS = 4000

const items = (n: number) => `${n} item${n === 1 ? '' : 's'}`

/**
 * One pill for the demo connection and the upload queue. Tap it to switch Online/Offline.
 * Green: Online, all synced. Yellow: Offline (or uploading). Red: Online but uploads are failing.
 */
export default function StatusPill() {
  const { online, queueCount } = useSyncStatus()
  const [stuck, setStuck] = useState(false)

  // Uploads take ~300 ms each; if the queue stops shrinking while Online, they are failing.
  useEffect(() => {
    setStuck(false)
    if (!online || queueCount === 0) return
    const t = setTimeout(() => setStuck(true), STUCK_MS)
    return () => clearTimeout(t)
  }, [online, queueCount])

  // "All uploaded" once the queue empties while Online.
  const peak = useRef(queueCount)
  useEffect(() => {
    if (queueCount > peak.current) peak.current = queueCount
    if (queueCount === 0) {
      if (online && peak.current > 0) toast('success', `All uploaded: ${items(peak.current)} sent.`)
      peak.current = 0
    }
  }, [online, queueCount])

  const [tone, text] = !online
    ? (['wait', queueCount === 0 ? 'Offline · nothing waiting' : `Offline · ${queueCount} waiting to upload`] as const)
    : queueCount === 0
      ? (['ok', 'Online · all synced'] as const)
      : stuck
        ? (['error', `Online · ${queueCount} could not upload`] as const)
        : (['wait', `Online · uploading ${queueCount}…`] as const)

  // e.g. "1 surveys, 1 progress": what is waiting, by collection.
  const waiting = Object.entries(
    getQueue().reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.collection]: (acc[q.collection] ?? 0) + 1 }), {}),
  )
    .map(([collection, n]) => `${n} ${collection}`)
    .join(', ')

  const help =
    tone === 'error'
      ? 'Uploads are failing. Switch Offline and back Online to try again.'
      : `Demo connection. Tap to go ${online ? 'Offline' : 'Online'}.`

  return (
    <>
      <button
        type="button"
        className={`status-pill status-${tone}`}
        onClick={() => setOnline(!online)}
        aria-label={`${text}. ${help}`}
        title={[help, waiting && `Waiting: ${waiting}`].filter(Boolean).join('\n')}
      >
        <span className="status-dot" aria-hidden="true" />
        <span>{text}</span>
      </button>
      <span className="sr-only" role="status">
        {text}
      </span>
    </>
  )
}

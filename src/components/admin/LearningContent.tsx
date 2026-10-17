import { useCallback, useEffect, useState } from 'react'
import { getPublishedVersion, publishCourseVersion, subscribe } from '../../lib/api'
import { PACK_ID, latestPackVersion } from '../../lib/learning'
import { useSyncStatus } from '../../lib/useSyncStatus'

/** Admin: which Times Tables version devices should install. Devices pick it up when they are Online. */
export default function LearningContent() {
  const { online } = useSyncStatus()
  const [published, setPublished] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latest = latestPackVersion(PACK_ID)

  const load = useCallback(async () => {
    try {
      setPublished(await getPublishedVersion(PACK_ID))
    } catch {
      // Offline: keep showing the last known version.
    }
  }, [])

  useEffect(() => {
    void load()
    return subscribe(() => void load())
  }, [load, online])

  async function publish() {
    setBusy(true)
    setError(null)
    try {
      await publishCourseVersion(PACK_ID, latest)
    } catch {
      setError('Could not publish. Check you are Online and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card learning-content">
      <h2>Learning content</h2>
      <p>
        Times Tables: published version <strong>{published ?? '…'}</strong>
      </p>
      {published !== null && published < latest ? (
        <button type="button" className="btn-primary" onClick={publish} disabled={busy || !online}>
          {busy ? 'Publishing…' : `Publish Times Tables v${latest}`}
        </button>
      ) : (
        published !== null && <p className="muted small">Devices install the newest version when they are next Online.</p>
      )}
      {!online && <p className="muted small">Go Online to publish or check versions.</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

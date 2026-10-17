import { useCallback, useEffect, useState } from 'react'
import { getPublishedVersion, publishCourseVersion, subscribe } from '../../lib/api'
import { PACK_ID, latestPackVersion } from '../../lib/learning'
import { simulate30Days, type SimulationResult } from '../../lib/simulate'
import { useSyncStatus } from '../../lib/useSyncStatus'

/** Admin: which Times Tables version devices should install. Devices pick it up when they are Online. */
export default function LearningContent() {
  const { online } = useSyncStatus()
  const [published, setPublished] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simulated, setSimulated] = useState<SimulationResult | null>(null)
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

  async function simulate() {
    setSimulating(true)
    try {
      setSimulated(await simulate30Days())
    } finally {
      setSimulating(false)
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

      <h3>Demo helper</h3>
      <p className="muted small">
        Fills schools with a verified kit with simulated learning totals and one check-in. Schools that already have
        real progress are left alone.
      </p>
      <button type="button" className="btn-secondary" onClick={simulate} disabled={simulating}>
        {simulating ? 'Simulating…' : 'Simulate 30 days'}
      </button>
      {simulated && (
        <p className="small" role="status">
          Simulated demo data: {simulated.progressFilled} school{simulated.progressFilled === 1 ? '' : 's'} filled
          {simulated.skippedReal > 0 && `, ${simulated.skippedReal} skipped (real progress kept)`}, {simulated.checkins}{' '}
          check-in{simulated.checkins === 1 ? '' : 's'}. "Reset demo data" clears it.
        </p>
      )}
    </div>
  )
}

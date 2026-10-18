import { useCallback, useEffect, useState } from 'react'
import { getPublishedVersion, publishCourseVersion, subscribe } from '../../lib/api'
import { getDemoScene, setUpDemoScene, type DemoScene } from '../../lib/demo'
import { PACK_ID, latestPackVersion } from '../../lib/learning'
import { simulate30Days, type SimulationResult } from '../../lib/simulate'
import { toast } from '../../lib/toast'
import { useSyncStatus } from '../../lib/useSyncStatus'
import ConfirmDialog from '../ui/ConfirmDialog'
import ResetDemoButton from '../ui/ResetDemoButton'

/** Presenter tools for the stage demo: set up the scene, publish the course update, simulate time, reset. */
export default function DemoControls() {
  const { online } = useSyncStatus()
  const [published, setPublished] = useState<number | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simulated, setSimulated] = useState<SimulationResult | null>(null)
  const [simulateError, setSimulateError] = useState<string | null>(null)
  const [settingUp, setSettingUp] = useState(false)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [scene, setScene] = useState<DemoScene | null>(getDemoScene)
  const [askScene, setAskScene] = useState(false)
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
    return subscribe(() => {
      setScene(getDemoScene())
      void load()
    })
  }, [load, online])

  async function publish() {
    setPublishing(true)
    setPublishError(null)
    try {
      await publishCourseVersion(PACK_ID, latest)
      toast('success', `Times Tables v${latest} published. Devices install it when they are next Online.`)
    } catch {
      setPublishError('Could not publish. Check you are Online and try again.')
      toast('error', 'Could not publish the course update.')
    } finally {
      setPublishing(false)
    }
  }

  async function simulate() {
    setSimulating(true)
    setSimulateError(null)
    try {
      setSimulated(await simulate30Days())
      toast('success', 'Simulated 30 days of learning and check-ins.')
    } catch {
      setSimulateError('Could not simulate (device storage full?). Try "Reset demo data".')
      toast('error', 'Could not simulate 30 days.')
    } finally {
      setSimulating(false)
    }
  }

  async function setUpScene() {
    setAskScene(false)
    setSettingUp(true)
    setSceneError(null)
    setSimulated(null)
    try {
      setScene(await setUpDemoScene())
      toast('success', 'Demo scene ready.')
    } catch (err) {
      toast('error', 'Could not set up the demo scene.')
      setSceneError(err instanceof Error ? err.message : 'Could not set up the demo scene.')
    } finally {
      setSettingUp(false)
    }
  }

  const upToDate = published !== null && published >= latest

  return (
    <details className="card demo-controls">
      <summary>Demo controls</summary>
      <p className="muted small">For the presenter. These change demo data on this device only.</p>

      <h2>Demo scene</h2>
      <p className="muted small">
        Resets all data, then picks grey (unassessed) schools for the live survey and approves a kit for one assessed
        school for the delivery demo. Needs Online.
      </p>
      <button type="button" className="btn-secondary" onClick={() => setAskScene(true)} disabled={settingUp || !online}>
        {settingUp ? 'Setting up…' : 'Set up demo scene'}
      </button>
      <ConfirmDialog
        open={askScene}
        title="Set up the demo scene?"
        confirmLabel="Yes, clear and set up"
        onConfirm={setUpScene}
        onCancel={() => setAskScene(false)}
      >
        <p>This clears all demo data on this device first, then sets up the schools for the stage demo.</p>
      </ConfirmDialog>
      {!online && <p className="muted small">Go Online to set up the scene.</p>}
      {sceneError && (
        <p className="form-error" role="alert">
          {sceneError}
        </p>
      )}
      {scene ? (
        <div className="scene" role="status">
          <p className="scene-title">Live survey: use these grey schools in Field Tools</p>
          <ul className="plain-list">
            {scene.surveySchools.map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong> <span className="muted">({s.region})</span>
              </li>
            ))}
          </ul>
          <p className="scene-title">Delivery: scan, confirm, then teacher confirms</p>
          <ul className="plain-list">
            <li>
              <strong>{scene.delivery.name}</strong> <span className="muted">({scene.delivery.region})</span>
              <br />
              <span className="muted small">
                Tier 1 kit approved · {scene.delivery.devices} devices · shipment {scene.delivery.shipmentId}
              </span>
            </li>
          </ul>
          <p className="muted small">Demo data. "Reset demo data" clears the scene.</p>
        </div>
      ) : (
        <p className="muted small">No scene set up yet.</p>
      )}

      <h2>Learning content</h2>
      <p>
        Times Tables: published version <strong>{published ?? '…'}</strong>
      </p>
      <button type="button" className="btn-secondary" onClick={publish} disabled={publishing || !online || published === null || upToDate}>
        {publishing ? 'Publishing…' : upToDate ? `Times Tables v${latest} is published` : `Publish Times Tables v${latest}`}
      </button>
      {!online ? (
        <p className="muted small">Go Online to publish or check versions.</p>
      ) : (
        upToDate && <p className="muted small">Devices install the newest version when they are next Online.</p>
      )}
      {publishError && <p className="form-error">{publishError}</p>}

      <h2>Time</h2>
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
          check-in{simulated.checkins === 1 ? '' : 's'}.
        </p>
      )}
      {simulateError && <p className="form-error">{simulateError}</p>}

      <h2>Reset</h2>
      <ResetDemoButton />
    </details>
  )
}

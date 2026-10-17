import { useLearning } from '../../lib/useLearning'
import { timeOf } from './LearnShell'

/** "Progress saved on this device" (waiting to upload) vs "Progress uploaded". */
export default function ProgressSyncNote() {
  const { progressSync } = useLearning()

  return (
    <div className="progress-sync small" role="status">
      {progressSync.state === 'none' && <span className="muted">No progress yet.</span>}
      {progressSync.state === 'waiting' && (
        <span className="badge badge-wait">Progress saved on this device · will upload when Online</span>
      )}
      {progressSync.state === 'uploading' && (
        <span className="badge badge-wait">Progress saved on this device · uploading…</span>
      )}
      {progressSync.state === 'uploaded' && (
        <span className="badge badge-ok">Progress uploaded {timeOf(progressSync.at)}</span>
      )}
      <span className="muted">Only school totals are uploaded. Names stay on this device.</span>
    </div>
  )
}

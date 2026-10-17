import { useState, type ReactNode } from 'react'
import { schoolName } from '../../lib/api'
import { dismissUpdateNotice } from '../../lib/learning'
import { useCourseUpdates, useLearning } from '../../lib/useLearning'
import DeviceSchoolPicker from './DeviceSchoolPicker'

export const timeOf = (iso: string) => {
  const d = new Date(iso)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString()} ${time}`
}

/**
 * Wraps both Learning pages: asks which school the device is at (once),
 * shows the school with a "Change school" link and the installed course version.
 */
export default function LearnShell({ title, children }: { title: string; children: ReactNode }) {
  const { schoolId, packState } = useLearning()
  const [changing, setChanging] = useState(false)
  const { online, checking } = useCourseUpdates(schoolId !== null)

  if (!schoolId || changing) {
    return (
      <div className="learn">
        <h1>{title}</h1>
        <DeviceSchoolPicker onChosen={() => setChanging(false)} onCancel={schoolId ? () => setChanging(false) : undefined} />
      </div>
    )
  }

  const { notice } = packState
  const checked = packState.lastCheckedAt ? timeOf(packState.lastCheckedAt) : 'never'

  return (
    <div className="learn">
      <h1>{title}</h1>
      <p className="learn-school small">
        <span>
          Device at <strong>{schoolName(schoolId)}</strong>
        </span>
        <button type="button" className="btn-link" onClick={() => setChanging(true)}>
          Change school
        </button>
      </p>

      <p className="muted small course-status" role="status">
        Times Tables · Installed: version {packState.version}
        {checking ? ', checking for updates…' : online ? `, checked ${checked}` : `, last checked ${checked}`}
        {!online && ' (Offline: using the installed version)'}
      </p>

      {notice && (
        <div className="save-result is-uploaded" role="status">
          <strong>Course updated to version {notice.to}</strong>
          <p>{notice.releaseNotes}</p>
          {(notice.newLessons.length > 0 || notice.newQuestions > 0) && (
            <ul className="plain-list">
              {notice.newLessons.map((t) => (
                <li key={t}>New lesson: {t}</li>
              ))}
              {notice.newQuestions > 0 && <li>{notice.newQuestions} new quiz questions</li>}
            </ul>
          )}
          <p>Everyone's progress is kept.</p>
          <button type="button" className="btn-secondary" onClick={dismissUpdateNotice}>
            OK
          </button>
        </div>
      )}

      {children}
    </div>
  )
}

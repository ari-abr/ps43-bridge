import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { schoolName } from '../../lib/api'
import { dismissUpdateNotice } from '../../lib/learning'
import { saveRole } from '../../lib/roles'
import PageHeader from '../ui/PageHeader'
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
const VIEWS = [
  { role: 'student', label: 'Student', to: '/learn/student' },
  { role: 'teacher', label: 'Teacher', to: '/learn/teacher' },
] as const

type LearnRole = (typeof VIEWS)[number]['role']

function Header({ role }: { role: LearnRole }) {
  return (
    <PageHeader
      tone="yellow"
      eyebrow={`PS43 Bridge · Learning · ${role === 'student' ? 'Student' : 'Teacher'}`}
      title={role === 'student' ? 'Times Tables' : 'My class'}
      intro={
        role === 'student'
          ? 'Learn your times tables, one lesson at a time. Then try the quiz!'
          : 'See how your class is doing and who needs a little help.'
      }
    >
      <nav className="learn-switch" aria-label="Learning view">
        {VIEWS.map((v) => (
          <Link key={v.role} to={v.to} className={v.role === role ? 'is-current' : ''} aria-current={v.role === role ? 'page' : undefined}>
            {v.label}
          </Link>
        ))}
      </nav>
    </PageHeader>
  )
}

export default function LearnShell({ role, children }: { role: LearnRole; children: ReactNode }) {
  const { schoolId, packState } = useLearning()
  const [changing, setChanging] = useState(false)
  const { online, checking } = useCourseUpdates(schoolId !== null)

  // The header's "Learning" link reopens the view used last.
  useEffect(() => {
    try {
      saveRole(role)
    } catch {
      // Storage blocked: the link opens the Student view.
    }
  }, [role])

  if (!schoolId || changing) {
    return (
      <div className="learn">
        <Header role={role} />
        <DeviceSchoolPicker onChosen={() => setChanging(false)} onCancel={schoolId ? () => setChanging(false) : undefined} />
      </div>
    )
  }

  const { notice } = packState
  const checked = packState.lastCheckedAt ? timeOf(packState.lastCheckedAt) : 'never'

  return (
    <div className="learn">
      <Header role={role} />
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
        <div className="save-result is-uploaded is-stacked" role="status">
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

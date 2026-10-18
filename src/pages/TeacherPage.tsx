import { useMemo, useState } from 'react'
import DeliveryCard from '../components/learn/DeliveryCard'
import LearnShell from '../components/learn/LearnShell'
import ProgressSyncNote from '../components/learn/ProgressSyncNote'
import StatsBand from '../components/ui/StatsBand'
import { MASTERY_PERCENT, addDemoClass, classTotals, summariseStudent } from '../lib/learning'
import { useLearning } from '../lib/useLearning'

const pct = (n: number | null) => (n === null ? '–' : `${n}%`)

export default function TeacherPage() {
  const { students, pack, schoolId } = useLearning()
  const [error, setError] = useState<string | null>(null)

  const summaries = useMemo(
    () => students.map((s) => summariseStudent(s, pack)).sort((a, b) => a.student.name.localeCompare(b.student.name)),
    [students, pack],
  )
  const totals = classTotals(summaries)
  const mastered = summaries.filter((s) => s.active && s.mastered).length

  function addDemo() {
    try {
      addDemoClass()
      setError(null)
    } catch {
      setError('This device is out of storage space.')
    }
  }

  return (
    <LearnShell role="teacher">
      {schoolId && <DeliveryCard schoolId={schoolId} />}
      <StatsBand
        label="Class summary"
        items={[
          {
            label: 'Active Students',
            value: totals.activeStudents,
            hint: `Of ${students.length} on this device. Did a lesson or a quiz.`,
            tone: 'green',
          },
          { label: 'Average Score', value: pct(totals.averageScore), hint: "Each student's latest quiz", tone: 'navy' },
          {
            label: 'Mastery Rate',
            value: pct(totals.masteryRate),
            hint: `${mastered} of ${totals.activeStudents} scored ${MASTERY_PERCENT}% or more`,
            tone: 'yellow',
          },
        ]}
      />

      <div className="card">
        <div className="panel-head">
          <h2 className="section-title">Class progress</h2>
          {!students.some((s) => s.demo) && (
            <button type="button" className="btn-secondary" onClick={addDemo}>
              Add demo class
            </button>
          )}
        </div>
        <p className="muted small">
          {pack.title} version {pack.version}: {pack.lessons.length} lessons, {pack.quiz.length}-question quiz. Mastered ={' '}
          {MASTERY_PERCENT}% or more.
        </p>
        {error && <p className="form-error">{error}</p>}

        {summaries.length === 0 ? (
          <p className="muted empty">Students appear here once they enter their name on this device.</p>
        ) : (
          <div className="table-wrap">
            <table className="class-table stack-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Lessons</th>
                  <th>Latest</th>
                  <th>Best</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.student.id}>
                    <td data-label="Student">
                      {s.student.name}
                      {s.student.demo && <span className="pill pill-demo">demo</span>}
                    </td>
                    <td data-label="Lessons">
                      {s.lessonsDone} / {pack.lessons.length}
                    </td>
                    <td data-label="Latest">{pct(s.latest)}</td>
                    <td data-label="Best">{pct(s.best)}</td>
                    <td data-label="Status">
                      {s.mastered ? (
                        <span className="chip chip-ok">Mastered</span>
                      ) : (
                        <span className="chip chip-wait">{s.best === null ? 'No quiz yet' : 'Needs help'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ProgressSyncNote />
      </div>
    </LearnShell>
  )
}

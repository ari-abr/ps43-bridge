import { useMemo, useState } from 'react'
import LearnShell from '../components/learn/LearnShell'
import ProgressSyncNote from '../components/learn/ProgressSyncNote'
import { MASTERY_PERCENT, addDemoClass, classTotals, summariseStudent } from '../lib/learning'
import { useLearning } from '../lib/useLearning'

const pct = (n: number | null) => (n === null ? '–' : `${n}%`)

export default function TeacherPage() {
  const { students, pack } = useLearning()
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
    <LearnShell title="Learning: Teacher">
      <div className="summary" role="group" aria-label="Class summary">
        <div className="summary-item" title="At least one lesson done or one quiz attempt">
          <div className="summary-value">{totals.activeStudents}</div>
          <div className="summary-label">Active students (of {students.length})</div>
        </div>
        <div className="summary-item" title="Average of each student's latest quiz score">
          <div className="summary-value">{pct(totals.averageScore)}</div>
          <div className="summary-label">Average quiz score</div>
        </div>
        <div className="summary-item" title={`Active students with a best score of ${MASTERY_PERCENT}% or more`}>
          <div className="summary-value">{pct(totals.masteryRate)}</div>
          <div className="summary-label">
            Mastery rate ({mastered} of {totals.activeStudents})
          </div>
        </div>
      </div>

      <div className="card">
        <div className="panel-head">
          <h2>Class progress</h2>
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
            <table className="class-table">
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
                    <td>
                      {s.student.name}
                      {s.student.demo && <span className="pill pill-demo">demo</span>}
                    </td>
                    <td>
                      {s.lessonsDone} / {pack.lessons.length}
                    </td>
                    <td>{pct(s.latest)}</td>
                    <td>{pct(s.best)}</td>
                    <td>
                      {s.mastered ? (
                        <span className="badge badge-ok">Mastered</span>
                      ) : (
                        <span className="badge badge-wait" title={s.best === null ? 'No quiz attempt yet' : `Best score below ${MASTERY_PERCENT}%`}>
                          Needs help
                        </span>
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

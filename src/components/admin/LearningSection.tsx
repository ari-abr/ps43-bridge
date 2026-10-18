import type { SchoolView } from '../../lib/api'
import { when } from './ShipmentSection'

const pct = (n: number | null) => (n === null ? '–' : `${n}%`)

/** School panel: the school's learning totals from its devices (no student names). */
export default function LearningSection({ school }: { school: SchoolView }) {
  const p = school.progress
  const delivered = school.status === 'delivered' || school.status === 'verified'
  return (
    <section className="panel-section" aria-label="Learning">
      <h3 className="label-rule">Learning</h3>
      {p ? (
        <>
          <p className="big-figure">
            <strong>{pct(p.masteryRate)}</strong> mastery rate
          </p>
          <dl className="facts">
            <dt>Active students</dt>
            <dd>{p.activeStudents}</dd>
            <dt>Lessons completed</dt>
            <dd>{p.lessonsCompleted}</dd>
            <dt>Quiz attempts</dt>
            <dd>{p.quizAttempts}</dd>
            <dt>Average score</dt>
            <dd>{pct(p.averageScore)}</dd>
            <dt>Course version</dt>
            <dd>{p.courseVersion}</dd>
            <dt>Last updated</dt>
            <dd>
              {when(p.updatedAt)} {p.simulated && <span className="chip chip-demo">Simulated demo data</span>}
            </dd>
          </dl>
          <p className="help">Mastery rate: share of active students scoring 80% or more on the quiz. Totals only, no names.</p>
        </>
      ) : (
        <p className="muted">
          No learning data yet.{' '}
          {delivered ? 'It appears once students use the devices and the school syncs.' : 'Learning starts after a kit is delivered.'}
        </p>
      )}
    </section>
  )
}

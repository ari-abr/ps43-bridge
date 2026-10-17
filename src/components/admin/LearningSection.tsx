import type { SchoolView } from '../../lib/api'
import { when } from './ShipmentSection'

const pct = (n: number | null) => (n === null ? '–' : `${n}%`)

/** School panel: the school's learning totals from its devices (no student names). */
export default function LearningSection({ school }: { school: SchoolView }) {
  const p = school.progress
  const delivered = school.status === 'delivered' || school.status === 'verified'
  return (
    <>
      <h3>Learning</h3>
      {p ? (
        <dl className="facts">
          <dt>Active students</dt>
          <dd>{p.activeStudents}</dd>
          <dt>Lessons completed</dt>
          <dd>{p.lessonsCompleted}</dd>
          <dt>Quiz attempts</dt>
          <dd>{p.quizAttempts}</dd>
          <dt>Average score</dt>
          <dd>{pct(p.averageScore)}</dd>
          <dt>Mastery rate</dt>
          <dd>{pct(p.masteryRate)}</dd>
          <dt>Course version</dt>
          <dd>{p.courseVersion}</dd>
          <dt>Last updated</dt>
          <dd>
            {when(p.updatedAt)} {p.simulated && <span className="pill pill-demo">simulated demo data</span>}
          </dd>
        </dl>
      ) : (
        <p className="muted">
          No learning data yet.{' '}
          {delivered ? 'It appears once students use the devices and the school syncs.' : 'Learning starts after a kit is delivered.'}
        </p>
      )}
    </>
  )
}

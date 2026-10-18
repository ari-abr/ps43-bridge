import type { ScoreBreakdown as Breakdown } from '../../lib/scoring'

/** Factors whose points are at least this share of the biggest one are named as drivers too. */
const CLOSE_TO_TOP = 0.7

function driverSentence({ factors }: Breakdown): string {
  const top = Math.max(...factors.map((f) => f.points))
  if (top === 0) return 'Nothing adds to this score: the school already has what the factors look for.'
  const drivers = [...factors]
    .filter((f) => f.points >= top * CLOSE_TO_TOP)
    .sort((a, b) => b.points - a.points)
    .map((f) => f.driver)
  const list = drivers.length > 1 ? `${drivers.slice(0, -1).join(', ')} and ${drivers[drivers.length - 1]}` : drivers[0]
  return `Mostly driven by: ${list}.`
}

/** "Why this score?": what each factor adds to the need score with the current Priority settings. */
export default function ScoreBreakdown({ breakdown }: { breakdown: Breakdown }) {
  // One scale for all bars, so their lengths compare. The pale part is the most a factor can add.
  const scale = Math.max(...breakdown.factors.map((f) => f.maxPoints))
  const pct = (n: number, of: number) => `${of > 0 ? Math.min(100, (n / of) * 100) : 0}%`
  return (
    <details className="priority-settings why-score">
      <summary>Why this score?</summary>
      <p className="muted small">
        Each bar shows the points a factor adds. Change the Priority settings to make a factor count more or less.
      </p>
      <ul className="score-bars">
        {breakdown.factors.map((f) => (
          <li key={f.key}>
            <span className="score-bar-head">
              <span>{f.label}</span>
              <strong>{f.points.toFixed(1)}</strong>
            </span>
            <span
              className="score-bar"
              role="meter"
              aria-label={f.label}
              aria-valuemin={0}
              aria-valuemax={f.maxPoints}
              aria-valuenow={f.points}
              aria-valuetext={`${f.points.toFixed(1)} of up to ${f.maxPoints.toFixed(1)} points`}
            >
              <span className="score-bar-max" style={{ width: pct(f.maxPoints, scale) }}>
                <span className="score-bar-fill" style={{ width: pct(f.points, f.maxPoints) }} />
              </span>
            </span>
            <span className="muted small">
              {f.value} · up to {f.maxPoints.toFixed(1)} points
            </span>
          </li>
        ))}
      </ul>
      <p className="score-total">
        <span>Need score</span>
        <strong>{breakdown.score.toFixed(1)}</strong>
      </p>
      <p className="small">{driverSentence(breakdown)}</p>
    </details>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { curriculum as c, LAST_UPDATED, type Level, type LevelPlan } from '../content/curriculum'
import { Arrow, Info, Printer } from '../components/ui/Icons'
import PageHeader from '../components/ui/PageHeader'

type Filter = 'all' | Level

const FILTER_KEY = 'ps43:curriculumLevel'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
]
// Heading band colours cycle: green, navy, red, yellow (navy text), green.
const BANDS = ['green', 'navy', 'red', 'yellow', 'green']

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function loadFilter(): Filter {
  try {
    const saved = localStorage.getItem(FILTER_KEY)
    if (saved === 'primary' || saved === 'secondary') return saved
  } catch {
    // Storage unavailable: show everything.
  }
  return 'all'
}

function LevelBlock({ level, plan, hidden }: { level: Level; plan: LevelPlan; hidden: boolean }) {
  const name = level === 'primary' ? 'Primary' : 'Secondary'
  return (
    <div className={`cur-level ${hidden ? 'is-filtered' : ''}`}>
      <h3 className="cur-level-title">{name}</h3>
      <p className="cur-goal">{plan.goal}</p>
      <div className="cur-units">
        {plan.units.map((u) => (
          <article key={u.title} className="card cur-unit">
            <span className={`chip cur-chip cur-chip-${u.level}`}>{name}</span>
            <h4 className="cur-unit-title">{u.title}</h4>
            <p className="cur-unit-text">{u.description}</p>
            {u.courseLink && (
              <Link to="/learn/student" className="btn-primary cur-open no-print">
                Open the Times Tables course
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

export default function CurriculumPage() {
  const [filter, setFilter] = useState<Filter>(loadFilter)

  const choose = (f: Filter) => {
    setFilter(f)
    try {
      localStorage.setItem(FILTER_KEY, f)
    } catch {
      // Not saved; the filter still works for this visit.
    }
  }

  return (
    <div className="compliance curriculum">
      <PageHeader
        tone="navy"
        eyebrow={c.eyebrow}
        title={c.title}
        intro={c.intro}
        actions={
          <button type="button" className="btn-accent no-print" onClick={() => window.print()}>
            <Printer /> Print
          </button>
        }
      />

      <aside className="callout callout-info disclaimer" aria-label="Draft notice">
        <Info size={24} />
        <p>
          <strong>Draft. </strong>
          {c.notice}
        </p>
      </aside>

      <div className="cur-filter no-print" role="group" aria-label="Filter units by level">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className={filter === f.value ? 'is-active' : ''} aria-pressed={filter === f.value} onClick={() => choose(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <section className="compliance-section" aria-labelledby="principles-title">
        <h2 id="principles-title" className="section-title">
          <Arrow className="arrow-red" size={24} /> Guiding principles
        </h2>
        <ul className="cur-principles">
          {c.principles.map((pr) => (
            <li key={pr.title} className="card">
              <h3 className="cur-card-title">{pr.title}</h3>
              <p>{pr.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="compliance-section" aria-labelledby="levels-title">
        <h2 id="levels-title" className="section-title">
          <Arrow className="arrow-red" size={24} /> Levels
        </h2>
        <div className="card table-wrap">
          <table className="class-table cur-levels">
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th scope="col">Typical age</th>
                <th scope="col">Focus</th>
              </tr>
            </thead>
            <tbody>
              {c.levels.map((l) => (
                <tr key={l.level}>
                  <th scope="row">{l.level}</th>
                  <td>{l.age}</td>
                  <td>{l.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {c.subjects.map((subject, i) => (
        <section key={subject.id} id={subject.id} className="compliance-section cur-subject" aria-labelledby={`${subject.id}-title`}>
          <h2 id={`${subject.id}-title`} className={`cur-band cur-band-${BANDS[i % BANDS.length]}`}>
            {subject.title}
          </h2>
          <LevelBlock level="primary" plan={subject.primary} hidden={filter === 'secondary'} />
          <LevelBlock level="secondary" plan={subject.secondary} hidden={filter === 'primary'} />
        </section>
      ))}

      <section className="compliance-section" aria-labelledby="delivery-title">
        <h2 id="delivery-title" className="section-title">
          <Arrow className="arrow-red" size={24} /> Delivery and assessment
        </h2>
        <ul className="card cur-delivery">
          {c.delivery.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section className="compliance-section" aria-labelledby="next-title">
        <h2 id="next-title" className="section-title">
          <Arrow className="arrow-red" size={24} /> Next steps
        </h2>
        <div className="card">
          <ol className="priority-steps">
            {c.nextSteps.map((step, i) => (
              <li key={step}>
                <span className="how-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <p className="compliance-footer small muted">{c.footer(formatDate(LAST_UPDATED))}</p>
    </div>
  )
}

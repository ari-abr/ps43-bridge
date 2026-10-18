import { Link } from 'react-router-dom'
import { roadmap as r, LAST_UPDATED, type Step } from '../content/roadmap'
import { Arrow, Check, Info, Printer } from '../components/ui/Icons'
import PageHeader from '../components/ui/PageHeader'

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="section-title">
      <Arrow className="arrow-red" size={24} /> {children}
    </h2>
  )
}

function StepCard({ step, n }: { step: Step; n: number }) {
  return (
    <li className="card rm-step">
      <div className="rm-step-head">
        <span className="how-num" aria-hidden="true">
          {n}
        </span>
        <h3 className="law-title">{step.title}</h3>
        <span className="chip">{step.months}</span>
      </div>
      <p className="law-text">{step.goal}</p>
      <ul className="rm-bullets">
        {step.actions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      {step.check && (
        <>
          <h4 className="label-rule">Before moving on</h4>
          <ul className="check-list">
            {step.check.map((c) => (
              <li key={c}>
                <Check className="check-icon" size={20} />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="rm-ifnot">
            <strong>If not: </strong>
            {step.ifNot}
          </p>
        </>
      )}
    </li>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="card rm-bullets rm-list">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  )
}

export default function RoadmapPage() {
  return (
    <div className="compliance roadmap">
      <PageHeader
        tone="navy"
        eyebrow={r.eyebrow}
        title={r.title}
        intro={r.intro}
        actions={
          <button type="button" className="btn-accent no-print" onClick={() => window.print()}>
            <Printer /> Print
          </button>
        }
      />

      <aside className="callout callout-info disclaimer" aria-label="Planning notice">
        <Info size={24} />
        <p>
          <strong>Planning draft. </strong>
          {r.notice}
        </p>
      </aside>

      <section className="compliance-section" aria-labelledby="steps-title">
        <SectionTitle id="steps-title">Step by step</SectionTitle>
        <ol className="rm-steps">
          {r.steps.map((s, i) => (
            <StepCard key={s.id} step={s} n={i + 1} />
          ))}
        </ol>
      </section>

      <section className="compliance-section" aria-labelledby="measure-title">
        <SectionTitle id="measure-title">{r.measure.title}</SectionTitle>
        <List items={r.measure.items} />
      </section>

      <section className="compliance-section" aria-labelledby="risks-title">
        <SectionTitle id="risks-title">{r.risks.title}</SectionTitle>
        <div className="card table-wrap">
          <table className="class-table stack-table rm-table" aria-label={r.risks.title}>
            <thead>
              <tr>
                {r.risks.columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.risks.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i} data-label={r.risks.columns[i]}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="compliance-section" aria-labelledby="team-title">
        <SectionTitle id="team-title">{r.team.title}</SectionTitle>
        <div className="card">
          <ul className="rm-bullets">
            {r.team.team.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="law-text rm-budget">{r.team.budget}</p>
        </div>
      </section>

      <div className="rm-links no-print">
        <Link to="/compliance" className="btn-secondary">
          Legal Compliance
        </Link>
        <Link to="/curriculum" className="btn-secondary">
          Curriculum Plan
        </Link>
        <Link to="/admin/report" className="btn-secondary">
          Donor report
        </Link>
        <Link to="/admin" className="btn-primary">
          Open the Admin Map
        </Link>
      </div>

      <p className="compliance-footer small muted">{r.footer(formatDate(LAST_UPDATED))}</p>
    </div>
  )
}

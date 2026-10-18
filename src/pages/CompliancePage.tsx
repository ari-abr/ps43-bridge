import { compliance, LAST_UPDATED, type LawCard } from '../content/compliance'
import { Alert, Arrow, Check, Info, Printer } from '../components/ui/Icons'
import PageHeader from '../components/ui/PageHeader'

const c = compliance
const { priorities, support } = c

const JUMP_LINKS = [...c.sections, priorities, support].map(({ id, nav }) => ({ id, nav }))

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function Card({ card }: { card: LawCard }) {
  return (
    <article className="card law-card">
      <h3 className="law-title">{card.title}</h3>
      <h4 className="label-rule">Overview</h4>
      <p className="law-text">{card.overview}</p>
      {card.actions && (
        <>
          <h4 className="label-rule">Required actions</h4>
          <ul className="check-list">
            {card.actions.map((a) => (
              <li key={a}>
                <Check className="check-icon" size={20} />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {card.highRisk && (
        <p className="callout callout-warn">
          <Alert size={22} />
          <span>
            <strong>High risk: </strong>
            {card.highRisk}
          </span>
        </p>
      )}
      {card.note && (
        <p className="callout callout-info">
          <Info size={22} />
          <span>{card.note}</span>
        </p>
      )}
    </article>
  )
}

export default function CompliancePage() {
  return (
    <div className="compliance">
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

      <aside className="callout callout-info disclaimer" aria-label="Disclaimer">
        <Info size={24} />
        <p>
          <strong>Disclaimer. </strong>
          {c.disclaimer}
        </p>
      </aside>

      <nav className="jump-bar no-print" aria-label="On this page">
        {JUMP_LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`}>
            {l.nav}
          </a>
        ))}
      </nav>

      {c.sections.map((s) => (
        <section key={s.id} id={s.id} className="compliance-section" aria-labelledby={`${s.id}-title`}>
          <h2 id={`${s.id}-title`} className="section-title">
            <Arrow className="arrow-red" size={24} /> {s.title}
          </h2>
          {s.intro && <p className="section-intro">{s.intro}</p>}
          <div className="law-cards">
            {s.cards.map((card) => (
              <Card key={card.title} card={card} />
            ))}
          </div>
        </section>
      ))}

      <section id={priorities.id} className="compliance-section" aria-labelledby="priorities-title">
        <h2 id="priorities-title" className="section-title">
          <Arrow className="arrow-red" size={24} /> {priorities.title}
        </h2>
        <div className="card">
          <p className="section-intro">{priorities.intro}</p>
          <ol className="priority-steps">
            {priorities.steps.map((step, i) => (
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

      <section id={support.id} className="compliance-section" aria-labelledby="support-title">
        <h2 id="support-title" className="section-title">
          <Arrow className="arrow-red" size={24} /> {support.title}
        </h2>
        <dl className="support-grid">
          {support.items.map((item) => (
            <div key={item.requirement} className="card support-item">
              <dt>{item.requirement}</dt>
              <dd>{item.support}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="compliance-footer small muted">{c.footer(formatDate(LAST_UPDATED))}</p>
    </div>
  )
}

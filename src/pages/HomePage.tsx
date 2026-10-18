import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatsBand from '../components/ui/StatsBand'
import { Arrow, Book, Clipboard, MapIcon } from '../components/ui/Icons'
import { getSchools, subscribe, type SchoolView } from '../lib/api'
import { summarise } from '../lib/report'

const MODULES = [
  {
    tone: 'navy',
    Icon: MapIcon,
    title: 'Admin Map',
    text: 'See every school on one map, coloured by how ready it is for devices. Decide who gets a kit next and follow each shipment.',
    note: 'Needs a connection',
    links: [{ to: '/admin', label: 'Open the Admin Map' }],
  },
  {
    tone: 'green',
    Icon: Clipboard,
    title: 'Field Tools',
    text: 'For coordinators at the school: survey a school, scan the QR tag on each device, confirm the delivery and count devices every month.',
    note: 'Works offline',
    links: [{ to: '/field', label: 'Open Field Tools' }],
  },
  {
    tone: 'yellow',
    Icon: Book,
    title: 'Learning',
    text: 'Times Tables lessons and quizzes for students, and a simple class view for teachers. Progress stays on the device; only school totals are shared.',
    note: 'Works offline',
    links: [
      { to: '/learn/student', label: 'Student' },
      { to: '/learn/teacher', label: 'Teacher' },
    ],
  },
] as const

const STEPS = [
  { title: 'Survey', text: 'A coordinator visits the school and answers five questions: power, signal, pupils, teachers and a room that locks.' },
  { title: 'Prioritise', text: 'The answers give a readiness tier (0 to 3) and a need score. The map shows who needs a kit most.' },
  { title: 'Deliver', text: 'The right kit for the tier goes out. The coordinator scans each device; the teacher confirms what arrived.' },
  { title: 'Learn', text: 'Students learn on the devices, even offline. Only school-level totals are sent back, never names.' },
]

export default function HomePage() {
  const [schools, setSchools] = useState<SchoolView[] | null>(null)

  useEffect(() => {
    let live = true
    const load = () => void getSchools().then((s) => live && setSchools(s))
    load()
    const off = subscribe(load)
    return () => {
      live = false
      off()
    }
  }, [])

  const sum = schools ? summarise(schools) : null
  const show = (v: number | string | null | undefined) => (sum === null ? '…' : (v ?? '–'))

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-text">
          <p className="eyebrow">PS43 Foundation · Bridge</p>
          <h1 id="hero-title" className="display hero-title">
            Every school on the map. Every kit accounted for.
          </h1>
          <p className="hero-lead">
            PS43 Bridge helps the foundation find schools in Cameroon, send each one the right kit, and see students
            learning on the devices, even where there is no connection.
          </p>
          <div className="hero-actions">
            <Link to="/admin" className="btn-accent">
              Open the Admin Map <Arrow />
            </Link>
            <Link to="/field" className="btn-on-dark">
              Field Tools
            </Link>
          </div>
          <p className="hero-tagline">
            <Arrow size={18} /> Dream big
          </p>
        </div>
        <svg className="hero-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2 9.5h12V4l9 8-9 8v-5.5H2z" fill="currentColor" />
        </svg>
      </section>

      <section className="home-section" aria-labelledby="impact-title">
        <div className="section-head">
          <p className="eyebrow">Live totals · demo data</p>
          <h2 id="impact-title" className="section-title">
            Our impact so far
          </h2>
        </div>
        <StatsBand
          label="Live totals"
          items={[
            { label: 'Schools Reached', value: show(sum?.kitsDelivered), hint: 'Schools with a kit delivered', tone: 'green' },
            { label: 'Technology Equipped', value: show(sum?.devicesDelivered), hint: 'Devices delivered to schools', tone: 'navy' },
            {
              label: 'Youth Reached',
              value: show(sum && (sum.schoolsWithProgress ? sum.activeLearners : null)),
              hint: 'Students who did a lesson or quiz',
              tone: 'yellow',
            },
            {
              label: 'Mastery Rate',
              value: show(sum && (sum.averageMastery === null ? null : `${sum.averageMastery}%`)),
              hint: 'Learners scoring 80% or more',
              tone: 'green',
            },
          ]}
        />
        {sum && (
          <p className="muted small">
            Out of {sum.schoolsMapped} schools mapped, {sum.assessed} assessed so far. Tip: on the Admin Map, open "Demo
            controls" and press "Simulate 30 days" to fill in learning numbers.
          </p>
        )}
      </section>

      <section className="home-section" aria-labelledby="modules-title">
        <div className="section-head">
          <p className="eyebrow">Three tools, one app</p>
          <h2 id="modules-title" className="section-title">
            Where do you want to start?
          </h2>
        </div>
        <div className="module-cards">
          {MODULES.map(({ tone, Icon, title, text, note, links }) => (
            <article key={title} className={`module-card tone-${tone}`}>
              <div className="module-card-top">
                <Icon size={32} />
                <h3 className="module-title">{title}</h3>
              </div>
              <div className="module-card-body">
                <p>{text}</p>
                <p className="chip">{note}</p>
                <div className="module-links">
                  {links.map((l) => (
                    <Link key={l.to} to={l.to} className="btn-secondary">
                      {l.label} <Arrow className="arrow-red" />
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-two" aria-label="About">
        <div className="card mission">
          <p className="eyebrow">Our mission</p>
          <h2 className="section-title">Empower through education</h2>
          <p>
            The PS43 Foundation works to bring technology and learning to schools in Cameroon. Getting there means knowing
            which schools are ready, sending kits that fit, and checking that every device arrives and gets used.
          </p>
          <p>PS43 Bridge is a prototype of one simple tool for all of that, built to work on a phone and offline.</p>
        </div>

        <div className="card how">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">Four steps</h2>
          <ol className="how-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="how-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}

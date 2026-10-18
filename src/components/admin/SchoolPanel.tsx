import { useMemo } from 'react'
import type { SchoolView } from '../../lib/api'
import { matchPartners } from '../../lib/matching'
import { TIER_LABELS } from '../../lib/scoring'
import type { Kit, Partner } from '../../lib/types'
import { Close } from '../ui/Icons'
import LearningSection from './LearningSection'
import ShipmentSection from './ShipmentSection'
import TierBadge from './TierBadge'
import { TIER_EXPLAINER, TIER_HELP, capitalise } from './tierStyle'

interface Props {
  school: SchoolView | null
  /** Need score with the current priority weights. */
  score: number | null
  kits: Kit[]
  partners: Partner[]
  onClose: () => void
}

export default function SchoolPanel({ school, score, kits, partners, onClose }: Props) {
  const kit = school?.tier == null ? undefined : kits.find((k) => k.tier === school.tier)
  const matches = useMemo(
    () => (school && school.tier !== null ? matchPartners(school.tier, school, partners) : []),
    [school, partners],
  )

  if (!school) {
    return (
      <div className="card panel">
        <p className="label-rule">School details</p>
        <p className="muted">Choose a school on the map or in the priority list to see its survey, kit, shipment and learning.</p>
      </div>
    )
  }

  const { survey } = school

  return (
    <div className="card panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow eyebrow-dark">{school.region} region</p>
          <h2 className="panel-title">{school.name}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close school details">
          <Close />
        </button>
      </div>
      <p className="panel-sub">
        <span className="chip">{capitalise(school.status)}</span> <span className="chip chip-demo">Demo data</span>
      </p>

      <section className="panel-section" aria-label="Readiness">
        <h3 className="label-rule">Readiness</h3>
        {school.tier === null ? (
          <p className="muted">Not assessed yet. A coordinator surveys the school in Field Tools first.</p>
        ) : (
          <>
            <div className="readiness">
              <span className={`tier-big tier-${school.tier}`} aria-hidden="true">
                {school.tier}
              </span>
              <div>
                <strong>{TIER_LABELS[school.tier]}</strong>
                <p className="small">{TIER_HELP[school.tier]}</p>
              </div>
            </div>
            <dl className="facts">
              <dt>Need score</dt>
              <dd>{score === null ? '–' : `${score.toFixed(1)} of 100`}</dd>
            </dl>
            <p className="help">{TIER_EXPLAINER} The need score (0 to 100) is higher for schools that should get a kit sooner.</p>
          </>
        )}
      </section>

      <section className="panel-section" aria-label="Survey">
        <h3 className="label-rule">Survey</h3>
        {survey ? (
          <dl className="facts">
            <dt>Power</dt>
            <dd>{capitalise(survey.power)}</dd>
            <dt>Mobile signal</dt>
            <dd>{survey.signal === 'none' ? 'None' : survey.signal}</dd>
            <dt>Pupils</dt>
            <dd>{survey.pupils}</dd>
            <dt>Teachers</dt>
            <dd>{survey.teachers}</dd>
            <dt>Room that locks</dt>
            <dd>{survey.secureRoom ? 'Yes' : 'No'}</dd>
            <dt>Survey date</dt>
            <dd>{survey.surveyedAt.slice(0, 10)}</dd>
          </dl>
        ) : (
          <p className="muted">No survey yet.</p>
        )}
      </section>

      {kit && (
        <section className="panel-section" aria-label="Recommended kit">
          <h3 className="label-rule">Recommended kit</h3>
          <p className="kit-name">
            <TierBadge tier={school.tier} /> {kit.name}
          </p>
          <ul className="plain-list">
            {kit.items.map((item) => (
              <li key={item.name}>
                {item.qty} × {item.name}
              </li>
            ))}
          </ul>

          <h3 className="label-rule">Matched partners</h3>
          {matches.length === 0 ? (
            <p className="muted">No partner can supply this kit yet.</p>
          ) : (
            <ul className="plain-list partner-list">
              {matches.map(({ partner, km }) => (
                <li key={partner.id}>
                  <strong>{partner.name}</strong>
                  <br />
                  <span className="muted small">
                    {partner.type} · {partner.city} · {Math.round(km)} km away · trust {partner.trustLabel} ({partner.trust}/5)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ShipmentSection school={school} kit={kit} partners={partners} />

      <LearningSection school={school} />
    </div>
  )
}

import { useMemo } from 'react'
import type { SchoolView } from '../../lib/api'
import { matchPartners } from '../../lib/matching'
import { TIER_LABELS } from '../../lib/scoring'
import type { Kit, Partner } from '../../lib/types'
import { capitalise, tierColor } from './tierStyle'

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
        <h2>School details</h2>
        <p className="muted">Click a school on the map or in the priority list.</p>
      </div>
    )
  }

  const { survey, shipment } = school
  const transporter = shipment ? partners.find((p) => p.id === shipment.transporterId) : undefined

  return (
    <div className="card panel">
      <div className="panel-head">
        <h2>{school.name}</h2>
        <button type="button" className="btn-secondary" onClick={onClose} aria-label="Close school details">
          ✕
        </button>
      </div>
      <p className="panel-sub">
        {school.region} region · <span className="pill">{capitalise(school.status)}</span>{' '}
        <span className="pill pill-demo">demo data</span>
      </p>

      <h3>Survey</h3>
      {survey ? (
        <dl className="facts">
          <dt>Power</dt>
          <dd>{survey.power}</dd>
          <dt>Signal</dt>
          <dd>{survey.signal}</dd>
          <dt>Pupils</dt>
          <dd>{survey.pupils}</dd>
          <dt>Teachers</dt>
          <dd>{survey.teachers}</dd>
          <dt>Secure room</dt>
          <dd>{survey.secureRoom ? 'Yes' : 'No'}</dd>
          <dt>Survey date</dt>
          <dd>{survey.surveyedAt}</dd>
        </dl>
      ) : (
        <p className="muted">Not yet assessed</p>
      )}

      <h3>Tier and need</h3>
      {school.tier === null ? (
        <p className="muted">Available after a survey.</p>
      ) : (
        <dl className="facts">
          <dt>Tier</dt>
          <dd>
            <span className="tier-dot" style={{ background: tierColor(school.tier) }} /> {TIER_LABELS[school.tier]}
          </dd>
          <dt>Need score</dt>
          <dd>{score === null ? '–' : `${score.toFixed(1)} of 100`}</dd>
        </dl>
      )}

      {kit && (
        <>
          <h3>Recommended kit</h3>
          <p className="kit-name">{kit.name}</p>
          <ul className="plain-list">
            {kit.items.map((item) => (
              <li key={item.name}>
                {item.qty} × {item.name}
              </li>
            ))}
          </ul>

          <h3>Matched partners</h3>
          {matches.length === 0 ? (
            <p className="muted">No partner can supply this kit yet.</p>
          ) : (
            <ul className="plain-list">
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
        </>
      )}

      <h3>Shipment</h3>
      {shipment ? (
        <dl className="facts">
          <dt>Status</dt>
          <dd>{capitalise(shipment.status)}</dd>
          <dt>Transporter</dt>
          <dd>{transporter?.name ?? shipment.transporterId}</dd>
          <dt>Approved</dt>
          <dd>{shipment.approvedAt}</dd>
          {shipment.shippedAt && (
            <>
              <dt>Shipped</dt>
              <dd>{shipment.shippedAt}</dd>
            </>
          )}
          {shipment.deliveredAt && (
            <>
              <dt>Delivered</dt>
              <dd>{shipment.deliveredAt}</dd>
            </>
          )}
          {shipment.verifiedAt && (
            <>
              <dt>Verified</dt>
              <dd>{shipment.verifiedAt}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="muted">No shipment yet</p>
      )}

      <h3>Learning</h3>
      <p className="muted">No learning data yet</p>
    </div>
  )
}

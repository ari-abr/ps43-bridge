import { useState } from 'react'
import { createShipment, createShipmentForRequest, markInTransit, type SchoolView, type ShipmentView } from '../../lib/api'
import { matchPartners, matchTransporters, topPartner } from '../../lib/matching'
import type { Kit, Partner, ShipmentStatus } from '../../lib/types'
import { useSyncStatus } from '../../lib/useSyncStatus'
import { workingOfTotal } from '../../lib/report'
import { toast, toastSaved } from '../../lib/toast'
import { Arrow, Printer } from '../ui/Icons'
import Steps from '../ui/Steps'

/** "2026-10-05" stays as it is; a full ISO time becomes local date and time. */
export const when = (s: string) =>
  s.length <= 10 ? s : new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

const SHIPMENT_STEPS = ['Approved', 'In transit', 'Delivered', 'Verified']
const STEP_DONE: Record<ShipmentStatus, number> = { approved: 1, 'in transit': 2, delivered: 3, verified: 4 }

interface Props {
  school: SchoolView
  kit: Kit | undefined
  partners: Partner[]
}

export default function ShipmentSection({ school, kit, partners }: Props) {
  const { shipment } = school
  return (
    <>
      <section className="panel-section" aria-label="Shipment">
        <h3 className="label-rule">Shipment</h3>
        {shipment ? (
          <ShipmentDetails shipment={shipment} partners={partners} />
        ) : school.tier !== null && kit ? (
          <ApproveForm key={school.id} school={school} kit={kit} partners={partners} />
        ) : (
          <p className="muted">No shipment yet{school.tier === null ? ' (needs a survey first)' : ''}.</p>
        )}
      </section>

      {shipment && <Confirmations shipment={shipment} />}

      <DevicesSection school={school} />
    </>
  )
}

/** Devices from the latest check-in: "x of y devices working" first. */
function DevicesSection({ school }: { school: SchoolView }) {
  const { checkin } = school
  const delivered = school.status === 'delivered' || school.status === 'verified'
  return (
    <section className="panel-section" aria-label="Devices">
      <h3 className="label-rule">Devices</h3>
      {checkin ? (
        <>
          <p className="big-figure">
            <strong>{workingOfTotal(school)}</strong> devices working
          </p>
          <dl className="facts">
            <dt>Working</dt>
            <dd>{checkin.working}</dd>
            <dt>Broken</dt>
            <dd>{checkin.broken}</dd>
            <dt>Missing</dt>
            <dd>{checkin.missing}</dd>
            <dt>Check-in date</dt>
            <dd>
              {when(checkin.checkedAt)} {checkin.simulated && <span className="chip chip-demo">Simulated demo data</span>}
            </dd>
            {checkin.note && !checkin.simulated && (
              <>
                <dt>Note</dt>
                <dd>{checkin.note}</dd>
              </>
            )}
          </dl>
        </>
      ) : (
        <p className="muted">
          {delivered ? 'No check-in yet. Coordinators count the devices every month in Field Tools.' : 'No devices delivered yet.'}
        </p>
      )}
    </section>
  )
}

interface ApproveProps {
  school: SchoolView
  kit: Kit
  partners: Partner[]
  /** Set when creating the shipment from a request: the request is linked to the new shipment. */
  requestId?: string
  onDone?: () => void
}

export function ApproveForm({ school, kit, partners, requestId, onDone }: ApproveProps) {
  const { online } = useSyncStatus()
  const tier = school.tier!
  const suppliers = matchPartners(tier, school, partners)
  const transporters = matchTransporters(school, partners)
  const [partnerId, setPartnerId] = useState(topPartner(tier, school, partners)?.partner.id ?? suppliers[0]?.partner.id ?? '')
  const [transporterId, setTransporterId] = useState(transporters[0]?.partner.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    try {
      const input = { schoolId: school.id, tier, kit, partnerId, transporterId }
      toastSaved(await (requestId ? createShipmentForRequest(input, requestId) : createShipment(input)), 'Kit approval')
      onDone?.()
    } catch {
      setError('Could not save the shipment (device storage full?).')
      toast('error', 'Could not save the shipment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="approve-form">
      <p className="muted small">
        {kit.name}: {kit.deviceCount} device{kit.deviceCount === 1 ? '' : 's'} will get QR tags. The best-matched
        partners are already chosen.
      </p>
      <label className="stack-label">
        Supplier
        <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
          {suppliers.map(({ partner, km }) => (
            <option key={partner.id} value={partner.id}>
              {partner.name} ({partner.type}, {Math.round(km)} km, trust {partner.trust}/5)
            </option>
          ))}
        </select>
      </label>
      <label className="stack-label">
        Transporter
        <select value={transporterId} onChange={(e) => setTransporterId(e.target.value)}>
          {transporters.map(({ partner, km }) => (
            <option key={partner.id} value={partner.id}>
              {partner.name} ({partner.city}, {Math.round(km)} km, trust {partner.trust}/5)
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn-primary btn-block" onClick={approve} disabled={busy || !online || !partnerId || !transporterId}>
        {busy ? 'Saving…' : 'Approve kit and create shipment'} {!busy && <Arrow />}
      </button>
      {!online && <p className="muted small">Go Online to approve kits.</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

function ShipmentDetails({ shipment, partners }: { shipment: ShipmentView; partners: Partner[] }) {
  const { online } = useSyncStatus()
  const [busy, setBusy] = useState(false)
  const name = (id: string) => partners.find((p) => p.id === id)?.name ?? id
  const { devices } = shipment

  async function ship() {
    setBusy(true)
    try {
      toastSaved(await markInTransit(shipment), 'Shipment update')
    } catch {
      toast('error', 'Could not update the shipment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Steps steps={SHIPMENT_STEPS} done={STEP_DONE[shipment.status]} label="Shipment progress" currentWord="next" />
      <p className="help">
        Delivered = the coordinator scanned the devices and confirmed. Verified = the teacher also confirmed what arrived.
      </p>
      <dl className="facts">
        <dt>Supplier</dt>
        <dd>{name(shipment.partnerId)}</dd>
        <dt>Transporter</dt>
        <dd>{name(shipment.transporterId)}</dd>
        <dt>Approved</dt>
        <dd>{when(shipment.createdAt)}</dd>
        {shipment.inTransitAt && (
          <>
            <dt>In transit</dt>
            <dd>{when(shipment.inTransitAt)}</dd>
          </>
        )}
        <dt>Devices</dt>
        <dd>
          {devices.length === 0
            ? 'None (no devices in this kit)'
            : `${devices.length}: ${devices[0].assetId} to ${devices[devices.length - 1].assetId}`}
        </dd>
      </dl>
      <div className="panel-actions">
        {shipment.status === 'approved' && (
          <button type="button" className="btn-primary" onClick={ship} disabled={busy || !online}>
            {busy ? 'Saving…' : 'Mark in transit'} {!busy && <Arrow />}
          </button>
        )}
        {devices.length > 0 && (
          <a className="btn-secondary" href={`/print/tags/${shipment.id}`} target="_blank" rel="noreferrer">
            <Printer /> Print QR tags
          </a>
        )}
      </div>
      {shipment.status === 'approved' && !online && <p className="muted small">Go Online to update the shipment.</p>}
    </>
  )
}

function Confirmations({ shipment }: { shipment: ShipmentView }) {
  const { coordinator, teacher, devices } = shipment
  return (
    <section className="panel-section" aria-label="Delivery confirmations">
      <h3 className="label-rule">Delivery confirmations</h3>
      <div className="confirm-box">
        <strong>Coordinator</strong>
        {coordinator ? (
          <p className="small">
            <span className="chip chip-ok">Confirmed {when(coordinator.confirmedAt)}</span>
            <br />
            Devices scanned: {coordinator.scannedAssetIds?.length ?? 0} of {devices.length} · Photo taken:{' '}
            {coordinator.photoTaken ? 'yes' : 'no'}
            {coordinator.note && (
              <>
                <br />
                Note: {coordinator.note}
              </>
            )}
          </p>
        ) : (
          <p className="small">
            <span className="chip chip-wait">Waiting for the coordinator</span>
          </p>
        )}
      </div>
      <div className="confirm-box">
        <strong>Teacher</strong>
        {teacher ? (
          <p className="small">
            <span className="chip chip-ok">Confirmed {when(teacher.confirmedAt)}</span>
            <br />
            Devices received: {teacher.devicesReceived ?? 0} of {devices.length}
            {teacher.note && (
              <>
                <br />
                Note: {teacher.note}
              </>
            )}
          </p>
        ) : (
          <p className="small">
            <span className="chip chip-wait">Waiting for the teacher</span>
          </p>
        )}
      </div>
    </section>
  )
}

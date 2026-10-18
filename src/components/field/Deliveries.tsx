import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMyConfirmation, getShipments, schoolName, schoolRegion, subscribe, type ShipmentView } from '../../lib/api'
import { capitalise } from '../admin/tierStyle'
import DeliveryConfirm from './DeliveryConfirm'

/** Shipments on their way (approved or in transit). Open one to scan its devices and confirm delivery. */
export default function Deliveries() {
  const [shipments, setShipments] = useState<ShipmentView[] | null>(null)
  const [region, setRegion] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

  // Each fake-server call takes ~300 ms, so ignore answers that arrive out of order.
  const latestLoad = useRef(0)
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    const result = await getShipments()
    if (id === latestLoad.current) setShipments(result)
  }, [])

  useEffect(() => {
    void load()
    return subscribe(() => void load())
  }, [load])

  const open = shipments?.find((s) => s.id === openId)

  const shown = useMemo(
    () =>
      (shipments ?? [])
        .filter((s) => s.status === 'approved' || s.status === 'in transit')
        .filter((s) => region === 'all' || schoolRegion(s.schoolId) === region)
        .sort((a, b) => schoolName(a.schoolId).localeCompare(schoolName(b.schoolId))),
    [shipments, region],
  )

  if (open) return <DeliveryConfirm key={open.id} shipment={open} onBack={() => setOpenId(null)} />

  return (
    <div className="card">
      <h2 className="section-title">Deliveries</h2>
      <p className="help">Kits on their way. At the school, open one to scan the QR tag on each device and confirm the delivery.</p>
      <div className="picker-filters">
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
          <option value="all">All regions</option>
          {['Littoral', 'West', 'Centre'].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {shipments === null ? (
        <p className="muted">Loading shipments…</p>
      ) : shown.length === 0 ? (
        <p className="muted">No shipments waiting for delivery{region === 'all' ? '' : ` in ${region}`}.</p>
      ) : (
        <ul className="picker-list">
          {shown.map((s) => {
            const mine = getMyConfirmation(s.id, 'coordinator')
            return (
              <li key={s.id}>
                <button type="button" className="picker-row" onClick={() => setOpenId(s.id)}>
                  <span className="picker-main">
                    <span className="picker-name">{schoolName(s.schoolId)}</span>
                    <span className="muted small">
                      {schoolRegion(s.schoolId)} · {s.devices.length} devices · {s.id}
                    </span>
                  </span>
                  <span className="picker-status small">
                    <span className="pill">{capitalise(s.status)}</span>
                    {mine?.state === 'waiting' && <span className="pill pill-demo">confirmed, waiting to upload</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

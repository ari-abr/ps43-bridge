import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  getMyConfirmation,
  getShipments,
  saveRecord,
  subscribe,
  type ConfirmationRecord,
  type ShipmentView,
} from '../../lib/api'
import { confirmationId, latestBySchool } from '../../lib/shipments'
import { capitalise } from '../admin/tierStyle'

/**
 * Teacher: "PS43 kit delivered? Confirm what arrived." Shown while this school's shipment is
 * in transit or delivered and the teacher has not confirmed. Saves the teacher's own
 * confirmation record, so it never overwrites the coordinator's.
 */
export default function DeliveryCard({ schoolId }: { schoolId: string }) {
  const [shipment, setShipment] = useState<ShipmentView | null>(null)

  const latestLoad = useRef(0)
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    const result = latestBySchool(await getShipments()).get(schoolId) ?? null
    if (id === latestLoad.current) setShipment(result)
  }, [schoolId])

  useEffect(() => {
    void load()
    return subscribe(() => void load())
  }, [load])

  if (!shipment) return null
  const mine = getMyConfirmation(shipment.id, 'teacher')

  if (mine || shipment.teacher) {
    const waiting = mine?.state === 'waiting'
    return (
      <div className={`save-result ${waiting ? 'is-queued' : 'is-uploaded'}`} role="status">
        <strong>Thanks, delivery confirmed.</strong>
        <p>
          Shipment status: <span className="pill">{capitalise(shipment.status)}</span>
          {waiting && ' · your confirmation is saved on this device and will upload when Online'}
        </p>
      </div>
    )
  }

  if (shipment.status === 'approved') {
    return (
      <div className="card" role="status">
        <h2>Kit approved</h2>
        <p className="muted">
          A PS43 kit is approved for this school. You can confirm what arrived once the coordinator has delivered it.
        </p>
      </div>
    )
  }
  if (shipment.status !== 'in transit' && shipment.status !== 'delivered') return null
  return <ConfirmForm key={shipment.id} shipment={shipment} />
}

function ConfirmForm({ shipment }: { shipment: ShipmentView }) {
  const count = shipment.devices.length
  const [received, setReceived] = useState(String(count))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = /^\d+$/.test(received.trim()) ? Number(received) : NaN
    if (Number.isNaN(n) || n > count) {
      setError(`Enter a whole number from 0 to ${count}.`)
      return
    }
    setError(null)
    setSaving(true)
    const record: ConfirmationRecord = {
      id: confirmationId(shipment.id, 'teacher'),
      shipmentId: shipment.id,
      party: 'teacher',
      confirmedAt: new Date().toISOString(),
      devicesReceived: n,
      note: note.trim(),
    }
    try {
      await saveRecord('confirmations', record)
    } catch {
      setError('Could not save (device storage full?). Try again.')
      setSaving(false)
    }
  }

  return (
    <form className="card delivery-card" onSubmit={submit} noValidate>
      <h2>PS43 kit delivered? Confirm what arrived.</h2>
      <p className="muted small">
        Shipment {shipment.id} · {capitalise(shipment.status)} · {count} devices sent
      </p>
      {count > 0 && (
        <label className="stack-label">
          Devices received
          <input type="text" inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value)} />
        </label>
      )}
      <label className="stack-label">
        Note (optional)
        <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Confirm delivery'}
      </button>
    </form>
  )
}

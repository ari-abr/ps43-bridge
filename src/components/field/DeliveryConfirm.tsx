import { useState } from 'react'
import {
  getLocal,
  getMyConfirmation,
  saveRecord,
  schoolName,
  setLocal,
  type ConfirmationRecord,
  type ShipmentView,
} from '../../lib/api'
import { assetId, confirmationId } from '../../lib/shipments'
import { capitalise } from '../admin/tierStyle'
import { when } from '../admin/ShipmentSection'
import QrScannerBox from './QrScannerBox'

interface Props {
  shipment: ShipmentView
  onBack: () => void
}

/** Scans in progress are kept on the device, so a reload (or a flat battery) does not lose them. */
interface Draft {
  scanned: string[]
  photoTaken: boolean
  note: string
}

const draftKey = (shipmentId: string) => `field:delivery:${shipmentId}`
const EMPTY: Draft = { scanned: [], photoTaken: false, note: '' }

/** "ps43-0012", " PS43-0012 " and "12" all mean PS43-0012. */
function normaliseTag(text: string): string {
  const t = text.trim().toUpperCase()
  return /^\d{1,4}$/.test(t) ? assetId(Number(t)) : t
}

type Message = { kind: 'ok' | 'warn'; text: string } | null

export default function DeliveryConfirm({ shipment, onBack }: Props) {
  const [draft, setDraftState] = useState<Draft>(() => getLocal(draftKey(shipment.id), EMPTY))
  const [message, setMessage] = useState<Message>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const mine = getMyConfirmation(shipment.id, 'coordinator')
  const confirmed = (mine?.record as ConfirmationRecord | undefined) ?? shipment.coordinator

  const expected = new Set(shipment.devices.map((d) => d.assetId))
  const scanned = new Set(draft.scanned)
  const missing = shipment.devices.filter((d) => !scanned.has(d.assetId))

  function setDraft(next: Draft) {
    setDraftState(next)
    try {
      setLocal(draftKey(shipment.id), next)
    } catch {
      // Storage full: the scans still count for this visit.
    }
  }

  function onCode(text: string) {
    const tag = normaliseTag(text)
    if (draft.scanned.includes(tag)) return // the camera sees the same code many times: ignore repeats
    if (!expected.has(tag)) {
      setMessage({ kind: 'warn', text: `${tag} is not part of this shipment. Check the device and set it aside.` })
      return
    }
    setDraft({ ...draft, scanned: [...draft.scanned, tag] })
    setMessage({ kind: 'ok', text: `${tag} scanned` })
    navigator.vibrate?.(60)
  }

  async function confirm() {
    setSaving(true)
    setFailed(false)
    const record: ConfirmationRecord = {
      id: confirmationId(shipment.id, 'coordinator'),
      shipmentId: shipment.id,
      party: 'coordinator',
      confirmedAt: new Date().toISOString(),
      scannedAssetIds: shipment.devices.map((d) => d.assetId).filter((id) => scanned.has(id)),
      photoTaken: draft.photoTaken,
      note: draft.note.trim(),
    }
    try {
      await saveRecord('confirmations', record)
      setLocal(draftKey(shipment.id), null)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const header = (
    <>
      <button type="button" className="btn-link" onClick={onBack}>
        ← All deliveries
      </button>
      <h2>{schoolName(shipment.schoolId)}</h2>
      <p className="muted small">
        {shipment.id} · <span className="pill">{capitalise(shipment.status)}</span> · {shipment.devices.length} devices
      </p>
    </>
  )

  if (confirmed) {
    const waiting = mine?.state === 'waiting'
    return (
      <div className="card delivery">
        {header}
        <div className={`save-result ${waiting ? 'is-queued' : 'is-uploaded'}`} role="status">
          <strong>
            {waiting ? 'Delivery confirmed on this device, will upload when Online.' : 'Delivery confirmed and uploaded.'}
          </strong>
          <p>
            {when(confirmed.confirmedAt)} · {confirmed.scannedAssetIds?.length ?? 0} of {shipment.devices.length} devices
            scanned · photo taken: {confirmed.photoTaken ? 'yes' : 'no'}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onBack}>
          Back to deliveries
        </button>
      </div>
    )
  }

  return (
    <div className="card delivery">
      {header}

      {shipment.devices.length > 0 && (
        <>
          <div className="scan-progress" role="status">
            <strong>
              {scanned.size} of {shipment.devices.length} scanned
            </strong>
            <progress max={shipment.devices.length} value={scanned.size} />
          </div>

          <QrScannerBox onCode={onCode} />

          {message && (
            <p className={message.kind === 'ok' ? 'scan-ok' : 'form-error'} role="alert">
              {message.kind === 'ok' ? '✓ ' : '⚠ '}
              {message.text}
            </p>
          )}

          <ul className="device-list">
            {shipment.devices.map((d) => (
              <li key={d.assetId} className={scanned.has(d.assetId) ? 'is-done' : ''}>
                <span className={`tick ${scanned.has(d.assetId) ? 'is-done' : ''}`} aria-hidden="true">
                  {scanned.has(d.assetId) ? '✓' : ''}
                </span>
                <span className="device-id">{d.assetId}</span>
                <span className="muted small">{d.type}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.photoTaken}
          onChange={(e) => setDraft({ ...draft, photoTaken: e.target.checked })}
        />
        Photo taken (of the delivered kit; the photo itself stays on your phone)
      </label>

      <label className="stack-label">
        Note (optional)
        <textarea
          rows={2}
          maxLength={300}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </label>

      {missing.length > 0 && (
        <p className="form-error" role="status">
          {missing.length} device{missing.length === 1 ? '' : 's'} not scanned. You can still confirm; the Admin will see
          how many were scanned.
        </p>
      )}
      {failed && <p className="form-error">Could not save (device storage full?). Try again.</p>}

      <button type="button" className="btn-primary" onClick={confirm} disabled={saving}>
        {saving
          ? 'Saving…'
          : missing.length > 0
            ? `Confirm delivery (${missing.length} not scanned)`
            : 'Confirm delivery'}
      </button>
    </div>
  )
}

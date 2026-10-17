import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getShipment, schoolName, type ShipmentView } from '../lib/api'
import { capitalise } from '../components/admin/tierStyle'

/** A QR code as inline SVG (made on the device, works offline). The code holds just the asset id. */
function QrCode({ value }: { value: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    void QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg)
  }, [value])
  return <div className="qr" role="img" aria-label={`QR code ${value}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Print-friendly QR tags for a shipment's devices: one tag per device, laid out for A4. */
export default function TagsPrintPage() {
  const { shipmentId = '' } = useParams()
  const [shipment, setShipment] = useState<ShipmentView | null | undefined>(undefined)

  useEffect(() => {
    void getShipment(shipmentId).then(setShipment)
  }, [shipmentId])

  if (shipment === undefined) return <p className="print-note">Loading…</p>
  if (shipment === null) {
    return (
      <p className="print-note">
        Shipment {shipmentId} was not found on this device. <Link to="/admin">Back to the Admin Map</Link>
      </p>
    )
  }

  const school = schoolName(shipment.schoolId)

  return (
    <div className="print-page">
      <div className="print-toolbar">
        <div>
          <strong>QR tags: {school}</strong>
          <div className="small">
            Shipment {shipment.id} · {shipment.devices.length} devices · stick one tag on each device. Demo data.
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="tag-sheet">
        {shipment.devices.map((d) => (
          <div key={d.assetId} className="tag">
            <QrCode value={d.assetId} />
            <div className="tag-text">
              <div className="tag-id">{d.assetId}</div>
              <div className="tag-school">{school}</div>
              <div className="tag-type">{capitalise(d.type)} · PS43 Bridge</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

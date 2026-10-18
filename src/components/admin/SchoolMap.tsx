import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { SchoolView } from '../../lib/api'
import type { Partner } from '../../lib/types'
import { TIER_LABELS } from '../../lib/scoring'
import { MASTERY_BANDS, TIER_HELP, masteryClass, tierClass, type ColorBy } from './tierStyle'

const CAMEROON_CENTRE: L.LatLngTuple = [5.7, 12.4]

// Partners are navy diamonds, so they cannot be mistaken for the round school markers.
const partnerIcon = L.divIcon({
  className: 'partner-marker',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
})

// School markers are round with the tier number (or mastery rate) inside, so they never rely on colour alone.
// Only a few distinct icons exist, so they are cached: a new icon object would redraw every marker.
const iconCache = new Map<string, L.DivIcon>()

function schoolIcon(text: string, className: string, selected: boolean, openRequests: number): L.DivIcon {
  const key = `${text}|${className}|${selected}|${openRequests}`
  let icon = iconCache.get(key)
  if (!icon) {
    const size = selected ? 38 : 28
    // The badge sits on the corner, so the tier colour and number stay as they are.
    const badge = openRequests > 0 ? `<span class="request-badge">${openRequests}</span>` : ''
    icon = L.divIcon({
      className: 'school-marker',
      html: `<span class="pin ${className}${selected ? ' is-selected' : ''}">${text}</span>${badge}`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      tooltipAnchor: [size / 2, 0],
    })
    iconCache.set(key, icon)
  }
  return icon
}

export interface MapFocus {
  lat: number
  lng: number
  /** Changes on every request, so asking for the same school twice still moves the map. */
  n: number
}

/** Fits the map to `points` whenever `fitKey` changes; flies to `focus` whenever it changes. */
function ViewController({
  points,
  fitKey,
  focus,
}: {
  points: L.LatLngTuple[]
  fitKey: string
  focus: MapFocus | null
}) {
  const map = useMap()

  useEffect(() => {
    // No animation: leaving the page mid-animation (e.g. opening the report) made Leaflet touch a removed map.
    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [24, 24], animate: false })
    // Only refit when fitKey changes, not on every data refresh.
  }, [fitKey, map]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 12), { duration: 0.6 })
  }, [focus, map])

  return null
}

interface Props {
  schools: SchoolView[]
  /** Schools the map zooms to when it fits (all schools of the chosen region). */
  fitSchools: SchoolView[]
  /** Changes when the map should refit (region filter changed, or data first loaded). */
  fitKey: string
  partners: Partner[]
  colorBy: ColorBy
  showPartners: boolean
  selectedId: string | null
  focus: MapFocus | null
  onSelect: (id: string) => void
}

export default function SchoolMap({
  schools,
  fitSchools,
  fitKey,
  partners,
  colorBy,
  showPartners,
  selectedId,
  focus,
  onSelect,
}: Props) {
  // Draw the selected school last so it sits on top.
  const ordered = [...schools].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))
  // Background tiles come from OpenStreetMap: without a connection (and no cached tiles) they fail.
  const [tilesFailed, setTilesFailed] = useState(false)
  useEffect(() => {
    const retry = () => setTilesFailed(false)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])

  return (
    <>
      {tilesFailed && (
        <p className="map-note small" role="status">
          The map background could not load (no connection). Schools are still shown and clickable.
        </p>
      )}
      <MapContainer center={CAMEROON_CENTRE} zoom={6} className="map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        <ViewController points={fitSchools.map((s) => [s.lat, s.lng])} fitKey={fitKey} focus={focus} />

        {ordered.map((s) => {
          const selected = s.id === selectedId
          const rate = s.progress?.masteryRate ?? null
          const icon =
            colorBy === 'learning'
              ? schoolIcon(rate === null ? '–' : String(rate), masteryClass(rate), selected, s.openRequests)
              : schoolIcon(s.tier === null ? '?' : String(s.tier), tierClass(s.tier), selected, s.openRequests)
          const words = `${s.name}, ${s.tier === null ? 'unassessed' : TIER_LABELS[s.tier]}${
            colorBy === 'learning' ? (rate === null ? ', no learning data' : `, ${rate}% mastered`) : ''
          }${s.openRequests > 0 ? `, ${s.openRequests} open request${s.openRequests === 1 ? '' : 's'}` : ''}`
          return (
            // Leaflet sets title and alt only when a marker is created, so a new text means a new marker.
            <Marker
              key={`${s.id}|${words}`}
              position={[s.lat, s.lng]}
              icon={icon}
              title={words}
              alt={words}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(s.id) }}
            >
              <Tooltip>{words}</Tooltip>
            </Marker>
          )
        })}

        {showPartners &&
          partners.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={partnerIcon}>
              <Popup>
                <strong>{p.name}</strong>
                <br />
                {p.type} · {p.city}
                <br />
                Trust: {p.trustLabel} ({p.trust} of 5)
                <br />
                <em>demo data</em>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </>
  )
}

interface LegendProps {
  colorBy: ColorBy
  onColorBy: (v: ColorBy) => void
  showPartners: boolean
  onTogglePartners: (v: boolean) => void
}

export function MapLegend({ colorBy, onColorBy, showPartners, onTogglePartners }: LegendProps) {
  const tierItems = [
    ...([0, 1, 2, 3] as const).map((t) => ({
      key: String(t),
      pin: String(t),
      className: tierClass(t),
      label: TIER_LABELS[t],
      help: TIER_HELP[t],
    })),
    { key: 'none', pin: '?', className: tierClass(null), label: 'Unassessed (grey)', help: 'No survey yet.' },
  ]
  const learningItems = [
    ...MASTERY_BANDS.map((b, i) => ({
      key: b.className,
      pin: ['35', '65', '90'][i],
      className: b.className,
      label: `${b.label} (${['red', 'yellow', 'green'][i]})`,
      help: 'Share of active learners scoring 80% or more on the quiz.',
    })),
    { key: 'none', pin: '–', className: 'band-none', label: 'No learning data (grey)', help: 'No school totals received yet.' },
  ]
  const items = colorBy === 'learning' ? learningItems : tierItems

  return (
    <div className="legend">
      <div className="legend-controls">
        <label className="field-inline">
          <span>Colour by</span>
          <select value={colorBy} onChange={(e) => onColorBy(e.target.value as ColorBy)}>
            <option value="tier">Readiness tier</option>
            <option value="learning">Learning (mastery rate)</option>
          </select>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={showPartners} onChange={(e) => onTogglePartners(e.target.checked)} /> Show
          partners
        </label>
      </div>
      <p className="legend-intro small">
        {colorBy === 'learning'
          ? 'The number in each circle is the mastery rate in percent.'
          : 'The number in each circle is the readiness tier: how ready the school is for devices.'}
      </p>
      <ul className="legend-items" aria-label="Map legend">
        {items.map((i) => (
          <li key={i.key}>
            <span className={`pin pin-sample ${i.className}`} aria-hidden="true">
              {i.pin}
            </span>
            <span>
              <strong>{i.label}</strong>
              <span className="legend-help">{i.help}</span>
            </span>
          </li>
        ))}
        <li>
          <span className="pin-sample-wrap" aria-hidden="true">
            <span className="pin pin-sample tier-none" />
            <span className="request-badge">2</span>
          </span>
          <span>
            <strong>Open requests (red badge)</strong>
            <span className="legend-help">Requests waiting for a decision. Open the school to see them.</span>
          </span>
        </li>
        {showPartners && (
          <li>
            <span className="partner-swatch" aria-hidden="true" />
            <span>
              <strong>Partner (navy diamond)</strong>
              <span className="legend-help">Supplier or transporter. Click one for details.</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}

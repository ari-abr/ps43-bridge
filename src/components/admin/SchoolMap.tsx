import { useEffect, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { SchoolView } from '../../lib/api'
import type { Partner } from '../../lib/types'
import { TIER_LABELS } from '../../lib/scoring'
import { MASTERY_BANDS, TIER_COLORS, UNASSESSED_COLOR, masteryColor, tierColor, type ColorBy } from './tierStyle'

const CAMEROON_CENTRE: L.LatLngTuple = [5.7, 12.4]

// Partners are diamonds, so they cannot be mistaken for the round school markers.
const partnerIcon = L.divIcon({
  className: 'partner-marker',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
})

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
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={selected ? 11 : 7}
              pathOptions={{
                color: selected ? '#111' : '#fff',
                weight: selected ? 3 : 1.5,
                fillColor: colorBy === 'learning' ? masteryColor(s.progress?.masteryRate ?? null) : tierColor(s.tier),
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => onSelect(s.id) }}
            >
              <Tooltip>
                {s.name} · {s.tier === null ? 'Unassessed' : TIER_LABELS[s.tier]}
                {colorBy === 'learning' && s.progress?.masteryRate != null && ` · mastery ${s.progress.masteryRate}%`}
              </Tooltip>
            </CircleMarker>
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
    { label: 'Unassessed', color: UNASSESSED_COLOR },
    ...([0, 1, 2, 3] as const).map((t) => ({ label: TIER_LABELS[t], color: TIER_COLORS[t] })),
  ]
  const learningItems = [{ label: 'No learning data', color: UNASSESSED_COLOR }, ...MASTERY_BANDS]
  const items = colorBy === 'learning' ? learningItems : tierItems
  return (
    <div className="legend">
      <label className="field-inline legend-colorby">
        <span>Colour by</span>
        <select value={colorBy} onChange={(e) => onColorBy(e.target.value as ColorBy)}>
          <option value="tier">Readiness tier</option>
          <option value="learning">Learning (mastery rate)</option>
        </select>
      </label>
      <ul className="legend-items" aria-label="Map legend">
        {items.map((i) => (
          <li key={i.label}>
            <span className="tier-dot" style={{ background: i.color }} /> {i.label}
          </li>
        ))}
        {showPartners && (
          <li>
            <span className="partner-swatch" /> Partner
          </li>
        )}
      </ul>
      <label className="legend-toggle">
        <input type="checkbox" checked={showPartners} onChange={(e) => onTogglePartners(e.target.checked)} /> Show
        partners
      </label>
    </div>
  )
}

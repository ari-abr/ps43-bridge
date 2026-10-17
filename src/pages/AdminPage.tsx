import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LearningContent from '../components/admin/LearningContent'
import Filters, { NO_FILTERS, type FilterState } from '../components/admin/Filters'
import PriorityList, { type RankedSchool } from '../components/admin/PriorityList'
import PrioritySettings from '../components/admin/PrioritySettings'
import SchoolMap, { MapLegend, type MapFocus } from '../components/admin/SchoolMap'
import SchoolPanel from '../components/admin/SchoolPanel'
import type { ColorBy } from '../components/admin/tierStyle'
import SummaryBar from '../components/admin/SummaryBar'
import { KEY_PREFIX, getKits, getPartners, getSchools, subscribe, type SchoolView } from '../lib/api'
import { DEFAULT_WEIGHTS, needScore, type NeedWeights } from '../lib/scoring'
import type { Kit, Partner } from '../lib/types'

const WEIGHTS_KEY = KEY_PREFIX + 'admin:weights'

function loadWeights(): NeedWeights {
  try {
    const saved = JSON.parse(localStorage.getItem(WEIGHTS_KEY) ?? 'null')
    const ok = (n: unknown) => typeof n === 'number' && n >= 0 && n <= 1
    if (saved && ok(saved.pupilsPerDevice) && ok(saved.readiness) && ok(saved.distance)) return saved
  } catch {
    // Unreadable or blocked storage: use the defaults.
  }
  return DEFAULT_WEIGHTS
}

function matchesFilters(s: SchoolView, f: FilterState): boolean {
  if (f.region !== 'all' && s.region !== f.region) return false
  if (f.status !== 'all' && s.status !== f.status) return false
  if (f.tier === 'unassessed') return s.tier === null
  if (f.tier !== 'all') return s.tier === Number(f.tier)
  return true
}

export default function AdminPage() {
  const [schools, setSchools] = useState<SchoolView[] | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [kits, setKits] = useState<Kit[]>([])
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS)
  const [showPartners, setShowPartners] = useState(false)
  const [colorBy, setColorBy] = useState<ColorBy>('tier')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [weights, setWeights] = useState<NeedWeights>(loadWeights)
  const panelRef = useRef<HTMLDivElement>(null)

  // Load, and reload whenever api.ts reports a change (this window or another).
  // Each fake-server call takes ~300 ms, so ignore answers that arrive out of order.
  const latestLoad = useRef(0)
  const load = useCallback(async () => {
    const id = ++latestLoad.current
    const result = await getSchools()
    if (id === latestLoad.current) setSchools(result)
  }, [])

  useEffect(() => {
    void load()
    void getPartners().then(setPartners)
    void getKits().then(setKits)
    return subscribe(() => void load())
  }, [load])

  function changeWeights(next: NeedWeights) {
    setWeights(next)
    try {
      localStorage.setItem(WEIGHTS_KEY, JSON.stringify(next))
    } catch {
      // Storage full or blocked: the sliders still work for this visit.
    }
  }

  const scoreOf = useCallback((s: SchoolView) => (s.need ? needScore(s.need, weights) : null), [weights])

  const shown = useMemo(() => (schools ?? []).filter((s) => matchesFilters(s, filters)), [schools, filters])

  const ranked = useMemo<RankedSchool[]>(
    () =>
      shown
        .flatMap((school) => {
          const score = scoreOf(school)
          return score === null ? [] : [{ school, score }]
        })
        .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name)),
    [shown, scoreOf],
  )

  // A school that the filters hide is no longer selected.
  const selected = shown.find((s) => s.id === selectedId) ?? null

  const fitSchools = useMemo(
    () => (schools ?? []).filter((s) => filters.region === 'all' || s.region === filters.region),
    [schools, filters.region],
  )

  function showPanelOnPhone() {
    if (window.matchMedia('(max-width: 899px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  function selectFromMap(id: string) {
    setSelectedId(id)
    showPanelOnPhone()
  }

  function selectFromList(id: string) {
    const school = shown.find((s) => s.id === id)
    setSelectedId(id)
    if (school) setFocus({ lat: school.lat, lng: school.lng, n: Date.now() })
    showPanelOnPhone()
  }

  return (
    <div className="admin">
      <div className="admin-title">
        <h1>Admin Map</h1>
        <Link className="btn-secondary btn-as-link" to={`/admin/report${filters.region === 'all' ? '' : `?region=${filters.region}`}`}>
          Donor report{filters.region === 'all' ? '' : ` (${filters.region})`}
        </Link>
      </div>

      <SummaryBar schools={shown} />
      <Filters value={filters} onChange={setFilters} />

      <div className="admin-grid">
        <div className="admin-map card">
          {schools === null && <p className="muted loading">Loading schools…</p>}
          <SchoolMap
            schools={shown}
            fitSchools={fitSchools}
            fitKey={`${filters.region}|${schools === null ? 'loading' : 'ready'}`}
            partners={partners}
            colorBy={colorBy}
            showPartners={showPartners}
            selectedId={selected?.id ?? null}
            focus={focus}
            onSelect={selectFromMap}
          />
          <MapLegend
            colorBy={colorBy}
            onColorBy={setColorBy}
            showPartners={showPartners}
            onTogglePartners={setShowPartners}
          />
        </div>

        <div className="admin-panel" ref={panelRef}>
          <SchoolPanel
            school={selected}
            score={selected ? scoreOf(selected) : null}
            kits={kits}
            partners={partners}
            onClose={() => setSelectedId(null)}
          />
        </div>

        <div className="admin-list card">
          <h2>Priority list</h2>
          <p className="muted small">Assessed schools, highest need first.</p>
          <PrioritySettings weights={weights} onChange={changeWeights} />
          <PriorityList ranked={ranked} selectedId={selected?.id ?? null} onSelect={selectFromList} />
        </div>
      </div>

      <LearningContent />
    </div>
  )
}

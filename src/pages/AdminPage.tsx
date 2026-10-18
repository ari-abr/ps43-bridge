import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AttentionPanel from '../components/admin/AttentionPanel'
import DemoControls from '../components/admin/DemoControls'
import Filters, { NO_FILTERS, type FilterState } from '../components/admin/Filters'
import PriorityList from '../components/admin/PriorityList'
import PrioritySettings, { loadWeights, saveWeights } from '../components/admin/PrioritySettings'
import RequestList from '../components/admin/RequestList'
import ResourcesCard from '../components/admin/ResourcesCard'
import SchoolMap, { MapLegend, type MapFocus } from '../components/admin/SchoolMap'
import SchoolPanel from '../components/admin/SchoolPanel'
import SchoolSearch from '../components/admin/SchoolSearch'
import type { ColorBy } from '../components/admin/tierStyle'
import SummaryBar from '../components/admin/SummaryBar'
import PageHeader from '../components/ui/PageHeader'
import { getKits, getPartners, getSchools, subscribe, type SchoolView } from '../lib/api'
import { getAttentionItems } from '../lib/attention'
import { isNextToEquip, rankByNeed } from '../lib/resourceGaps'
import type { NeedWeights } from '../lib/scoring'
import type { Kit, Partner } from '../lib/types'

type ListTab = 'priority' | 'requests'
const LIST_TABS: { id: ListTab; label: string }[] = [
  { id: 'priority', label: 'Priority list' },
  { id: 'requests', label: 'Requests' },
]

function matchesFilters(s: SchoolView, f: FilterState): boolean {
  if (f.region !== 'all' && s.region !== f.region) return false
  if (f.status === 'open requests') {
    if (s.openRequests === 0) return false
  } else if (f.status !== 'all' && s.status !== f.status) return false
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
  const [listTab, setListTab] = useState<ListTab>('priority')
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
    saveWeights(next)
  }

  const shown = useMemo(() => (schools ?? []).filter((s) => matchesFilters(s, filters)), [schools, filters])

  const ranked = useMemo(() => rankByNeed(shown, weights), [shown, weights])
  // Assessed schools with no kit yet come first; the rest already have one on the way or delivered.
  const nextToEquip = useMemo(() => ranked.filter((r) => isNextToEquip(r.school)), [ranked])
  const inProgress = useMemo(() => ranked.filter((r) => !isNextToEquip(r.school)), [ranked])

  // There is no demo clock: "Simulate 30 days" writes check-ins dated now, so the real time is "now".
  // Recomputed only when the schools reload (every data change) or the filters change.
  const attention = useMemo(() => getAttentionItems(shown, Date.now()), [shown])

  const openRequests = shown.reduce((n, s) => n + s.openRequests, 0)

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

  /** Search can find any school: relax just the filters that hide it, then select it like a marker click. */
  function selectFromSearch(id: string): string | null {
    const school = schools?.find((s) => s.id === id)
    if (!school) return null
    const relaxed: FilterState = {
      region: filters.region !== 'all' && school.region !== filters.region ? 'all' : filters.region,
      tier: matchesFilters(school, { ...NO_FILTERS, tier: filters.tier }) ? filters.tier : 'all',
      status: matchesFilters(school, { ...NO_FILTERS, status: filters.status }) ? filters.status : 'all',
    }
    const cleared = (Object.keys(relaxed) as (keyof FilterState)[]).filter((k) => relaxed[k] !== filters[k])
    if (cleared.length > 0) setFilters(relaxed)
    setSelectedId(id)
    setFocus({ lat: school.lat, lng: school.lng, n: Date.now() })
    showPanelOnPhone()
    if (cleared.length === 0) return null
    const set = (Object.keys(filters) as (keyof FilterState)[]).filter((k) => filters[k] !== 'all')
    if (cleared.length === set.length) return 'Filters cleared to show this school.'
    const names = cleared.map((k) => ({ region: 'Region', tier: 'Tier', status: 'Status' })[k])
    return `${names.join(' and ')} filter cleared to show this school.`
  }

  const filtered = filters.region !== 'all' || filters.tier !== 'all' || filters.status !== 'all'

  return (
    <div className="admin">
      <PageHeader
        tone="navy"
        eyebrow="PS43 Bridge · Admin"
        title="Admin Map"
        intro="See every school, decide who gets a kit next, and follow each shipment until students are learning."
        actions={
          <Link className="btn-on-dark" to={`/admin/report${filters.region === 'all' ? '' : `?region=${filters.region}`}`}>
            Donor report{filters.region === 'all' ? '' : ` (${filters.region})`}
          </Link>
        }
      />

      <SummaryBar schools={shown} />

      <DemoControls />

      <Filters value={filters} onChange={setFilters} />
      {schools !== null && shown.length === 0 && (
        <p className="muted" role="status">
          No schools match these filters.{' '}
          <button type="button" className="btn-link" onClick={() => setFilters(NO_FILTERS)}>
            Clear filters
          </button>
        </p>
      )}

      <div className="admin-grid">
        <div className="admin-map card" role="region" aria-label="Map of schools">
          <SchoolSearch schools={schools} onChoose={selectFromSearch} />
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
            weights={weights}
            kits={kits}
            partners={partners}
            onClose={() => setSelectedId(null)}
          />
        </div>

        <AttentionPanel loading={schools === null} items={attention} selectedId={selected?.id ?? null} onSelect={selectFromList} />

        <div className="admin-list card">
          <div className="tabs tabs-compact" role="tablist" aria-label="Lists">
            {LIST_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`list-tab-${id}`}
                aria-selected={listTab === id}
                aria-controls="list-tabpanel"
                className={`tab ${listTab === id ? 'is-active' : ''}`}
                onClick={() => setListTab(id)}
              >
                {label}
                {id === 'requests' && openRequests > 0 && ` (${openRequests})`}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="list-tabpanel" aria-labelledby={`list-tab-${listTab}`}>
            {listTab === 'priority' ? (
              <>
                <h2 className="section-title">Priority list</h2>
                <p className="help">Assessed schools without a kit, highest need score first. The top schools should get a kit soonest.</p>
                <PrioritySettings weights={weights} onChange={changeWeights} />
                <PriorityList
                  loading={schools === null}
                  next={nextToEquip}
                  inProgress={inProgress}
                  selectedId={selected?.id ?? null}
                  onSelect={selectFromList}
                />
              </>
            ) : (
              <>
                <h2 className="section-title">Open requests</h2>
                <p className="help">Waiting for a decision, Urgent first, then oldest first. Choose one to open the school.</p>
                <RequestList loading={schools === null} schools={shown} selectedId={selected?.id ?? null} onSelect={selectFromList} />
              </>
            )}
          </div>
        </div>

        <ResourcesCard next={nextToEquip} loading={schools === null} partners={partners} filtered={filtered} />
      </div>
    </div>
  )
}

import { TIER_LABELS } from '../../lib/scoring'
import type { Region, SchoolStatus } from '../../lib/types'
import { STATUSES, capitalise } from './tierStyle'

export interface FilterState {
  region: Region | 'all'
  tier: 'all' | 'unassessed' | '0' | '1' | '2' | '3'
  status: SchoolStatus | 'all' | 'open requests'
}

export const NO_FILTERS: FilterState = { region: 'all', tier: 'all', status: 'all' }

const REGIONS: Region[] = ['Littoral', 'West', 'Centre']

interface Props {
  value: FilterState
  onChange: (next: FilterState) => void
}

export default function Filters({ value, onChange }: Props) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) => onChange({ ...value, [key]: v })

  return (
    <div className="filters">
      <label className="field-inline">
        <span>Region</span>
        <select value={value.region} onChange={(e) => set('region', e.target.value as FilterState['region'])}>
          <option value="all">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="field-inline">
        <span>Tier</span>
        <select value={value.tier} onChange={(e) => set('tier', e.target.value as FilterState['tier'])}>
          <option value="all">All tiers</option>
          <option value="unassessed">Unassessed</option>
          {([0, 1, 2, 3] as const).map((t) => (
            <option key={t} value={String(t)}>
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="field-inline">
        <span>Status</span>
        <select value={value.status} onChange={(e) => set('status', e.target.value as FilterState['status'])}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {capitalise(s)}
            </option>
          ))}
          <option value="open requests">Has open requests</option>
        </select>
      </label>

      <button type="button" className="btn-link" onClick={() => onChange(NO_FILTERS)}>
        Clear filters
      </button>
    </div>
  )
}

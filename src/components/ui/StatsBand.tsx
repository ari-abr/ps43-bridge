import type { ReactNode } from 'react'
import type { Tone } from './PageHeader'

export interface Stat {
  label: string
  value: ReactNode
  /** Plain-language explanation shown under the label. */
  hint?: string
  tone?: Tone
}

const CYCLE: Tone[] = ['green', 'navy', 'yellow']

/** Big-number stats on solid brand colour blocks, like the website's "Youth Reached" band. */
export default function StatsBand({ items, label }: { items: Stat[]; label: string }) {
  return (
    <div className="stats-band" role="group" aria-label={label}>
      {items.map((s, i) => (
        <div key={s.label} className={`stat tone-${s.tone ?? CYCLE[i % CYCLE.length]}`}>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
          {s.hint && <div className="stat-hint">{s.hint}</div>}
        </div>
      ))}
    </div>
  )
}

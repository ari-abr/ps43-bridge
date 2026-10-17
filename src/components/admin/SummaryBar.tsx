import type { SchoolView } from '../../lib/api'

export default function SummaryBar({ schools }: { schools: SchoolView[] }) {
  const assessed = schools.filter((s) => s.status !== 'unassessed').length
  const approved = schools.filter((s) => s.shipment !== null).length
  const done = schools.filter((s) => s.status === 'delivered' || s.status === 'verified').length

  const items: { label: string; value: string | number; hint?: string }[] = [
    { label: 'Schools shown', value: schools.length },
    { label: 'Assessed', value: assessed, hint: 'Has a survey' },
    { label: 'Kits approved', value: approved, hint: 'Approved, or already further along' },
    { label: 'Delivered / verified', value: done },
    { label: 'Active learners', value: '–', hint: 'Coming later' },
  ]

  return (
    <div className="summary" role="group" aria-label="Summary">
      {items.map((i) => (
        <div key={i.label} className="summary-item" title={i.hint}>
          <div className="summary-value">{i.value}</div>
          <div className="summary-label">{i.label}</div>
        </div>
      ))}
    </div>
  )
}

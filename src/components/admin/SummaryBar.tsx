import type { SchoolView } from '../../lib/api'
import { summarise } from '../../lib/report'

export default function SummaryBar({ schools }: { schools: SchoolView[] }) {
  const sum = summarise(schools)
  const allocated = schools.filter((s) => s.shipment !== null).length
  const noLearning = sum.schoolsWithProgress === 0
  const plural = sum.schoolsWithProgress === 1 ? '' : 's'

  const items: { label: string; value: string | number; hint?: string }[] = [
    { label: 'Schools shown', value: schools.length },
    { label: 'Assessed', value: sum.assessed, hint: 'Has a survey' },
    { label: 'Kits allocated', value: allocated, hint: 'Schools with a kit approved, in transit, delivered or verified.' },
    { label: 'Delivered / verified', value: sum.kitsDelivered },
    {
      label: 'Active learners',
      value: noLearning ? '–' : sum.activeLearners,
      hint: noLearning
        ? 'No school has sent learning totals yet.'
        : `Students with a lesson or quiz attempt, from ${sum.schoolsWithProgress} school${plural}.`,
    },
    {
      label: 'Devices working',
      value: sum.devicesWorkingPct === null ? '–' : `${sum.devicesWorkingPct}%`,
      hint:
        sum.devicesWorkingPct === null
          ? 'No check-ins yet.'
          : `${sum.devicesWorking} of ${sum.devicesChecked} devices, from the latest check-in of each school that has one.`,
    },
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

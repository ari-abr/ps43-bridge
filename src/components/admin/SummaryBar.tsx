import type { SchoolView } from '../../lib/api'
import { summarise } from '../../lib/report'
import StatsBand from '../ui/StatsBand'

export default function SummaryBar({ schools }: { schools: SchoolView[] }) {
  const sum = summarise(schools)
  const allocated = schools.filter((s) => s.shipment !== null).length
  const noLearning = sum.schoolsWithProgress === 0
  const plural = sum.schoolsWithProgress === 1 ? '' : 's'

  return (
    <StatsBand
      label="Summary of the schools shown"
      items={[
        { label: 'Schools Shown', value: schools.length, hint: 'Matching the filters', tone: 'navy' },
        { label: 'Schools Assessed', value: sum.assessed, hint: 'Have a survey and a tier', tone: 'green' },
        { label: 'Kits Allocated', value: allocated, hint: 'Approved, on the way or delivered', tone: 'yellow' },
        { label: 'Schools Reached', value: sum.kitsDelivered, hint: 'Kit delivered or verified', tone: 'navy' },
        {
          label: 'Youth Reached',
          value: noLearning ? '–' : sum.activeLearners,
          hint: noLearning ? 'No learning totals yet' : `Active students, ${sum.schoolsWithProgress} school${plural}`,
          tone: 'green',
        },
        {
          label: 'Technology Working',
          value: sum.devicesWorkingPct === null ? '–' : `${sum.devicesWorkingPct}%`,
          hint:
            sum.devicesWorkingPct === null
              ? 'No device check-ins yet'
              : `${sum.devicesWorking} of ${sum.devicesChecked} devices, latest check-ins`,
          tone: 'yellow',
        },
      ]}
    />
  )
}

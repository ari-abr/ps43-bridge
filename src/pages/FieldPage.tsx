import { useState } from 'react'
import Checkins from '../components/field/Checkins'
import Deliveries from '../components/field/Deliveries'
import RecentSurveys from '../components/field/RecentSurveys'
import SchoolPicker from '../components/field/SchoolPicker'
import SurveyForm from '../components/field/SurveyForm'
import type { SchoolView } from '../lib/api'

type Tab = 'survey' | 'deliveries' | 'checkins'

const TABS: { id: Tab; label: string }[] = [
  { id: 'survey', label: 'Survey' },
  { id: 'deliveries', label: 'Deliveries' },
  { id: 'checkins', label: 'Check-ins' },
]

export default function FieldPage() {
  const [tab, setTab] = useState<Tab>('survey')
  const [school, setSchool] = useState<SchoolView | null>(null)

  return (
    <div className="field">
      <h1>Field Tools</h1>

      <div className="tabs" role="tablist" aria-label="Field Tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="tabpanel"
            className={`tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tabpanel" role="tabpanel" id="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'survey' &&
          (school ? (
            <SurveyForm key={school.id} school={school} onDone={() => setSchool(null)} />
          ) : (
            <>
              <SchoolPicker onSelect={setSchool} />
              <RecentSurveys />
            </>
          ))}

        {tab === 'deliveries' && <Deliveries />}
        {tab === 'checkins' && <Checkins />}
      </div>
    </div>
  )
}

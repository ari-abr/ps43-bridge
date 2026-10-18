import { useState } from 'react'
import Checkins from '../components/field/Checkins'
import Deliveries from '../components/field/Deliveries'
import RecentSurveys from '../components/field/RecentSurveys'
import SchoolPicker from '../components/field/SchoolPicker'
import SurveyForm, { SURVEY_STEPS } from '../components/field/SurveyForm'
import { Clipboard, Laptop, Truck } from '../components/ui/Icons'
import PageHeader from '../components/ui/PageHeader'
import Steps from '../components/ui/Steps'
import type { SchoolView } from '../lib/api'

type Tab = 'survey' | 'deliveries' | 'checkins'

const TABS = [
  { id: 'survey', label: 'Survey', Icon: Clipboard },
  { id: 'deliveries', label: 'Deliveries', Icon: Truck },
  { id: 'checkins', label: 'Check-ins', Icon: Laptop },
] as const

export default function FieldPage() {
  const [tab, setTab] = useState<Tab>('survey')
  const [school, setSchool] = useState<SchoolView | null>(null)

  return (
    <div className="field">
      <PageHeader
        tone="green"
        eyebrow="PS43 Bridge · Field Tools"
        title="Field Tools"
        intro="Survey schools, confirm deliveries and count devices. Works offline: what you save waits on this phone until you are Online."
      />

      <div className="tabs" role="tablist" aria-label="Field Tools">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="tabpanel"
            className={`tab ${tab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>

      <div className="tabpanel" role="tabpanel" id="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'survey' &&
          (school ? (
            <SurveyForm key={school.id} school={school} onDone={() => setSchool(null)} />
          ) : (
            <>
              <Steps steps={SURVEY_STEPS} done={0} label="Survey steps" />
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

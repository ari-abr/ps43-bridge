import { useState, type FormEvent } from 'react'
import { newId, saveRecord, type SchoolView, type SurveyRecord } from '../../lib/api'
import { POWER_OPTIONS, SIGNAL_OPTIONS, TIER_LABELS, tierFromSurvey, type Power, type Signal } from '../../lib/scoring'
import { capitalise, tierColor } from '../admin/tierStyle'

interface Props {
  school: SchoolView
  onDone: () => void
}

interface Answers {
  power: Power | ''
  signal: Signal | ''
  pupils: string
  teachers: string
  secureRoom: 'yes' | 'no' | ''
}

type Errors = Partial<Record<keyof Answers, string>>

const BLANK: Answers = { power: '', signal: '', pupils: '', teachers: '', secureRoom: '' }

/** "Fill sample answers" cycles through these, so the demo shows different tiers. */
const SAMPLES: Answers[] = [
  { power: 'reliable grid', signal: '4G', pupils: '320', teachers: '9', secureRoom: 'yes' },
  { power: 'solar possible', signal: '2G', pupils: '185', teachers: '5', secureRoom: 'yes' },
  { power: 'unreliable grid', signal: '3G', pupils: '540', teachers: '14', secureRoom: 'no' },
]

const MAX_COUNT = 9999

function countError(value: string, what: string): string | undefined {
  const v = value.trim()
  if (!v) return `Enter the number of ${what}.`
  if (!/^\d+$/.test(v)) return `Use a whole number (no letters, signs or decimals).`
  const n = Number(v)
  if (n < 1) return `The number of ${what} must be at least 1.`
  if (n > MAX_COUNT) return `That looks too high (max ${MAX_COUNT}).`
  return undefined
}

function validate(a: Answers): Errors {
  const errors: Errors = {}
  if (!a.power) errors.power = 'Choose the power situation.'
  if (!a.signal) errors.signal = 'Choose the mobile signal.'
  const pupils = countError(a.pupils, 'pupils')
  if (pupils) errors.pupils = pupils
  const teachers = countError(a.teachers, 'teachers')
  if (teachers) errors.teachers = teachers
  if (!a.secureRoom) errors.secureRoom = 'Say whether there is a room that can be locked.'
  return errors
}

type SaveState = 'editing' | 'saving' | 'queued' | 'uploaded' | 'failed'

export default function SurveyForm({ school, onDone }: Props) {
  const [answers, setAnswers] = useState<Answers>(BLANK)
  const [errors, setErrors] = useState<Errors>({})
  const [sample, setSample] = useState(0)
  const [state, setState] = useState<SaveState>('editing')

  const tier = answers.power && answers.signal ? tierFromSurvey(answers.power, answers.signal) : null

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }))
    // Clear a field's message as soon as it is fixed.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  function fillSample() {
    setAnswers(SAMPLES[sample % SAMPLES.length])
    setSample((n) => n + 1)
    setErrors({})
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const found = validate(answers)
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    const record: SurveyRecord = {
      id: newId('sv'),
      schoolId: school.id,
      power: answers.power as Power,
      signal: answers.signal as Signal,
      pupils: Number(answers.pupils),
      teachers: Number(answers.teachers),
      secureRoom: answers.secureRoom === 'yes',
      surveyedAt: new Date().toISOString(),
    }
    setState('saving')
    try {
      setState(await saveRecord('surveys', record))
    } catch {
      setState('failed') // e.g. device storage full
    }
  }

  const head = (
    <div className="panel-head">
      <div>
        <h2>{school.name}</h2>
        <p className="panel-sub muted">
          {school.region} ·{' '}
          {school.survey && school.tier !== null
            ? `Last survey ${school.survey.surveyedAt.slice(0, 10)}, Tier ${school.tier}`
            : 'Not surveyed yet'}
        </p>
      </div>
      <button type="button" onClick={onDone}>
        Back
      </button>
    </div>
  )

  if (state === 'queued' || state === 'uploaded') {
    return (
      <div className="card">
        {head}
        <div className={`save-result ${state === 'queued' ? 'is-queued' : 'is-uploaded'}`} role="status">
          {state === 'queued' ? (
            <>
              <strong>Saved on this device, will upload when online.</strong>
              <p className="small">It is in the upload queue. Switch to Online to send it.</p>
            </>
          ) : (
            <>
              <strong>Uploaded.</strong>
              <p className="small">The Admin Map now shows this school as Tier {tier}.</p>
            </>
          )}
        </div>
        <button type="button" className="btn-primary" onClick={onDone}>
          Survey another school
        </button>
      </div>
    )
  }

  return (
    <form className="card survey-form" onSubmit={save} noValidate>
      {head}

      <button type="button" className="btn-link" onClick={fillSample}>
        Fill sample answers
      </button>

      <Choice
        label="Power"
        name="power"
        options={POWER_OPTIONS}
        value={answers.power}
        error={errors.power}
        onChange={(v) => set('power', v)}
      />
      <Choice
        label="Mobile signal"
        name="signal"
        options={SIGNAL_OPTIONS}
        value={answers.signal}
        error={errors.signal}
        onChange={(v) => set('signal', v)}
      />

      <div className="count-row">
        <Count label="Pupils" value={answers.pupils} error={errors.pupils} onChange={(v) => set('pupils', v)} />
        <Count label="Teachers" value={answers.teachers} error={errors.teachers} onChange={(v) => set('teachers', v)} />
      </div>

      <Choice
        label="Secure room (can be locked)"
        name="secureRoom"
        options={['yes', 'no'] as const}
        value={answers.secureRoom}
        error={errors.secureRoom}
        onChange={(v) => set('secureRoom', v)}
      />

      <div className="tier-preview" aria-live="polite">
        {tier === null ? (
          <span className="muted">Choose power and signal to see the tier.</span>
        ) : (
          <>
            <span className="tier-dot" style={{ background: tierColor(tier) }} /> This school will be{' '}
            <strong>Tier {tier}</strong> ({TIER_LABELS[tier].replace(/^Tier \d: /, '')})
          </>
        )}
      </div>

      {Object.values(errors).some(Boolean) && (
        <p className="form-error" role="alert">
          Please fix the highlighted answers.
        </p>
      )}
      {state === 'failed' && (
        <p className="form-error" role="alert">
          Could not save on this device (storage may be full). Try again.
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={state === 'saving'}>
        {state === 'saving' ? 'Uploading…' : 'Save survey'}
      </button>
      <p className="muted small">The survey date is set automatically when you save.</p>
    </form>
  )
}

function Choice<T extends string>(props: {
  label: string
  name: string
  options: readonly T[]
  value: T | ''
  error?: string
  onChange: (value: T) => void
}) {
  return (
    <fieldset className={`choice ${props.error ? 'has-error' : ''}`}>
      <legend>{props.label}</legend>
      <div className="choice-options">
        {props.options.map((o) => (
          <label key={o} className={`choice-option ${props.value === o ? 'is-checked' : ''}`}>
            <input
              type="radio"
              name={props.name}
              value={o}
              checked={props.value === o}
              onChange={() => props.onChange(o)}
            />
            {capitalise(o)}
          </label>
        ))}
      </div>
      {props.error && <p className="field-error">{props.error}</p>}
    </fieldset>
  )
}

function Count(props: { label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <label className={`count ${props.error ? 'has-error' : ''}`}>
      <span className="count-label">{props.label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={Boolean(props.error)}
      />
      {props.error && <span className="field-error">{props.error}</span>}
    </label>
  )
}

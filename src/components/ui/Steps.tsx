import { Check } from './Icons'

interface Props {
  steps: string[]
  /** How many steps are complete. The step after them is highlighted (unless all are done). */
  done: number
  label: string
  /** Screen-reader word for the highlighted step: "current step" for a form, "next" for a tracker. */
  currentWord?: string
}

/** Step indicator (survey: Choose school → Answer → Save) and step tracker (shipment: Approved → … → Verified). */
export default function Steps({ steps, done, label, currentWord = 'current step' }: Props) {
  return (
    <ol className="steps" aria-label={label}>
      {steps.map((s, i) => {
        const state = i < done ? 'is-done' : i === done ? 'is-current' : ''
        return (
          <li key={s} className={`step ${state}`} aria-current={i === done ? 'step' : undefined}>
            <span className="step-dot" aria-hidden="true">
              {i < done ? <Check size={16} strokeWidth={3} /> : i + 1}
            </span>
            <span className="step-label">
              {s}
              <span className="sr-only">{i < done ? ' (done)' : i === done ? ` (${currentWord})` : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

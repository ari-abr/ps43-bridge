import { DEFAULT_WEIGHTS, type NeedWeights } from '../../lib/scoring'

const FIELDS: { key: keyof NeedWeights; label: string; help: string }[] = [
  { key: 'pupilsPerDevice', label: 'Pupils per device', help: 'Many pupils, few devices' },
  { key: 'readiness', label: 'Readiness gap', help: 'Tier far from 3' },
  { key: 'distance', label: 'Distance', help: 'Far from a school that already has a kit' },
]

interface Props {
  weights: NeedWeights
  onChange: (next: NeedWeights) => void
}

export default function PrioritySettings({ weights, onChange }: Props) {
  return (
    <details className="priority-settings">
      <summary>Priority settings</summary>
      <p className="muted small">Set how much each factor counts towards the need score. The list re-ranks as you move a slider.</p>
      {FIELDS.map((f) => (
        <label key={f.key} className="slider">
          <span className="slider-head">
            <span>{f.label}</span>
            <output>{Math.round(weights[f.key] * 100)}</output>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={weights[f.key]}
            onChange={(e) => onChange({ ...weights, [f.key]: Number(e.target.value) })}
          />
          <span className="muted small">{f.help}</span>
        </label>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange(DEFAULT_WEIGHTS)}>
        Reset weights
      </button>
    </details>
  )
}

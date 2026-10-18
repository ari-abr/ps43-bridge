import type { ReactNode } from 'react'

export type Tone = 'green' | 'navy' | 'yellow'

interface Props {
  /** Small uppercase label above the title, e.g. "PS43 Bridge · Field Tools". */
  eyebrow: string
  title: string
  intro?: ReactNode
  tone?: Tone
  actions?: ReactNode
  children?: ReactNode
}

/** Page title block in the website's style: eyebrow label over a big display-font headline, on a brand colour. */
export default function PageHeader({ eyebrow, title, intro, tone = 'green', actions, children }: Props) {
  return (
    <header className={`page-header tone-${tone}`}>
      <div className="page-header-row">
        <div className="page-header-text">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display">{title}</h1>
          {intro && <p className="page-intro">{intro}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

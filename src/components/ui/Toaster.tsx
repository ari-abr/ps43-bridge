import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts, type ToastKind } from '../../lib/toast'
import { Alert, Check, Close, Info } from './Icons'

const ICONS: Record<ToastKind, typeof Check> = { success: Check, info: Info, warning: Info, error: Alert }

/** Toast messages, bottom of the screen. Screen readers hear each new one. */
export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon size={20} />
            <span className="toast-text">{t.text}</span>
            <button type="button" className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss message">
              <Close size={18} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

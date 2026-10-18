// Small toast messages for saves, uploads and errors. One store, shown by <Toaster /> in the app shell.

export type ToastKind = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  text: string
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((fn) => fn())

export function subscribeToasts(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getToasts = () => toasts

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** Show a message for a few seconds (errors stay a little longer). At most three at once. */
export function toast(kind: ToastKind, text: string) {
  const id = nextId++
  toasts = [...toasts, { id, kind, text }].slice(-3)
  emit()
  setTimeout(() => dismissToast(id), kind === 'error' ? 7000 : 4500)
}

/** The same wording everywhere for "uploaded now" vs "saved on this device, waiting to upload". */
export function toastSaved(result: 'uploaded' | 'queued', what: string) {
  if (result === 'uploaded') toast('success', `${what} uploaded.`)
  else toast('warning', `${what} saved on this device. It will upload when you are Online.`)
}

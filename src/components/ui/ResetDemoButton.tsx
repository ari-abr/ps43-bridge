import { useState } from 'react'
import { resetAndReload } from '../../lib/demo'
import ConfirmDialog from './ConfirmDialog'

/** "Reset demo data", with a confirmation dialog (the one destructive action in the app). */
export default function ResetDemoButton({ className = 'btn-secondary' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Reset demo data
      </button>
      <ConfirmDialog
        open={open}
        title="Reset demo data?"
        confirmLabel="Yes, reset"
        onConfirm={resetAndReload}
        onCancel={() => setOpen(false)}
      >
        <p>
          This clears everything this app saved on this device: surveys, shipments, check-ins, student progress and
          anything still waiting to upload. The app then reloads with the original demo data.
        </p>
      </ConfirmDialog>
    </>
  )
}

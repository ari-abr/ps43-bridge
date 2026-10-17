import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState, type FormEvent } from 'react'

interface Props {
  /** Called for every code read, including repeats (the camera reads the same code many times a second). */
  onCode: (text: string) => void
}

function cameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError') return 'Camera permission was refused. Allow the camera in the browser, or type the tag below.'
  if (name === 'NotReadableError') return 'The camera is in use by another app. Close it, or type the tag below.'
  return 'No camera could be started on this device. Type the tag below instead.'
}

/** Camera QR scanner with a manual entry box as the fallback. */
export default function QrScannerBox({ onCode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode
  const [on, setOn] = useState(false)
  const [error, setError] = useState<string | null>(
    window.isSecureContext ? null : 'The camera only works on localhost or HTTPS. Type the tag below instead.',
  )
  const [manual, setManual] = useState('')

  useEffect(() => {
    if (!on || !videoRef.current) return
    const scanner = new QrScanner(videoRef.current, (result) => onCodeRef.current(result.data), {
      returnDetailedScanResult: true,
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 5,
    })
    let live = true
    scanner.start().catch((err) => {
      if (!live) return
      setError(cameraError(err))
      setOn(false)
    })
    return () => {
      live = false
      scanner.stop()
      scanner.destroy()
    }
  }, [on])

  function submitManual(e: FormEvent) {
    e.preventDefault()
    if (!manual.trim()) return
    onCode(manual)
    setManual('')
  }

  const cameraBlocked = !window.isSecureContext

  return (
    <div className="scanner">
      {on && (
        <div className="scanner-video">
          <video ref={videoRef} muted playsInline />
        </div>
      )}
      {!cameraBlocked && (
        <button type="button" className={on ? 'btn-secondary' : 'btn-primary'} onClick={() => { setError(null); setOn(!on) }}>
          {on ? 'Stop camera' : 'Scan with camera'}
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <form className={`manual-entry ${error ? 'is-fallback' : ''}`} onSubmit={submitManual}>
        <label htmlFor="manual-tag" className="small">
          Or type the tag (e.g. PS43-0012 or just 12)
        </label>
        <div className="manual-row">
          <input
            id="manual-tag"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button type="submit">Add</button>
        </div>
      </form>
    </div>
  )
}

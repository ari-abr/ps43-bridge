import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getQueue, setOnline } from '../lib/api'
import { confirmAndReset } from '../lib/demo'
import { ROLES, getSavedRole, pathForRole, roleForPath, saveRole, type Role } from '../lib/roles'
import { useSyncStatus } from '../lib/useSyncStatus'

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { online, queueCount } = useSyncStatus()
  const role = roleForPath(pathname) ?? getSavedRole()
  // On a phone the role switcher and reset button sit in a menu; Online/Offline and sync status stay visible.
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  function changeRole(next: Role) {
    saveRole(next)
    setMenuOpen(false)
    navigate(pathForRole(next))
  }

  const syncText =
    queueCount === 0
      ? 'All synced'
      : `${queueCount} item${queueCount === 1 ? '' : 's'} waiting to upload`

  // e.g. "1 surveys, 1 progress": what is waiting, by collection.
  const waitingByCollection = Object.entries(
    getQueue().reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.collection]: (acc[q.collection] ?? 0) + 1 }), {}),
  )
    .map(([collection, n]) => `${n} ${collection}`)
    .join(', ')

  return (
    <header className={`header ${menuOpen ? 'menu-open' : ''}`}>
      <div className="header-top">
        <div className="header-title">PS43 Bridge</div>
        <button
          type="button"
          className="menu-btn"
          aria-expanded={menuOpen}
          aria-controls="header-controls"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
      </div>

      <div className="header-controls" id="header-controls">
        <label className="field-inline menu-item">
          <span>Role</span>
          <select value={role} onChange={(e) => changeRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`toggle ${online ? 'is-online' : 'is-offline'}`}
          onClick={() => setOnline(!online)}
          aria-pressed={online}
          title="Simulated connectivity"
        >
          <span className="dot" aria-hidden="true" /> {online ? 'Online' : 'Offline'}
        </button>

        <span className={`badge ${queueCount === 0 ? 'badge-ok' : 'badge-wait'}`} role="status" title={waitingByCollection || undefined}>
          {syncText}
        </span>

        <button type="button" className="btn-secondary menu-item" onClick={confirmAndReset}>
          Reset demo data
        </button>
      </div>
    </header>
  )
}

import { useLocation, useNavigate } from 'react-router-dom'
import { resetDemoData, setOnline } from '../lib/api'
import { ROLES, getSavedRole, pathForRole, roleForPath, saveRole, type Role } from '../lib/roles'
import { useSyncStatus } from '../lib/useSyncStatus'

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { online, queueCount } = useSyncStatus()
  const role = roleForPath(pathname) ?? getSavedRole()

  function changeRole(next: Role) {
    saveRole(next)
    navigate(pathForRole(next))
  }

  function reset() {
    if (!confirm('Clear all demo data on this device and reload?')) return
    resetDemoData()
    window.location.assign('/')
  }

  const syncText =
    queueCount === 0
      ? 'All synced'
      : `${queueCount} item${queueCount === 1 ? '' : 's'} waiting to upload`

  return (
    <header className="header">
      <div className="header-title">PS43 Bridge</div>

      <div className="header-controls">
        <label className="field-inline">
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
          <span className="dot" /> {online ? 'Online' : 'Offline'}
        </button>

        <span className={`badge ${queueCount === 0 ? 'badge-ok' : 'badge-wait'}`} role="status">
          {syncText}
        </span>

        <button type="button" className="btn-secondary" onClick={reset}>
          Reset demo data
        </button>
      </div>
    </header>
  )
}

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSavedRole, pathForRole } from '../lib/roles'
import Logo from './Logo'
import StatusPill from './StatusPill'
import { Close, MenuIcon } from './ui/Icons'

export default function Header() {
  const { pathname } = useLocation()
  // On a phone the navigation sits in a menu; the status pill always shows.
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  // "Learning" opens the Learning page (student or teacher) used last on this device.
  const saved = getSavedRole()
  const learnPath = pathForRole(saved === 'teacher' ? 'teacher' : 'student')
  const links = [
    { to: '/admin', label: 'Admin Map', match: '/admin' },
    { to: '/field', label: 'Field Tools', match: '/field' },
    { to: learnPath, label: 'Learning', match: '/learn' },
    { to: '/compliance', label: 'Legal Compliance', match: '/compliance' },
  ]

  return (
    <header className={`site-header ${menuOpen ? 'menu-open' : ''}`}>
      <div className="site-header-inner">
        <Logo />

        <nav id="site-nav" className="site-nav" aria-label="Main">
          {links.map((l) => {
            const current = pathname.startsWith(l.match)
            return (
              <Link key={l.match} to={l.to} className={`nav-link ${current ? 'is-current' : ''}`} aria-current={current ? 'page' : undefined}>
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="site-header-status">
          <StatusPill />
        </div>

        <button
          type="button"
          className="menu-btn"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <Close size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>
    </header>
  )
}

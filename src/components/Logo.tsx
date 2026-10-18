import { Link } from 'react-router-dom'

/**
 * Placeholder logo: there is no brand/logos/ folder, so the name is set in the display font.
 * `onDark` is the version for navy or green backgrounds.
 */
export default function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link to="/" className={`logo ${onDark ? 'logo-on-dark' : ''}`} aria-label="PS43 Bridge, home">
      <span className="logo-mark">PS43 Foundation</span>
      <span className="logo-app">Bridge</span>
    </Link>
  )
}

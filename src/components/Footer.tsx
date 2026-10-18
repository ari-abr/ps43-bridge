import Logo from './Logo'
import ResetDemoButton from './ui/ResetDemoButton'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-text">
          <Logo onDark />
          <p>PS43 Bridge, a hackathon prototype for the PS43 Foundation. Demo data.</p>
          <p className="small">
            Not an official PS43 Foundation product. School locations come from OpenStreetMap; school names, partners
            and all figures are fictional.
          </p>
        </div>
        <ResetDemoButton className="btn-on-dark" />
      </div>
    </footer>
  )
}

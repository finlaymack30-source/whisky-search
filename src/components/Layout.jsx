import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import AuthModal from './AuthModal'

const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

const THEMES = {
  light: {
    bg:              '#FAFAF7',
    navBg:           '#FFFFFF',
    navBorder:       '#E8E4DC',
    navActive:       '#1A1A18',
    navInactive:     '#9A9080',
    navActiveBorder: '#B8A882',
    navBadge:        '#7A3328',
    navDivider:      '#E8E4DC',
    wordmark:        '#1A1A18',
    tickerBg:        '#FAFAF7',
    tickerBorder:    '#E8E4DC',
    tickerLabel:     '#B8A882',
    tickerVal:       '#4A4540',
    tickerAccent:    '#7A3328',
    tickerSep:       '#D8D2C8',
  },
  dark: {
    bg:              '#0A0A08',
    navBg:           '#111110',
    navBorder:       '#2A2A28',
    navActive:       '#E8E4DC',
    navInactive:     '#666660',
    navActiveBorder: '#8B3A2A',
    navBadge:        '#8B3A2A',
    navDivider:      '#2A2A28',
    wordmark:        '#E8E4DC',
    tickerBg:        '#111110',
    tickerBorder:    '#2A2A28',
    tickerLabel:     '#555550',
    tickerVal:       '#888884',
    tickerAccent:    '#8B3A2A',
    tickerSep:       '#2A2A28',
  },
}

const TICKER_ITEMS = [
  { label: 'Market Health',       value: 'Critical', accent: true  },
  { label: '2026 Clearance Rate', value: '2.1%',     accent: true  },
  { label: 'Reserve Failure',     value: '97.9%',    accent: true  },
  { label: 'Bid–Ask Gap',         value: '30%',      accent: true  },
  { label: 'Model Updated',       value: 'Nov 2026', accent: false },
  { label: 'Casks Tracked',       value: '847',      accent: false },
]

function TickerSet({ prefix, th }) {
  return TICKER_ITEMS.map((item, i) => (
    <span key={`${prefix}${i}`} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <span style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: '#6B6B68', whiteSpace: 'nowrap',
      }}>
        {item.label}&ensp;—&ensp;
      </span>
      <span style={{
        fontFamily: MONO, fontSize: 10, fontWeight: 400,
        color: th.tickerAccent,
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        {item.value}
      </span>
      <span style={{ padding: '0 22px', color: th.tickerSep, fontSize: 14, lineHeight: 1 }}>·</span>
    </span>
  ))
}

function Ticker({ th }) {
  return (
    <div style={{ background: th.tickerBg, height: 32, overflow: 'hidden', borderBottom: `1px solid ${th.tickerBorder}` }}>
      <style>{`@keyframes tbk-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div style={{
        display: 'inline-flex', alignItems: 'center', height: '100%',
        animation: 'tbk-ticker 112s linear infinite',
        willChange: 'transform',
      }}>
        <TickerSet prefix="a" th={th} />
        <TickerSet prefix="b" th={th} />
      </div>
    </div>
  )
}


// ─── ExitIntentCapture ────────────────────────────────────────────────────────

function ExitIntentCapture() { return null }

export default function Layout({ children, dark = false }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [authUser, setAuthUser]           = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('create')
  const [showWelcome, setShowWelcome]     = useState(false)
  // Capture hash before Supabase processes and clears it
  const isSignupConfirmation = useRef(
    typeof window !== 'undefined' && window.location.hash.includes('type=signup')
  )
  const location = useLocation()
  const navigate = useNavigate()
  const th  = dark ? THEMES.dark : THEMES.light
  const nav = THEMES.light  // navbar always light — consistent brand element

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthUser(session?.user ?? null)
        if (event === 'SIGNED_IN') {
          setShowAuthModal(false)
          if (isSignupConfirmation.current) {
            isSignupConfirmation.current = false
            setShowWelcome(true)
            setTimeout(() => setShowWelcome(false), 4200)
          }
        }
      }
    )
    return () => authListener.unsubscribe()
  }, [])

  const isCask = location.pathname === '/cask-valuation'

  const navLink = (active) => ({
    height: 60, padding: isMobile ? '0 12px' : '0 18px',
    display: 'flex', alignItems: 'center',
    fontFamily: SANS, fontSize: 10,
    letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400,
    color: active ? nav.navActive : nav.navInactive,
    borderBottom: `1px solid ${active ? nav.navActiveBorder : 'transparent'}`,
    marginBottom: -1,
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  })

  return (
    <div style={{ fontFamily: SANS, background: th.bg, minHeight: '100vh' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: nav.navBg, borderBottom: `1px solid ${nav.navBorder}`,
        padding: isMobile ? '0 20px' : '0 48px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/cask-valuation" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: SANS, fontSize: 11,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: nav.wordmark, fontWeight: 400,
          }}>
            The Bottle Keep
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/cask-valuation"   style={navLink(isCask)}>Cask valuation</Link>

          {/* Auth links */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8, paddingLeft: 16, borderLeft: `1px solid ${nav.navDivider}` }}>
            {authUser ? (
              <>
                <span style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.12em', color: nav.navActive, padding: isMobile ? '0 10px' : '0 14px', whiteSpace: 'nowrap' }}>
                  {authUser.email.split('@')[0]}
                </span>
                <button
                  onClick={() => supabase.auth.signOut().then(() => navigate('/cask-valuation'))}
                  style={{ height: 60, padding: isMobile ? '0 10px' : '0 14px', display: 'flex', alignItems: 'center', fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400, color: nav.navInactive, opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setAuthModalMode('signin'); setShowAuthModal(true) }}
                  style={{ height: 60, padding: isMobile ? '0 10px' : '0 14px', display: 'flex', alignItems: 'center', fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400, color: nav.navInactive, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Sign in
                </button>
                {!isMobile && (
                  <button
                    onClick={() => { setAuthModalMode('create'); setShowAuthModal(true) }}
                    style={{ height: 60, padding: '0 14px', display: 'flex', alignItems: 'center', fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400, color: nav.navInactive, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Create account
                  </button>
                )}
              </>
            )}
          </div>

          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginLeft: 20, paddingLeft: 20,
              borderLeft: `1px solid ${nav.navDivider}`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: nav.navBadge, flexShrink: 0 }} />
              <span style={{
                fontFamily: SANS, fontSize: 8,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: nav.navBadge, fontWeight: 400,
              }}>
                Market: Critical
              </span>
            </div>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 60 }}>
        <Ticker th={th} />
        {children}

        <footer style={{
          borderTop: '1px solid #E8E4DC',
          background: '#FAFAF7',
          padding: '24px 48px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          gap: isMobile ? 16 : 0,
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <div style={{ fontSize: 11, color: '#6B6B68', fontFamily: SANS, fontWeight: 400 }}>
            <span style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>The Bottle Keep</span>
            {' — '}
            Independent whisky cask intelligence
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#6B6B68', fontFamily: SANS }}>
            <Link to="/cask-valuation" style={{ color: '#6B6B68', textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11 }}>Cask Valuation</Link>
          </div>

          <div style={{ fontSize: 11, color: '#6B6B68', fontFamily: SANS, fontWeight: 400 }}>
            <a href="mailto:support@thebottlekeep.co.uk" style={{ color: '#6B6B68', textDecoration: 'none' }}>support@thebottlekeep.co.uk</a>
            {' · '}
            © 2026 The Bottle Keep
          </div>
        </footer>
      </div>

      {showAuthModal && (
        <AuthModal
          mode={authModalMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
          onSwitchMode={m => setAuthModalMode(m)}
        />
      )}

      {showWelcome && (
        <>
          <style>{`@keyframes tbk-welcome{0%{opacity:0;transform:translate(-50%,-6px)}12%{opacity:1;transform:translate(-50%,0)}78%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}`}</style>
          <div style={{
            position: 'fixed', top: 92, left: '50%',
            zIndex: 300, pointerEvents: 'none',
            animation: 'tbk-welcome 4.2s ease forwards',
            background: '#FFFFFF', border: `1px solid ${nav.navBorder}`,
            padding: '13px 32px', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 400, color: '#1A1A18', letterSpacing: '-0.01em' }}>
              Welcome to The Bottle Keep.
            </span>
          </div>
        </>
      )}

      <ExitIntentCapture />
    </div>
  )
}

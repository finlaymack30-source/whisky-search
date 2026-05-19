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
  { label: 'Model Updated',       value: 'May 2026', accent: false },
  { label: 'Casks Tracked',       value: '847',      accent: false },
]

function TickerSet({ prefix, th }) {
  return TICKER_ITEMS.map((item, i) => (
    <span key={`${prefix}${i}`} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <span style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: th.tickerLabel, whiteSpace: 'nowrap',
      }}>
        {item.label}&ensp;—&ensp;
      </span>
      <span style={{
        fontFamily: MONO, fontSize: 11, fontWeight: 400,
        color: item.accent ? th.tickerAccent : th.tickerVal,
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
        animation: 'tbk-ticker 80s linear infinite',
        willChange: 'transform',
      }}>
        <TickerSet prefix="a" th={th} />
        <TickerSet prefix="b" th={th} />
      </div>
    </div>
  )
}


// ─── ExitIntentCapture ────────────────────────────────────────────────────────

function ExitIntentCapture() {
  const [visible, setVisible]   = useState(false)
  const [email, setEmail]       = useState('')
  const [done, setDone]         = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('tbk_exit_dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    if (dismissed) return
    function onMouseMove(e) {
      if (e.clientY < 50) setVisible(true)
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [dismissed])

  function dismiss() {
    setVisible(false)
    setDismissed(true)
    try { localStorage.setItem('tbk_exit_dismissed', '1') } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.includes('@')) return
    await supabase.from('mailing_list').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
    setDone(true)
    try { localStorage.setItem('tbk_exit_dismissed', '1') } catch {}
    setTimeout(dismiss, 1800)
  }

  if (!visible || dismissed) return null

  const EC = { dark: '#1A1A18', muted: '#9A9080', border: '#E8E4DC', borderMid: '#D8D2C8', terracotta: '#7A3328' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(26,26,24,0.35)' }}
      onClick={e => e.target === e.currentTarget && dismiss()}
    >
      <div style={{ background: '#FFFFFF', border: `1px solid ${EC.border}`, padding: '44px 44px', width: '100%', maxWidth: 400, position: 'relative' }}>
        <button
          onClick={dismiss}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: EC.muted, lineHeight: 1, padding: 4 }}
        >
          ×
        </button>
        <div style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: EC.terracotta, fontFamily: SANS, fontWeight: 400, marginBottom: 14 }}>
          Before you go
        </div>
        {done ? (
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 400, color: EC.dark, fontStyle: 'italic' }}>
            You're on the list.
          </div>
        ) : (
          <>
            <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 400, color: EC.dark, marginBottom: 10, lineHeight: 1.2 }}>
              Free monthly cask market briefing.
            </div>
            <div style={{ fontSize: 13, color: EC.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.65, marginBottom: 24 }}>
              Join investors and brokers tracking the whisky cask market.
            </div>
            <form onSubmit={handleSubmit}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '12px 14px', marginBottom: 10, border: `1px solid ${EC.borderMid}`, borderRadius: 0, fontSize: 14, fontFamily: SANS, fontWeight: 300, color: EC.dark, background: '#FFFFFF', outline: 'none' }}
              />
              <button type="submit" style={{ display: 'block', width: '100%', padding: '13px', background: EC.dark, color: '#F5F2EC', border: 'none', borderRadius: 0, fontSize: 10, fontFamily: SANS, fontWeight: 400, cursor: 'pointer', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Notify me
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

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

  const isCask       = location.pathname === '/cask-valuation'
  const isMarket     = location.pathname === '/market-report'
  const isDistillery = location.pathname === '/distillery-index'

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
          <Link to="/market-report"    style={navLink(isMarket)}>Market report</Link>
          <Link to="/distillery-index" style={navLink(isDistillery)}>Distillery index</Link>

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

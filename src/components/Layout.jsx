import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { User } from 'lucide-react'
import { supabase, fetchSubscription } from '../supabase'
import AuthModal from './AuthModal'

const SANS = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

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

function sessionStatus(sub) {
  if (!sub) return 'none'
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  if (sub.paid_until && new Date(sub.paid_until) > new Date()) return 'active'
  if (Date.now() - new Date(sub.trial_started_at).getTime() < THIRTY_DAYS) return 'trial'
  return 'expired'
}

export default function Layout({ children, dark = false }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [authUser, setAuthUser] = useState(null)
  const [sub, setSub] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('create')
  const dropdownRef = useRef(null)
  const location = useLocation()
  const th  = dark ? THEMES.dark : THEMES.light
  const nav = THEMES.light  // navbar always light — consistent brand element

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setAuthUser(session.user)
          setSub(await fetchSubscription(session.user.id))
        } else {
          setAuthUser(null)
          setSub(null)
        }
      }
    )
    return () => authListener.unsubscribe()
  }, [])

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const status = sessionStatus(sub)

  function trialExpiry() {
    if (!sub?.trial_started_at) return null
    const d = new Date(sub.trial_started_at)
    d.setDate(d.getDate() + 30)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const isCask   = location.pathname === '/cask-valuation'
  const isMarket = location.pathname === '/market-report'

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
          <Link to="/cask-valuation" style={navLink(isCask)}>Cask valuation</Link>
          <Link to="/market-report"  style={navLink(isMarket)}>Market report</Link>

          {/* Profile icon */}
          <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 16, display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => authUser ? setDropdownOpen(o => !o) : (setAuthModalMode('create'), setShowAuthModal(true))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 4, position: 'relative',
              }}
              aria-label={authUser ? 'Account menu' : 'Sign in'}
            >
              <User
                size={20}
                strokeWidth={1.5}
                color={authUser ? nav.navActive : nav.navInactive}
                style={{ opacity: authUser ? 1 : 0.45 }}
              />
              {authUser && (
                <span style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#7A3328',
                  border: `1.5px solid ${nav.navBg}`,
                }} />
              )}
            </button>

            {dropdownOpen && authUser && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: nav.navBg, border: `1px solid ${nav.navBorder}`,
                minWidth: 220, zIndex: 300,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${nav.navBorder}` }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: nav.navInactive, fontFamily: SANS, marginBottom: 4 }}>
                    {status === 'active' ? 'Subscriber' : status === 'trial' ? 'Free trial' : 'Trial ended'}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: nav.navActive, wordBreak: 'break-all' }}>
                    {authUser.email}
                  </div>
                  {status === 'trial' && trialExpiry() && (
                    <div style={{ fontSize: 10, color: nav.navInactive, fontFamily: SANS, marginTop: 4 }}>
                      Trial ends {trialExpiry()}
                    </div>
                  )}
                  {status === 'active' && sub?.paid_until && (
                    <div style={{ fontSize: 10, color: nav.navInactive, fontFamily: SANS, marginTop: 4 }}>
                      Active until {new Date(sub.paid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => { setDropdownOpen(false); await supabase.auth.signOut() }}
                  style={{
                    display: 'block', width: '100%', padding: '12px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', fontSize: 11, fontFamily: SANS, fontWeight: 400,
                    color: nav.navInactive, letterSpacing: '0.04em',
                  }}
                >
                  Sign out
                </button>
              </div>
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
    </div>
  )
}

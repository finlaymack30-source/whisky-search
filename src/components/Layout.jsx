import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const SANS = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

const C = {
  bg: '#FAFAF7',
  white: '#FFFFFF',
  dark: '#1A1A18',
  stone: '#B8A882',
  muted: '#9A9080',
  border: '#E8E4DC',
  terracotta: '#7A3328',
}

const TICKER_ACCENT = '#7A3328'
const TICKER_TEXT   = '#B8A882'
const TICKER_VAL    = '#4A4540'
const TICKER_SEP    = '#D8D2C8'

const TICKER_ITEMS = [
  { label: 'Market Health',       value: 'Critical', accent: true  },
  { label: '2026 Clearance Rate', value: '2.1%',     accent: true  },
  { label: 'Reserve Failure',     value: '97.9%',    accent: true  },
  { label: 'Bid–Ask Gap',         value: '30%',      accent: true  },
  { label: 'Model Updated',       value: 'May 2026', accent: false },
  { label: 'Casks Tracked',       value: '847',      accent: false },
]

function TickerSet({ prefix }) {
  return TICKER_ITEMS.map((item, i) => (
    <span key={`${prefix}${i}`} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <span style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: TICKER_TEXT, whiteSpace: 'nowrap',
      }}>
        {item.label}&ensp;—&ensp;
      </span>
      <span style={{
        fontFamily: MONO, fontSize: 11, fontWeight: 400,
        color: item.accent ? TICKER_ACCENT : TICKER_VAL,
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        {item.value}
      </span>
      <span style={{ padding: '0 22px', color: TICKER_SEP, fontSize: 14, lineHeight: 1 }}>·</span>
    </span>
  ))
}

function Ticker() {
  return (
    <div style={{ background: '#FAFAF7', height: 32, overflow: 'hidden', borderBottom: '1px solid #E8E4DC' }}>
      <style>{`@keyframes tbk-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div style={{
        display: 'inline-flex', alignItems: 'center', height: '100%',
        animation: 'tbk-ticker 80s linear infinite',
        willChange: 'transform',
      }}>
        <TickerSet prefix="a" />
        <TickerSet prefix="b" />
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const location = useLocation()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isCask   = location.pathname === '/cask-valuation'
  const isMarket = location.pathname === '/market-report'

  const navLink = (active) => ({
    height: 60, padding: isMobile ? '0 12px' : '0 18px',
    display: 'flex', alignItems: 'center',
    fontFamily: SANS, fontSize: 10,
    letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400,
    color: active ? C.dark : C.muted,
    borderBottom: `1px solid ${active ? C.stone : 'transparent'}`,
    marginBottom: -1,
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  })

  return (
    <div style={{ fontFamily: SANS, background: C.bg, minHeight: '100vh' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? '0 20px' : '0 48px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/cask-valuation" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: SANS, fontSize: 11,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: C.dark, fontWeight: 400,
          }}>
            The Bottle Keep
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/cask-valuation" style={navLink(isCask)}>Cask valuation</Link>
          <Link to="/market-report"  style={navLink(isMarket)}>Market report</Link>
          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginLeft: 24, paddingLeft: 24,
              borderLeft: `1px solid ${C.border}`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.terracotta, flexShrink: 0 }} />
              <span style={{
                fontFamily: SANS, fontSize: 8,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: C.terracotta, fontWeight: 400,
              }}>
                Market: Critical
              </span>
            </div>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 60 }}>
        <Ticker />
        {children}
      </div>
    </div>
  )
}

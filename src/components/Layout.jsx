import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

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

export default function Layout({ children, dark = false, lightTicker = false }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const location = useLocation()
  const th       = dark ? THEMES.dark : THEMES.light
  const tickerTh = (dark && lightTicker) ? THEMES.light : th

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
    color: active ? th.navActive : th.navInactive,
    borderBottom: `1px solid ${active ? th.navActiveBorder : 'transparent'}`,
    marginBottom: -1,
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  })

  return (
    <div style={{ fontFamily: SANS, background: th.bg, minHeight: '100vh' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: th.navBg, borderBottom: `1px solid ${th.navBorder}`,
        padding: isMobile ? '0 20px' : '0 48px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/cask-valuation" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: SANS, fontSize: 11,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: th.wordmark, fontWeight: 400,
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
              borderLeft: `1px solid ${th.navDivider}`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: th.navBadge, flexShrink: 0 }} />
              <span style={{
                fontFamily: SANS, fontSize: 8,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: th.navBadge, fontWeight: 400,
              }}>
                Market: Critical
              </span>
            </div>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 60 }}>
        <Ticker th={tickerTh} />
        {children}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

const SANS = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"

const C = {
  bg: '#FAFAF7',
  white: '#FFFFFF',
  dark: '#1A1A18',
  stone: '#B8A882',
  muted: '#9A9080',
  ink: '#4A4540',
  border: '#E8E4DC',
  borderMid: '#D8D2C8',
  terracotta: '#7A3328',
  amber: '#b8882a',
  navy: '#0f0a04',
  redBg: '#fef2f2',
  redBorder: '#fecaca',
  greenBg: '#f0fdf4',
  greenBorder: '#bbf7d0',
}

const CHART_DATA = [
  { year: '2020', failRate: 48 },
  { year: '2021', failRate: 0 },
  { year: '2022', failRate: 0 },
  { year: '2023', failRate: 0 },
  { year: '2024', failRate: 66 },
  { year: '2025', failRate: 94 },
  { year: '2026', failRate: 98, ytd: true },
]

const CLEARANCE_STATS = [
  { year: '2023', rate: '100%', note: '100% clearance', rateColor: '#4ade80' },
  { year: '2024', rate: '34%',  note: 'Market turns',   rateColor: '#fb923c' },
  { year: '2025', rate: '5.6%', note: 'Near-collapse',  rateColor: '#ef4444' },
  { year: '2026', rate: '2.1%', note: 'YTD — Critical', rateColor: '#ef4444' },
]

const WATCHLIST = [
  { distillery: 'Macallan',         liquidity: 'Stable',   status: 'Watch',    statusColor: '#d35400', statusBg: '#fff7ed', liqColor: '#d35400' },
  { distillery: 'Springbank',       liquidity: 'Elevated', status: 'Watch',    statusColor: '#d35400', statusBg: '#fff7ed', liqColor: '#d35400' },
  { distillery: 'New distilleries', liquidity: 'Weak',     status: 'Critical', statusColor: '#c0392b', statusBg: '#fef2f2', liqColor: '#c0392b' },
]

const AFFILIATE_ITEMS = [
  { category: 'Whisky Storage',    description: 'Bonded warehouse solutions' },
  { category: 'Insurance',         description: 'Specialist cask & bottle cover' },
  { category: 'Books',             description: 'Whisky investing & collecting' },
  { category: 'Glassware',         description: 'Copita, Glencairn, tumbler' },
  { category: 'Auction Platforms', description: 'Where we track prices' },
  { category: 'Travel',            description: 'Distillery visits & tours' },
]

const SEO_SECTIONS = [
  {
    heading: 'Whisky cask values have disconnected from whisky auction prices',
    body: `Bottled whisky auction prices at the world's major auction houses remained relatively stable through 2024 and into 2025. Cask market data tells a different story. Reserve failure rates — the percentage of cask lots that don't sell because bids fall short of the seller's minimum — crossed 66% in 2024 and 94% in 2025. The cask market has historically led the bottle market by four to six months.`,
  },
  {
    heading: 'Why the whisky cask market crashed',
    body: `The 2020–2023 period saw an extraordinary run: near-100% clearance rates, aggressive bidding, and casks changing hands at premiums that assumed continued appreciation. As interest rates rose and discretionary investment contracted globally, the audience of speculative cask buyers — many drawn in by investment scheme marketing — retreated. What remained was a market priced for a buyer pool that had largely moved on.`,
  },
  {
    heading: 'Is whisky investment dead?',
    body: `Not dead — but the rules have changed. Genuinely rare, well-documented casks from respected distilleries continue to trade. Commodity casks — young, from lesser-known distilleries, with no provenance story — face structural demand destruction. The question for anyone assessing whisky cask values today is not "is this a whisky cask?" but "who, specifically, would buy this at this price?"`,
  },
]

const TITLE       = 'Whisky Cask Market Report — The Bottle Keep'
const DESCRIPTION = 'Monthly intelligence on the whisky cask market. Clearance rates, bid-ask spreads, and distillery liquidity data updated from live auction results.'

function BarChart({ data, isMobile }) {
  const vbW    = 640
  const chartH = 260
  const padL   = isMobile ? 38 : 50
  const padB   = 38
  const padT   = 24
  const padR   = 16
  const innerW = vbW - padL - padR
  const innerH = chartH - padB - padT
  const gap    = innerW / data.length
  const barW   = gap * 0.56

  return (
    <svg viewBox={`0 0 ${vbW} ${chartH}`} style={{ width: '100%' }} aria-label="Reserve failure rate by year">
      {[0, 25, 50, 75, 100].map(t => {
        const y = padT + innerH * (1 - t / 100)
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="#ede5d8" strokeWidth="1" />
            <text x={padL - 7} y={y + 4} fontSize="10" fill="#a09080" textAnchor="end" fontFamily="monospace">{t}%</text>
          </g>
        )
      })}
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#ede5d8" strokeWidth="1" />
      {data.map((d, i) => {
        const x     = padL + gap * i + (gap - barW) / 2
        const barH  = Math.max(innerH * d.failRate / 100, d.failRate > 0 ? 2 : 0)
        const y     = padT + innerH - barH
        const color = d.failRate >= 90 ? '#c0392b' : d.failRate >= 50 ? '#d35400' : '#2d6a4f'
        return (
          <g key={d.year}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} opacity="0.9" rx="1" />
            {d.failRate > 8 && (
              <text x={x + barW / 2} y={y - 6} fontSize="10" fill={color} textAnchor="middle" fontWeight="700" fontFamily="monospace">
                {d.failRate}%
              </text>
            )}
            <text x={x + barW / 2} y={chartH - padB + 16} fontSize="11" fill={d.ytd ? C.amber : '#6b5a42'} textAnchor="middle" fontFamily="Ronzino, sans-serif">
              {d.year}{d.ytd ? '*' : ''}
            </text>
          </g>
        )
      })}
      <text x={vbW - padR} y={chartH - 1} fontSize="9" fill="#a09080" textAnchor="end" fontFamily="monospace">*2026 YTD (Jan–Apr)</text>
    </svg>
  )
}

function MrLabel({ children }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, fontFamily: 'monospace', marginBottom: 10 }}>
      {children}
    </div>
  )
}

export default function MarketReportPage() {
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 768)
  const [email, setEmail]           = useState('')
  const [submitted, setSubmitted]   = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sPad    = isMobile ? '64px 20px' : '80px 48px'
  const innerMax = { maxWidth: 780, margin: '0 auto' }

  return (
    <Layout>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Helmet>

      {/* Hero */}
      <section style={{ background: C.navy, padding: isMobile ? '64px 20px 56px' : '96px 48px 80px' }}>
        <div style={innerMax}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace', color: C.amber, marginBottom: 24 }}>
            The Whisky Cask Market Health Index — Updated May 2026
          </div>
          <h1 style={{ fontSize: isMobile ? 30 : 52, fontWeight: 700, lineHeight: 1.06, color: '#fff', letterSpacing: '-0.015em', marginBottom: 22 }}>
            95% of whisky cask auctions failed to clear in 2026
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.68, maxWidth: 620, marginBottom: 52 }}>
            Analysis of all cask auctions at Grand Whisky Auction since 2020 shows the market has shifted from functioning price discovery to persistent reserve failure.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16 }}>
            {CLEARANCE_STATS.map(s => (
              <div key={s.year} style={{ padding: isMobile ? '18px 16px' : '22px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', fontFamily: 'monospace', marginBottom: 10 }}>{s.year} clearance</div>
                <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, color: s.rateColor, lineHeight: 1, marginBottom: 8, fontFamily: 'monospace' }}>{s.rate}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)' }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chart */}
      <section style={{ background: C.bg, padding: sPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <MrLabel>Reserve Failure Rate</MrLabel>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.dark, letterSpacing: '-0.01em', marginBottom: 8 }}>2020 – 2026</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>Percentage of cask lots failing to meet reserve at Grand Whisky Auction.</p>
          <BarChart data={CHART_DATA} isMobile={isMobile} />
          <div style={{ marginTop: 28, padding: '16px 20px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 3 }}>
            <span style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>
              <strong>Signal lead:</strong> Reserve failure rates began rising in 2024 — approximately 5 months before secondary market price declines became visible in bottled whisky data.
            </span>
          </div>
        </div>
      </section>

      {/* Market Status */}
      <section style={{ background: C.bg, padding: sPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <MrLabel>Market Status</MrLabel>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 14, marginBottom: 40 }}>
            {[
              { label: 'Market Health',        value: 'CRITICAL', valueColor: '#c0392b', bg: C.redBg,  border: C.redBorder },
              { label: 'Reserve Failure Rate', value: '97.9%',    valueColor: '#c0392b', bg: C.redBg,  border: C.redBorder },
              { label: 'Last Updated',         value: 'May 2026', valueColor: C.dark,    bg: C.white,  border: C.borderMid },
            ].map(item => (
              <div key={item.label} style={{ padding: '20px 22px', background: item.bg, border: `1px solid ${item.border}`, borderRadius: 3 }}>
                <MrLabel>{item.label}</MrLabel>
                <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: item.valueColor, fontFamily: 'monospace', letterSpacing: '-0.01em' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '20px 24px', background: C.white, border: `1px solid ${C.borderMid}`, borderRadius: 3, borderLeft: `3px solid ${C.amber}` }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.amber, fontFamily: 'monospace', marginBottom: 8 }}>Leading Indicator</div>
            <p style={{ fontSize: 13, color: C.dark, lineHeight: 1.65 }}>
              Cask reserve failure rates lead bottled whisky price declines by approximately <strong>5 months</strong>. The failure rate crossed 66% in 2024 — a threshold now reflected in softening secondary market valuations for rare bottles.
            </p>
          </div>
        </div>
      </section>

      {/* Distillery Watchlist */}
      <section style={{ background: C.white, padding: sPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <MrLabel>Distillery Watchlist</MrLabel>
          <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.dark, letterSpacing: '-0.01em', marginBottom: 8 }}>Liquidity by distillery</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Cask market liquidity signals by distillery. Updated monthly.</p>
          <div style={{ border: `1px solid ${C.borderMid}`, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px', padding: '10px 20px', background: C.bg, borderBottom: `1px solid ${C.borderMid}` }}>
              {['Distillery', 'Liquidity', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, fontFamily: 'monospace' }}>{h}</div>
              ))}
            </div>
            {WATCHLIST.map((row, i) => (
              <div key={row.distillery} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px', padding: '16px 20px', alignItems: 'center', borderBottom: i < WATCHLIST.length - 1 ? `1px solid ${C.border}` : 'none', background: C.white }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>{row.distillery}</div>
                <div style={{ fontSize: 12, color: row.liqColor }}>{row.liquidity}</div>
                <div>
                  <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace', background: row.statusBg, color: row.statusColor, padding: '3px 8px', borderRadius: 2 }}>{row.status}</span>
                </div>
              </div>
            ))}
            <div style={{ padding: '14px 20px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>Full watchlist available to subscribers — updated monthly with GWA data</span>
            </div>
          </div>
        </div>
      </section>

      {/* Email Capture */}
      <section style={{ background: C.navy, padding: isMobile ? '72px 20px' : '96px 48px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.amber, fontFamily: 'monospace', marginBottom: 20 }}>Free monthly briefing</div>
          <h2 style={{ fontSize: isMobile ? 24 : 34, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: 14 }}>Get monthly whisky market intelligence</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.52)', lineHeight: 1.68, marginBottom: 10 }}>Auction liquidity, clearance rates, cask market health.</p>
          <div style={{ fontSize: 11, color: C.amber, fontFamily: 'monospace', letterSpacing: '0.06em', marginBottom: 36 }}>Next issue: Whisky Market Pulse – May 2026</div>
          {submitted ? (
            <div style={{ padding: '22px 24px', background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 3 }}>
              <div style={{ fontSize: 15, color: '#4ade80', fontWeight: 500 }}>You're on the list.</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>We'll send the May issue as soon as it's ready.</div>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email.trim()) setSubmitted(true) }} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
              <input type="email" placeholder="your@email.com" value={email} required onChange={e => setEmail(e.target.value)} style={{ flex: 1, padding: '13px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 3, fontSize: 14, color: '#fff', fontFamily: 'Ronzino, sans-serif', outline: 'none' }} />
              <button type="submit" style={{ padding: '13px 28px', background: C.amber, color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontFamily: 'Ronzino, sans-serif', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Join free</button>
            </form>
          )}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 18 }}>No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Affiliate Block */}
      <section style={{ background: C.white, padding: sPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <MrLabel>Tools we use</MrLabel>
          <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.dark, letterSpacing: '-0.01em', marginBottom: 8 }}>Resources for cask investors and collectors</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Services we use and recommend. Some links earn a small commission — this never affects our analysis.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
            {AFFILIATE_ITEMS.map(item => (
              <div key={item.category} style={{ padding: '18px 18px', background: C.bg, border: `1px solid ${C.borderMid}`, borderRadius: 3 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, fontFamily: 'monospace', marginBottom: 6 }}>{item.category}</div>
                <div style={{ fontSize: 12, color: C.dark, marginBottom: 10 }}>{item.description}</div>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace', letterSpacing: '0.06em', fontStyle: 'italic' }}>Links coming soon</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO */}
      <section style={{ background: C.bg, padding: sPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <MrLabel>Market Context</MrLabel>
          <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.dark, letterSpacing: '-0.01em', marginBottom: 28 }}>Is the whisky cask investment market broken?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SEO_SECTIONS.map((s, i) => (
              <div key={i} style={{ padding: '24px 24px', background: C.white, border: `1px solid ${C.borderMid}`, borderRadius: 3 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 10, lineHeight: 1.35 }}>{s.heading}</h3>
                <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.75 }}>{s.body}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 32, lineHeight: 1.65 }}>Data source: Grand Whisky Auction completed lot results, 2020–2026. Analysis by The Bottle Keep. Updated monthly. Not investment advice.</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.navy, padding: isMobile ? '40px 20px' : '52px 48px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: SANS, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>The Bottle Keep</span>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: isMobile ? 'left' : 'right', lineHeight: 1.6 }}>Market data updated monthly.<br />Not investment advice.</p>
        </div>
      </footer>
    </Layout>
  )
}

import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const DISPLAY = "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif"

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
}

const CHART_DATA = [
  { year: '2020', failRate: 48 },
  { year: '2021', failRate: 5  },
  { year: '2022', failRate: 7  },
  { year: '2023', failRate: 3  },
  { year: '2024', failRate: 66 },
  { year: '2025', failRate: 94 },
  { year: '2026', failRate: 98, ytd: true },
]

const TERRACOTTA = '#8B3A2A'

const CLEARANCE_STATS = [
  { year: '2023', rate: '100%', note: '100% clearance', badge: 'Functioning',   badgeBg: '#D6EDD8', badgeColor: '#2D6A4F' },
  { year: '2024', rate: '34%',  note: 'Market turns',   badge: 'Deteriorating', badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
  { year: '2025', rate: '5.6%', note: 'Near-collapse',  badge: 'Near-collapse', badgeBg: '#FBDFC8', badgeColor: '#A03010' },
  { year: '2026', rate: '2.1%', note: 'YTD — Critical', badge: 'Critical',      badgeBg: '#EDD8D4', badgeColor: TERRACOTTA, highlight: true },
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

function Label({ children }) {
  return (
    <div style={{
      fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
      fontFamily: SANS, color: C.stone, fontWeight: 400, marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

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
            <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke={C.border} strokeWidth="1" />
            <text x={padL - 7} y={y + 4} fontSize="10" fill={C.muted} textAnchor="end" fontFamily={MONO}>{t}%</text>
          </g>
        )
      })}
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={C.border} strokeWidth="1" />
      {data.map((d, i) => {
        const x     = padL + gap * i + (gap - barW) / 2
        const barH  = Math.max(innerH * d.failRate / 100, d.failRate > 0 ? 2 : 0)
        const y     = padT + innerH - barH
        const color = d.failRate >= 90 ? C.terracotta : d.failRate >= 50 ? '#9A6030' : C.stone
        return (
          <g key={d.year}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} opacity={d.failRate >= 90 ? 0.9 : 0.7} rx="1" />
            {d.failRate > 8 && (
              <text x={x + barW / 2} y={y - 6} fontSize="10" fill={color} textAnchor="middle" fontWeight="500" fontFamily={MONO}>
                {d.failRate}%
              </text>
            )}
            <text x={x + barW / 2} y={chartH - padB + 16} fontSize="11" fill={d.ytd ? C.terracotta : C.ink} textAnchor="middle" fontFamily={SANS}>
              {d.year}{d.ytd ? '*' : ''}
            </text>
          </g>
        )
      })}
      <text x={vbW - padR} y={chartH - 1} fontSize="9" fill={C.muted} textAnchor="end" fontFamily={MONO}>*2026 YTD (Jan–Apr)</text>
    </svg>
  )
}

export default function MarketReportPage() {
  const [isMobile, setIsMobile]   = useState(() => window.innerWidth < 768)
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sectionPad = isMobile ? '56px 24px' : '72px 48px'
  const innerMax   = { maxWidth: 780, margin: '0 auto' }

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

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section style={{ background: C.bg }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          padding: isMobile ? '40px 24px 0' : '56px 48px 0',
        }}>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginBottom: 20 }}>
            <span style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: TERRACOTTA,
            }}>
              Whisky Cask Market Health Index — Updated May 2026
            </span>
          </div>

          <div style={{ borderLeft: `3px solid ${TERRACOTTA}`, paddingLeft: isMobile ? 16 : 24, marginBottom: 48 }}>
            <h1 style={{
              fontFamily: DISPLAY,
              fontSize: isMobile ? 38 : 56,
              fontWeight: 500, lineHeight: 1.08,
              color: C.dark, letterSpacing: '-0.01em',
              hyphens: 'none', maxWidth: 720, margin: 0,
            }}>
              95% of whisky cask auctions<br />failed to clear in 2026
            </h1>
          </div>

          {/* Clearance rate stat row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
            gap: 1,
            background: C.border,
            marginBottom: 0,
          }}>
            {CLEARANCE_STATS.map((s) => (
              <div key={s.year} style={{
                padding: isMobile ? '20px 16px' : '24px 20px',
                background: s.highlight ? '#EDE8DF' : '#F5F2EC',
              }}>
                <Label>{s.year} clearance</Label>
                <div style={{
                  fontFamily: MONO,
                  fontSize: isMobile ? 32 : 44,
                  fontWeight: 400,
                  color: s.highlight ? TERRACOTTA : C.dark,
                  lineHeight: 1,
                  letterSpacing: 0,
                  marginBottom: 8,
                }}>
                  {s.rate}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontFamily: SANS, fontWeight: 300,
                    color: C.muted, lineHeight: 1.45,
                  }}>
                    {s.note}
                  </span>
                  <span style={{
                    fontSize: 9, fontFamily: SANS,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    background: s.badgeBg, color: s.badgeColor,
                    padding: '2px 6px', borderRadius: 2,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {s.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Editorial two-column context block */}
          <div style={{
            borderTop: `1px solid ${C.border}`,
            paddingTop: 28, paddingBottom: 40,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 28 : 52,
          }}>
            <div>
              <div style={{
                fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: SANS, color: TERRACOTTA, marginBottom: 12,
              }}>
                What this means
              </div>
              <p style={{ fontSize: 13, fontFamily: SANS, color: C.ink, lineHeight: 1.8, margin: 0 }}>
                The cask market has not functioned as a liquid asset class since Q3 2023. What began as a demand contraction has become structural: the buyer pool that drove 2020–2023 prices has not returned, and current reserve levels reflect expectations set in a different market entirely.
              </p>
            </div>
            <div>
              <div style={{
                fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: SANS, color: TERRACOTTA, marginBottom: 12,
              }}>
                Key data points
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Average bid–ask gap', '30%'],
                  ['Months since normal function', '33'],
                  ['Distilleries with zero clearance this year', '14'],
                ].map(([label, val]) => (
                  <li key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: 12, fontFamily: SANS, color: C.muted }}>{label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 400, color: C.dark, flexShrink: 0, marginLeft: 16 }}>{val}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reserve Failure Rate chart ─────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sectionPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <Label>Reserve Failure Rate by Year</Label>
          <h2 style={{
            fontFamily: SERIF,
            fontSize: isMobile ? 28 : 38,
            fontWeight: 400, lineHeight: 1.1,
            color: C.dark, letterSpacing: '-0.01em',
            marginBottom: 8,
          }}>
            2020 – 2026
          </h2>
          <p style={{ fontSize: 13, fontFamily: SANS, color: C.muted, marginBottom: 36, lineHeight: 1.6 }}>
            Percentage of cask lots failing to meet reserve at Grand Whisky Auction.
          </p>
          <BarChart data={CHART_DATA} isMobile={isMobile} />
          <div style={{
            marginTop: 28, padding: '16px 20px',
            borderLeft: `2px solid ${C.terracotta}`,
            background: C.white,
            border: `1px solid ${C.border}`,
            borderLeftWidth: 2, borderLeftColor: C.terracotta,
          }}>
            <span style={{ fontSize: 12, fontFamily: SANS, color: C.ink, lineHeight: 1.65 }}>
              <strong>Signal lead:</strong> Reserve failure rates began rising in 2024 — approximately 5 months before secondary market price declines became visible in bottled whisky data.
            </span>
          </div>
        </div>
      </section>

      {/* ── Market Status ─────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sectionPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <Label>Current Market Status</Label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
            borderTop: `1px solid ${C.border}`,
            borderBottom: `1px solid ${C.border}`,
            marginBottom: 32,
          }}>
            {[
              { label: 'Market Health',        value: 'Critical', color: '#724230' },
              { label: 'Reserve Failure Rate', value: '97.9%',    color: '#724230' },
              { label: 'Last Updated',         value: 'May 2026', color: C.dark    },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: isMobile ? '20px 0' : '24px 0',
                paddingLeft: i === 0 ? 0 : (isMobile ? 16 : 32),
                borderLeft: i === 0 ? 'none' : `1px solid ${C.border}`,
                borderTop: (isMobile && i >= 2) ? `1px solid ${C.border}` : 'none',
              }}>
                <Label>{item.label}</Label>
                <div style={{
                  fontFamily: MONO,
                  fontSize: isMobile ? 28 : 44,
                  fontWeight: 400,
                  color: item.color, lineHeight: 1, letterSpacing: 0,
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            padding: '18px 24px',
            background: C.white,
            border: `1px solid ${C.border}`,
            borderLeftWidth: 2, borderLeftColor: C.stone,
          }}>
            <Label>Leading Indicator</Label>
            <p style={{ fontSize: 13, fontFamily: SANS, color: C.dark, lineHeight: 1.65, margin: 0 }}>
              Cask reserve failure rates lead bottled whisky price declines by approximately <strong>5 months</strong>. The failure rate crossed 66% in 2024 — a threshold now reflected in softening secondary market valuations for rare bottles.
            </p>
          </div>
        </div>
      </section>

      {/* ── Distillery Watchlist ───────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sectionPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <Label>Distillery Watchlist</Label>
          <h2 style={{
            fontFamily: SERIF,
            fontSize: isMobile ? 28 : 38,
            fontWeight: 400, lineHeight: 1.1,
            color: C.dark, letterSpacing: '-0.01em',
            marginBottom: 8,
          }}>
            Liquidity by distillery
          </h2>
          <p style={{ fontSize: 13, fontFamily: SANS, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
            Cask market liquidity signals by distillery. Updated monthly.
          </p>
          <div style={{ border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px', padding: '10px 20px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
              {['Distillery', 'Liquidity', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.stone, fontFamily: SANS }}>{h}</div>
              ))}
            </div>
            {WATCHLIST.map((row, i) => (
              <div key={row.distillery} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px', padding: '16px 20px', alignItems: 'center', borderBottom: i < WATCHLIST.length - 1 ? `1px solid ${C.border}` : 'none', background: C.bg }}>
                <div style={{ fontSize: 13, fontFamily: SANS, fontWeight: 400, color: C.dark }}>{row.distillery}</div>
                <div style={{ fontSize: 12, fontFamily: MONO, fontWeight: 400, color: row.liqColor }}>{row.liquidity}</div>
                <div>
                  <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: SANS, background: row.statusBg, color: row.statusColor, padding: '3px 8px' }}>{row.status}</span>
                </div>
              </div>
            ))}
            <div style={{ padding: '14px 20px', background: C.white, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, fontFamily: SANS, color: C.muted, fontStyle: 'italic' }}>Full watchlist available to subscribers — updated monthly with GWA data</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Email Capture ─────────────────────────────────────────────────── */}
      <section style={{ background: C.white, padding: isMobile ? '64px 24px' : '80px 48px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <Label>Free monthly briefing</Label>
          <h2 style={{
            fontFamily: DISPLAY,
            fontSize: isMobile ? 36 : 52,
            fontWeight: 500, lineHeight: 1.05,
            color: C.dark, letterSpacing: '-0.01em',
            marginBottom: 16,
          }}>
            Whisky market<br />intelligence, monthly
          </h2>
          <p style={{ fontSize: 14, fontFamily: SANS, color: C.muted, lineHeight: 1.68, marginBottom: 10 }}>
            Auction liquidity, clearance rates, cask market health.
          </p>
          <div style={{ fontSize: 10, fontFamily: MONO, color: C.stone, letterSpacing: '0.08em', marginBottom: 36 }}>
            Next issue: Whisky Market Pulse — May 2026
          </div>
          {submitted ? (
            <div style={{ padding: '22px 24px', background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontFamily: SANS, color: C.dark, fontWeight: 500 }}>You're on the list.</div>
              <div style={{ fontSize: 12, fontFamily: SANS, color: C.muted, marginTop: 6 }}>We'll send the May issue as soon as it's ready.</div>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email.trim()) setSubmitted(true) }} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
              <input
                type="email" placeholder="your@email.com" value={email} required
                onChange={e => setEmail(e.target.value)}
                style={{ flex: 1, padding: '13px 16px', background: C.bg, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: SANS, color: C.dark, outline: 'none' }}
              />
              <button type="submit" style={{ padding: '13px 28px', background: C.dark, color: C.bg, border: 'none', fontSize: 10, fontFamily: SANS, fontWeight: 400, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Join free
              </button>
            </form>
          )}
          <p style={{ fontSize: 11, fontFamily: SANS, color: C.muted, marginTop: 18 }}>No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ── Affiliate Block ───────────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sectionPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={innerMax}>
          <Label>Tools we use</Label>
          <h2 style={{
            fontFamily: SERIF,
            fontSize: isMobile ? 28 : 38,
            fontWeight: 400, lineHeight: 1.1,
            color: C.dark, letterSpacing: '-0.01em',
            marginBottom: 8,
          }}>
            Resources for cask investors and collectors
          </h2>
          <p style={{ fontSize: 13, fontFamily: SANS, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
            Services we use and recommend. Some links earn a small commission — this never affects our analysis.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 1, border: `1px solid ${C.border}` }}>
            {AFFILIATE_ITEMS.map(item => (
              <div key={item.category} style={{ padding: '20px 20px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: SANS, color: C.stone, marginBottom: 8 }}>{item.category}</div>
                <div style={{ fontSize: 13, fontFamily: SANS, color: C.dark, marginBottom: 10, lineHeight: 1.4 }}>{item.description}</div>
                <div style={{ fontSize: 9, fontFamily: MONO, color: C.muted, letterSpacing: '0.06em', fontStyle: 'italic' }}>Coming soon</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEO ───────────────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sectionPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Label>Market Context</Label>
          <h2 style={{
            fontFamily: SERIF,
            fontSize: isMobile ? 28 : 38,
            fontWeight: 400, lineHeight: 1.1,
            color: C.dark, letterSpacing: '-0.01em',
            marginBottom: 32,
          }}>
            Is the whisky cask investment market broken?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {SEO_SECTIONS.map((s, i) => (
              <div key={i} style={{ paddingTop: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
                <h3 style={{ fontFamily: SERIF, fontSize: isMobile ? 18 : 22, fontWeight: 400, color: C.dark, marginBottom: 10, lineHeight: 1.35 }}>{s.heading}</h3>
                <p style={{ fontSize: 13, fontFamily: SANS, color: C.ink, lineHeight: 1.75, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, fontFamily: SANS, color: C.muted, marginTop: 28, lineHeight: 1.65 }}>
            Data source: Grand Whisky Auction completed lot results, 2020–2026. Analysis by The Bottle Keep. Updated monthly. Not investment advice.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: C.bg, padding: isMobile ? '32px 24px' : '40px 48px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.muted, fontWeight: 400 }}>The Bottle Keep</span>
          <p style={{ fontSize: 11, fontFamily: SANS, color: C.muted, margin: 0, lineHeight: 1.6 }}>Market data updated monthly. Not investment advice.</p>
        </div>
      </footer>
    </Layout>
  )
}

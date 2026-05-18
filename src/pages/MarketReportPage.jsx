import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

const SANS    = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO    = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"
const SERIF   = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const DISPLAY = "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif"

const C = {
  bg:        '#FAFAF7',
  white:     '#FFFFFF',
  dark:      '#1A1A18',
  stone:     '#B8A882',
  muted:     '#9A9080',
  ink:       '#4A4540',
  border:    '#E8E4DC',
  borderMid: '#D8D2C8',
  terracotta:'#7A3328',
}

const T = '#8B3A2A'  // editorial terracotta

// ── Data ──────────────────────────────────────────────────────────────────────

const CHART_DATA = [
  { year: '2020', failRate: 48 },
  { year: '2021', failRate: 5  },
  { year: '2022', failRate: 7  },
  { year: '2023', failRate: 3  },
  { year: '2024', failRate: 66 },
  { year: '2025', failRate: 94 },
  { year: '2026', failRate: 98, ytd: true },
]

const CLEARANCE_STATS = [
  { year: '2023', rate: '100%', note: '100% clearance', yoy: '↑ from 52% in 2022', badge: 'Functioning',   badgeBg: '#D6EDD8', badgeColor: '#2D6A4F' },
  { year: '2024', rate: '34%',  note: 'Market turns',   yoy: '↓ from 100% in 2023', badge: 'Deteriorating', badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
  { year: '2025', rate: '5.6%', note: 'Near-collapse',  yoy: '↓ from 34% in 2024',  badge: 'Near-collapse', badgeBg: '#FBDFC8', badgeColor: '#A03010' },
  { year: '2026', rate: '2.1%', note: 'YTD — Critical', yoy: '↓ from 5.6% in 2025', badge: 'Critical',      badgeBg: '#EDD8D4', badgeColor: T, highlight: true },
]

const TABLE_DATA = [
  { distillery: 'Macallan',     listed: 47, sold: 2, rate: '4.3%',  status: 'Watch',    badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
  { distillery: 'GlenAllachie', listed: 23, sold: 0, rate: '0.0%',  status: 'Critical', badgeBg: '#EDD8D4', badgeColor: T },
  { distillery: 'Springbank',   listed: 31, sold: 1, rate: '3.2%',  status: 'Watch',    badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
  { distillery: 'Ardbeg',       listed: 19, sold: 1, rate: '5.3%',  status: 'Watch',    badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
  { distillery: 'Glen Scotia',  listed: 28, sold: 0, rate: '0.0%',  status: 'Critical', badgeBg: '#EDD8D4', badgeColor: T },
  { distillery: 'Glenfarclas',  listed: 15, sold: 1, rate: '6.7%',  status: 'Watch',    badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
  { distillery: 'Bowmore',      listed: 22, sold: 0, rate: '0.0%',  status: 'Critical', badgeBg: '#EDD8D4', badgeColor: T },
  { distillery: 'Dalmore',      listed: 34, sold: 2, rate: '5.9%',  status: 'Watch',    badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
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

// ── Shared components ─────────────────────────────────────────────────────────

function Lbl({ children, color }) {
  return (
    <div style={{
      fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
      fontFamily: SANS, color: color ?? C.stone, fontWeight: 400, marginBottom: 7,
    }}>
      {children}
    </div>
  )
}

function Pill({ bg, color, children }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: SANS, letterSpacing: '0.12em', textTransform: 'uppercase',
      background: bg, color, padding: '2px 6px', borderRadius: 2, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function BarChart({ data, isMobile }) {
  const vbW = 640, chartH = 220
  const padL = isMobile ? 36 : 46, padB = 32, padT = 18, padR = 12
  const innerW = vbW - padL - padR
  const innerH = chartH - padB - padT
  const gap = innerW / data.length
  const barW = gap * 0.56

  return (
    <svg viewBox={`0 0 ${vbW} ${chartH}`} style={{ width: '100%' }} aria-label="Reserve failure rate by year">
      {[0, 25, 50, 75, 100].map(t => {
        const y = padT + innerH * (1 - t / 100)
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke={C.border} strokeWidth="1" />
            <text x={padL - 6} y={y + 4} fontSize="9" fill={C.muted} textAnchor="end" fontFamily={MONO}>{t}%</text>
          </g>
        )
      })}
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={C.border} strokeWidth="1" />
      {data.map((d) => {
        const i = data.indexOf(d)
        const x     = padL + gap * i + (gap - barW) / 2
        const barH  = Math.max(innerH * d.failRate / 100, d.failRate > 0 ? 2 : 0)
        const y     = padT + innerH - barH
        const color = d.failRate >= 90 ? T : d.failRate >= 50 ? '#9A6030' : C.stone
        return (
          <g key={d.year}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} opacity={d.failRate >= 90 ? 0.9 : 0.7} rx="1" />
            {d.failRate > 8 && (
              <text x={x + barW / 2} y={y - 5} fontSize="9" fill={color} textAnchor="middle" fontWeight="500" fontFamily={MONO}>
                {d.failRate}%
              </text>
            )}
            <text x={x + barW / 2} y={chartH - padB + 14} fontSize="10" fill={d.ytd ? T : C.ink} textAnchor="middle" fontFamily={SANS}>
              {d.year}{d.ytd ? '*' : ''}
            </text>
          </g>
        )
      })}
      <text x={vbW - padR} y={chartH - 1} fontSize="8" fill={C.muted} textAnchor="end" fontFamily={MONO}>*2026 YTD (Jan–Apr)</text>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketReportPage() {
  const [isMobile, setIsMobile]   = useState(() => window.innerWidth < 768)
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sP  = isMobile ? '34px 14px' : '43px 29px'
  const iM  = { maxWidth: 780, margin: '0 auto' }
  const col5 = isMobile ? '1fr' : '1fr 90px 60px 120px 90px'

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

      {/* FT-style brand stripe */}
      <div style={{ height: 3, background: T }} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ background: C.bg }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          padding: isMobile ? '24px 14px 0' : '34px 29px 0',
        }}>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T }}>
              Whisky Cask Market Health Index — Updated May 2026
            </span>
          </div>

          <div style={{ borderLeft: `3px solid ${T}`, paddingLeft: isMobile ? 14 : 20, marginBottom: 28 }}>
            <h1 style={{
              fontFamily: DISPLAY, fontSize: isMobile ? 36 : 52,
              fontWeight: 500, lineHeight: 1.08, color: C.dark,
              letterSpacing: '-0.01em', hyphens: 'none', maxWidth: 680, margin: 0,
            }}>
              95% of whisky cask auctions<br />failed to clear in 2026
            </h1>
          </div>

          {/* ── Stat data bars ─────────────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
            gap: 1, background: C.border,
          }}>
            {CLEARANCE_STATS.map((s) => (
              <div key={s.year} style={{
                padding: isMobile ? '12px 12px' : '14px 16px',
                background: s.highlight ? '#EDE8DF' : '#F5F2EC',
              }}>
                <Lbl>{s.year} clearance</Lbl>
                <div style={{
                  fontFamily: MONO, fontSize: isMobile ? 28 : 36,
                  fontWeight: 400, color: s.highlight ? T : C.dark,
                  lineHeight: 1, letterSpacing: 0, marginBottom: 6,
                }}>
                  {s.rate}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                  <Pill bg={s.badgeBg} color={s.badgeColor}>{s.badge}</Pill>
                </div>
                <div style={{ fontSize: 10, fontFamily: MONO, color: C.muted, letterSpacing: '0.02em' }}>
                  {s.yoy}
                </div>
              </div>
            ))}
          </div>

          {/* ── Editorial two-column block ─────────────────────────────── */}
          <div style={{
            borderTop: `1px solid ${C.border}`,
            paddingTop: 17, paddingBottom: 24,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 17 : 31,
          }}>
            <div>
              <Lbl color={T}>What this means</Lbl>
              <p style={{ fontSize: 13, fontFamily: SANS, color: C.ink, lineHeight: 1.4, margin: 0 }}>
                The cask market has not functioned as a liquid asset class since Q3 2023. What began as a demand contraction has become structural: the buyer pool that drove 2020–2023 prices has not returned, and current reserve levels reflect expectations set in a different market entirely.
              </p>
            </div>
            <div>
              <Lbl color={T}>Key data points</Lbl>
              {[
                ['Average bid–ask gap',                     '30%'    ],
                ['Months since normal function',             '33'     ],
                ['Distilleries with zero clearance YTD',    '14'     ],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${C.border}`, padding: '6px 0' }}>
                  <span style={{ fontSize: 12, fontFamily: SANS, color: C.muted, lineHeight: 1.4 }}>{label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 400, color: C.dark, flexShrink: 0, marginLeft: 12 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Distillery clearance table ─────────────────────────────── */}
          <div style={{ paddingBottom: 28 }}>
            <Lbl>Distillery clearance data — Jan–Apr 2026</Lbl>
            <div style={{ border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: col5,
                padding: '8px 14px', background: C.dark,
                gap: 8,
              }}>
                {['Distillery', 'Listed', 'Sold', 'Clearance', 'Status'].map(h => (
                  <div key={h} style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: SANS, color: 'rgba(255,255,255,0.5)' }}>{h}</div>
                ))}
              </div>
              {TABLE_DATA.map((row, i) => (
                <div key={row.distillery} style={{
                  display: 'grid', gridTemplateColumns: col5,
                  padding: '9px 14px',
                  background: i % 2 === 0 ? C.white : '#F5F2EC',
                  borderTop: `1px solid ${C.border}`,
                  gap: 8, alignItems: 'center',
                }}>
                  <div style={{ fontSize: 12, fontFamily: SANS, color: C.dark }}>{row.distillery}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: C.ink }}>{row.listed}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: C.ink }}>{row.sold}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: row.status === 'Critical' ? T : C.dark, fontWeight: 400 }}>{row.rate}</div>
                  <div><Pill bg={row.badgeBg} color={row.badgeColor}>{row.status}</Pill></div>
                </div>
              ))}
              <div style={{ padding: '8px 14px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, fontFamily: MONO, color: C.muted }}>GWA lot results Jan–Apr 2026. Representative sample. Full dataset for subscribers.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reserve Failure Rate chart ──────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sP, borderBottom: `1px solid ${C.border}` }}>
        <div style={iM}>
          <Lbl>Reserve Failure Rate by Year</Lbl>
          <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 24 : 32, fontWeight: 400, lineHeight: 1.1, color: C.dark, letterSpacing: '-0.01em', marginBottom: 6 }}>
            2020 – 2026
          </h2>
          <p style={{ fontSize: 12, fontFamily: SANS, color: C.muted, marginBottom: 24, lineHeight: 1.4 }}>
            Percentage of cask lots failing to meet reserve at Grand Whisky Auction.
          </p>
          <BarChart data={CHART_DATA} isMobile={isMobile} />
          <div style={{ marginTop: 17, padding: '12px 16px', background: C.white, border: `1px solid ${C.border}`, borderLeft: `2px solid ${T}` }}>
            <span style={{ fontSize: 12, fontFamily: SANS, color: C.ink, lineHeight: 1.5 }}>
              <strong>Signal lead:</strong> Reserve failure rates began rising in 2024 — approximately 5 months before secondary market price declines became visible in bottled whisky data.
            </span>
          </div>
        </div>
      </section>

      {/* ── Market Status ───────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sP, borderBottom: `1px solid ${C.border}` }}>
        <div style={iM}>
          <Lbl>Current Market Status</Lbl>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
            gap: 1, background: C.border, marginBottom: 19,
          }}>
            {[
              { label: 'Market Health',        value: 'Critical', color: T         },
              { label: 'Reserve Failure Rate', value: '97.9%',    color: T         },
              { label: 'Last Updated',         value: 'May 2026', color: C.dark    },
            ].map(item => (
              <div key={item.label} style={{ padding: isMobile ? '12px 12px' : '14px 16px', background: '#F5F2EC' }}>
                <Lbl>{item.label}</Lbl>
                <div style={{ fontFamily: MONO, fontSize: isMobile ? 24 : 32, fontWeight: 400, color: item.color, lineHeight: 1, letterSpacing: 0 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', background: C.white, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.stone}` }}>
            <Lbl>Leading Indicator</Lbl>
            <p style={{ fontSize: 12, fontFamily: SANS, color: C.dark, lineHeight: 1.5, margin: 0 }}>
              Cask reserve failure rates lead bottled whisky price declines by approximately <strong>5 months</strong>. The failure rate crossed 66% in 2024 — a threshold now reflected in softening secondary market valuations for rare bottles.
            </p>
          </div>
        </div>
      </section>

      {/* ── Distillery Watchlist ─────────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sP, borderBottom: `1px solid ${C.border}` }}>
        <div style={iM}>
          <Lbl>Distillery Watchlist</Lbl>
          <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 24 : 32, fontWeight: 400, lineHeight: 1.1, color: C.dark, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Liquidity by distillery
          </h2>
          <p style={{ fontSize: 12, fontFamily: SANS, color: C.muted, marginBottom: 17, lineHeight: 1.4 }}>
            Cask market liquidity signals by distillery. Updated monthly.
          </p>
          <div style={{ border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px', padding: '8px 14px', background: C.dark, borderBottom: `1px solid ${C.border}` }}>
              {['Distillery', 'Liquidity', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontFamily: SANS }}>{h}</div>
              ))}
            </div>
            {[
              { distillery: 'Macallan',         liquidity: 'Stable',   badge: 'Watch',    badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
              { distillery: 'Springbank',       liquidity: 'Elevated', badge: 'Watch',    badgeBg: '#FAEAC8', badgeColor: '#8A5A00' },
              { distillery: 'New distilleries', liquidity: 'Weak',     badge: 'Critical', badgeBg: '#EDD8D4', badgeColor: T        },
            ].map((row, i, arr) => (
              <div key={row.distillery} style={{
                display: 'grid', gridTemplateColumns: '1fr 130px 100px',
                padding: '10px 14px', alignItems: 'center',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.white : '#F5F2EC',
              }}>
                <div style={{ fontSize: 12, fontFamily: SANS, color: C.dark }}>{row.distillery}</div>
                <div style={{ fontSize: 12, fontFamily: MONO, color: C.ink }}>{row.liquidity}</div>
                <div><Pill bg={row.badgeBg} color={row.badgeColor}>{row.badge}</Pill></div>
              </div>
            ))}
            <div style={{ padding: '8px 14px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, fontFamily: MONO, color: C.muted, fontStyle: 'italic' }}>Full watchlist available to subscribers — updated monthly with GWA data</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Email Capture ────────────────────────────────────────────────────── */}
      <section style={{ background: C.white, padding: isMobile ? '38px 14px' : '48px 29px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <Lbl>Free monthly briefing</Lbl>
          <h2 style={{ fontFamily: DISPLAY, fontSize: isMobile ? 30 : 42, fontWeight: 500, lineHeight: 1.05, color: C.dark, letterSpacing: '-0.01em', marginBottom: 10 }}>
            Whisky market<br />intelligence, monthly
          </h2>
          <p style={{ fontSize: 13, fontFamily: SANS, color: C.muted, lineHeight: 1.4, marginBottom: 8 }}>
            Auction liquidity, clearance rates, cask market health.
          </p>
          <div style={{ fontSize: 10, fontFamily: MONO, color: C.stone, letterSpacing: '0.08em', marginBottom: 22 }}>
            Next issue: Whisky Market Pulse — May 2026
          </div>
          {submitted ? (
            <div style={{ padding: '16px 20px', background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontFamily: SANS, color: C.dark, fontWeight: 500 }}>You're on the list.</div>
              <div style={{ fontSize: 12, fontFamily: SANS, color: C.muted, marginTop: 4 }}>We'll send the May issue as soon as it's ready.</div>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email.trim()) setSubmitted(true) }} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
              <input
                type="email" placeholder="your@email.com" value={email} required
                onChange={e => setEmail(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: SANS, color: C.dark, outline: 'none' }}
              />
              <button type="submit" style={{ padding: '10px 22px', background: C.dark, color: C.bg, border: 'none', fontSize: 9, fontFamily: SANS, fontWeight: 400, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Join free
              </button>
            </form>
          )}
          <p style={{ fontSize: 11, fontFamily: SANS, color: C.muted, marginTop: 12 }}>No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ── Affiliate Block ───────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sP, borderBottom: `1px solid ${C.border}` }}>
        <div style={iM}>
          <Lbl>Tools we use</Lbl>
          <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 24 : 32, fontWeight: 400, lineHeight: 1.1, color: C.dark, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Resources for cask investors and collectors
          </h2>
          <p style={{ fontSize: 12, fontFamily: SANS, color: C.muted, marginBottom: 17, lineHeight: 1.4 }}>
            Services we use and recommend. Some links earn a small commission — this never affects our analysis.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 1, background: C.border }}>
            {AFFILIATE_ITEMS.map(item => (
              <div key={item.category} style={{ padding: '14px 16px', background: C.white }}>
                <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: SANS, color: C.stone, marginBottom: 6 }}>{item.category}</div>
                <div style={{ fontSize: 12, fontFamily: SANS, color: C.dark, marginBottom: 8, lineHeight: 1.4 }}>{item.description}</div>
                <div style={{ fontSize: 9, fontFamily: MONO, color: C.muted, letterSpacing: '0.06em', fontStyle: 'italic' }}>Coming soon</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEO ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, padding: sP, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Lbl>Market Context</Lbl>
          <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 24 : 32, fontWeight: 400, lineHeight: 1.1, color: C.dark, letterSpacing: '-0.01em', marginBottom: 19 }}>
            Is the whisky cask investment market broken?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {SEO_SECTIONS.map((s, i) => (
              <div key={i} style={{ paddingTop: 17, paddingBottom: 17, borderBottom: `1px solid ${C.border}` }}>
                <h3 style={{ fontFamily: SERIF, fontSize: isMobile ? 16 : 19, fontWeight: 400, color: C.dark, marginBottom: 7, lineHeight: 1.3 }}>{s.heading}</h3>
                <p style={{ fontSize: 12, fontFamily: SANS, color: C.ink, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, fontFamily: MONO, color: C.muted, marginTop: 17, lineHeight: 1.55 }}>
            Data source: Grand Whisky Auction completed lot results, 2020–2026. Analysis by The Bottle Keep. Updated monthly. Not investment advice.
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: C.bg, padding: isMobile ? '20px 14px' : '24px 29px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.muted, fontWeight: 400 }}>The Bottle Keep</span>
          <p style={{ fontSize: 10, fontFamily: MONO, color: C.muted, margin: 0 }}>Market data updated monthly. Not investment advice.</p>
        </div>
      </footer>
    </Layout>
  )
}

import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

const SANS    = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO    = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"
const SERIF   = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const DISPLAY = "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif"

// Terminal palette
const D = {
  bg:      '#0A0A08',
  surface: '#111110',
  alt:     '#1A1A18',
  border:  '#2A2A28',
  text:    '#E8E4DC',
  muted:   '#9A9090',
  dim:     '#666660',
  // Signal colours — data only
  green:      '#4A7C59',
  amber:      '#C4892A',
  orange:     '#C4612A',
  terracotta: '#8B3A2A',
}

// Signal colour from clearance rate value
function sig(rateStr) {
  const v = parseFloat(rateStr)
  if (v > 10) return { color: D.green,      bg: 'rgba(74,124,89,0.16)',   label: 'Functioning'   }
  if (v >= 5) return { color: D.amber,      bg: 'rgba(196,137,42,0.16)',  label: 'Watch'         }
  if (v >= 1) return { color: D.orange,     bg: 'rgba(196,97,42,0.16)',   label: 'At Risk'       }
              return { color: D.terracotta, bg: 'rgba(139,58,42,0.16)',   label: 'Critical'      }
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CHART_DATA = [
  { year: '2020', v: 48 },
  { year: '2021', v: 5  },
  { year: '2022', v: 7  },
  { year: '2023', v: 3  },
  { year: '2024', v: 66 },
  { year: '2025', v: 94 },
  { year: '2026', v: 98, ytd: true },
]

const CLEARANCE_STATS = [
  { year: '2023', rate: '100%', note: '100% clearance', yoy: '↑ from 52% in 2022',   badge: 'Functioning',   badgeBg: 'rgba(74,124,89,0.16)',   badgeColor: D.green      },
  { year: '2024', rate: '34%',  note: 'Market turns',   yoy: '↓ from 100% in 2023',  badge: 'Deteriorating', badgeBg: 'rgba(196,137,42,0.16)',  badgeColor: D.amber      },
  { year: '2025', rate: '5.6%', note: 'Near-collapse',  yoy: '↓ from 34% in 2024',   badge: 'Near-collapse', badgeBg: 'rgba(196,97,42,0.16)',   badgeColor: D.orange     },
  { year: '2026', rate: '2.1%', note: 'YTD — Critical', yoy: '↓ from 5.6% in 2025',  badge: 'Critical',      badgeBg: 'rgba(139,58,42,0.16)',   badgeColor: D.terracotta, highlight: true },
]

const TABLE_DATA = [
  { distillery: 'Macallan',     listed: 47, sold: 2, rate: '4.3%'  },
  { distillery: 'GlenAllachie', listed: 23, sold: 0, rate: '0.0%'  },
  { distillery: 'Springbank',   listed: 31, sold: 1, rate: '3.2%'  },
  { distillery: 'Ardbeg',       listed: 19, sold: 1, rate: '5.3%'  },
  { distillery: 'Glen Scotia',  listed: 28, sold: 0, rate: '0.0%'  },
  { distillery: 'Glenfarclas',  listed: 15, sold: 1, rate: '6.7%'  },
  { distillery: 'Bowmore',      listed: 22, sold: 0, rate: '0.0%'  },
  { distillery: 'Dalmore',      listed: 34, sold: 2, rate: '5.9%'  },
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

// ── Shared primitives ─────────────────────────────────────────────────────────

function Lbl({ children, color }) {
  return (
    <div style={{
      fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
      fontFamily: SANS, color: color ?? D.dim, fontWeight: 400, marginBottom: 7,
    }}>
      {children}
    </div>
  )
}

function Pill({ bg, color, children }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: SANS, letterSpacing: '0.12em', textTransform: 'uppercase',
      background: bg, color, padding: '2px 7px', borderRadius: 2, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ── Line chart ────────────────────────────────────────────────────────────────

function LineChart() {
  const vbW = 1000, h = 210
  const pL = 48, pR = 16, pT = 20, pB = 34
  const iW = vbW - pL - pR
  const iH = h - pT - pB
  const n  = CHART_DATA.length - 1

  const px = (i) => pL + (i / n) * iW
  const py = (v) => pT + iH * (1 - v / 100)
  const pts = CHART_DATA.map((d, i) => ({ x: px(i), y: py(d.v) }))

  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L ${pts[n].x.toFixed(1)},${(pT + iH).toFixed(1)} L ${pts[0].x.toFixed(1)},${(pT + iH).toFixed(1)} Z`

  // Q3 2023 inflection: 75% of the way between index 3 (2023) and index 4 (2024)
  const xInfl = px(3) + 0.75 * (px(4) - px(3))

  return (
    <svg viewBox={`0 0 ${vbW} ${h}`} style={{ width: '100%', display: 'block' }} aria-label="Reserve failure rate 2020–2026">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={D.terracotta} stopOpacity="0.22" />
          <stop offset="100%" stopColor={D.terracotta} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {[0, 25, 50, 75, 100].map(t => {
        const y = py(t)
        return (
          <g key={t}>
            <line x1={pL} y1={y} x2={pL + iW} y2={y} stroke={D.border} strokeWidth="1" />
            <text x={pL - 6} y={y + 4} fontSize="9" fill={D.dim} textAnchor="end" fontFamily={MONO}>{t}%</text>
          </g>
        )
      })}
      <line x1={pL} y1={pT} x2={pL} y2={pT + iH} stroke={D.border} strokeWidth="1" />

      {/* Area */}
      <path d={area} fill="url(#areaFill)" />

      {/* Inflection dashed line */}
      <line x1={xInfl} y1={pT} x2={xInfl} y2={pT + iH} stroke={D.terracotta} strokeWidth="1" strokeDasharray="4 3" opacity="0.55" />
      <text x={xInfl + 5} y={pT + 12} fontSize="9" fill={D.terracotta} fontFamily={MONO} opacity="0.8">
        Q3 2023 — Market inflection
      </text>

      {/* Line */}
      <path d={line} fill="none" stroke={D.terracotta} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={D.bg} stroke={D.terracotta} strokeWidth="1.5" />
      ))}

      {/* X labels */}
      {CHART_DATA.map((d, i) => (
        <text key={d.year} x={pts[i].x} y={h - pB + 14} fontSize="10" fill={d.ytd ? D.terracotta : D.dim} textAnchor="middle" fontFamily={MONO}>
          {d.year}{d.ytd ? '*' : ''}
        </text>
      ))}

      <text x={vbW - pR} y={h - 2} fontSize="8" fill={D.dim} textAnchor="end" fontFamily={MONO}>*2026 YTD (Jan–Apr)</text>
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

  const hp = isMobile ? '0 16px' : '0 48px'   // horizontal padding
  const sp = isMobile ? '28px 16px' : '36px 48px'  // section padding
  const col5 = isMobile ? '1fr' : '1fr 88px 56px 110px 88px'

  return (
    <Layout dark lightTicker>
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

      {/* Brand stripe */}
      <div style={{ height: 3, background: D.terracotta }} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ background: D.bg, padding: isMobile ? '24px 16px 0' : '32px 48px 0' }}>

        <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 14, marginBottom: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.terracotta }}>
            Whisky Cask Market Health Index — Updated May 2026
          </span>
        </div>

        <div style={{ borderLeft: `3px solid ${D.terracotta}`, paddingLeft: isMobile ? 14 : 20, marginBottom: 28 }}>
          <h1 style={{
            fontFamily: DISPLAY, fontSize: isMobile ? 32 : 48,
            fontWeight: 500, lineHeight: 1.08, color: D.text,
            letterSpacing: '-0.01em', hyphens: 'none', maxWidth: 680, margin: 0,
          }}>
            95% of whisky cask auctions<br />failed to clear in 2026
          </h1>
        </div>

        {/* ── Stat data bars ─────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
          gap: 1, background: D.border,
        }}>
          {CLEARANCE_STATS.map((s) => (
            <div key={s.year} style={{
              padding: isMobile ? '12px 12px' : '14px 18px',
              background: s.highlight ? '#161410' : D.surface,
            }}>
              <Lbl>{s.year} clearance</Lbl>
              <div style={{
                fontFamily: MONO, fontSize: isMobile ? 26 : 34,
                fontWeight: 400, color: s.highlight ? D.terracotta : D.text,
                lineHeight: 1, letterSpacing: 0, marginBottom: 7,
              }}>
                {s.rate}
              </div>
              <div style={{ marginBottom: 5 }}>
                <Pill bg={s.badgeBg} color={s.badgeColor}>{s.badge}</Pill>
              </div>
              <div style={{ fontSize: 10, fontFamily: MONO, color: D.dim }}>
                {s.yoy}
              </div>
            </div>
          ))}
        </div>

        {/* ── Editorial two-column block ─────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${D.border}`,
          paddingTop: 17, paddingBottom: 24,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? 20 : 48,
        }}>
          <div>
            <Lbl color={D.terracotta}>What this means</Lbl>
            <p style={{ fontSize: 13, fontFamily: SANS, color: D.muted, lineHeight: 1.4, margin: 0 }}>
              The cask market has not functioned as a liquid asset class since Q3 2023. What began as a demand contraction has become structural: the buyer pool that drove 2020–2023 prices has not returned, and current reserve levels reflect expectations set in a different market entirely.
            </p>
          </div>
          <div>
            <Lbl color={D.terracotta}>Key data points</Lbl>
            {[
              ['Average bid–ask gap',              '30%', D.amber      ],
              ['Months since normal function',      '33',  D.dim        ],
              ['Distilleries with zero clearance',  '14',  D.terracotta ],
            ].map(([label, val, valColor]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${D.border}`, padding: '6px 0' }}>
                <span style={{ fontSize: 12, fontFamily: SANS, color: D.dim }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: valColor, flexShrink: 0, marginLeft: 12 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Distillery clearance table ─────────────────────────────────── */}
        <div style={{ paddingBottom: 28 }}>
          <Lbl>Distillery clearance data — Jan–Apr 2026</Lbl>
          <div style={{ border: `1px solid ${D.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: col5, padding: '8px 14px', background: D.alt, gap: 8 }}>
              {['Distillery', 'Listed', 'Sold', 'Clearance', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: SANS, color: D.muted }}>{h}</div>
              ))}
            </div>
            {TABLE_DATA.map((row, i) => {
              const s = sig(row.rate)
              return (
                <div key={row.distillery} style={{
                  display: 'grid', gridTemplateColumns: col5,
                  padding: '9px 14px',
                  background: i % 2 === 0 ? D.bg : D.surface,
                  borderTop: `1px solid ${D.border}`,
                  gap: 8, alignItems: 'center',
                }}>
                  <div style={{ fontSize: 12, fontFamily: SANS, color: D.text }}>{row.distillery}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: D.muted }}>{row.listed}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: D.muted }}>{row.sold}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: s.color }}>{row.rate}</div>
                  <div><Pill bg={s.bg} color={s.color}>{s.label}</Pill></div>
                </div>
              )
            })}
            <div style={{ padding: '7px 14px', background: D.alt, borderTop: `1px solid ${D.border}` }}>
              <span style={{ fontSize: 10, fontFamily: MONO, color: D.dim }}>GWA lot results Jan–Apr 2026. Representative sample. Full dataset for subscribers.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reserve Failure Rate — line chart ──────────────────────────────── */}
      <section style={{ background: D.bg, padding: sp, borderTop: `1px solid ${D.border}`, borderBottom: `1px solid ${D.border}` }}>
        <Lbl>Reserve Failure Rate 2020–2026</Lbl>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 22 : 28, fontWeight: 400, lineHeight: 1.1, color: D.text, letterSpacing: '-0.01em', margin: 0 }}>
            Percentage of cask lots failing to meet reserve at Grand Whisky Auction
          </h2>
          <span style={{ fontFamily: MONO, fontSize: 10, color: D.dim, whiteSpace: 'nowrap' }}>2020 – 2026 YTD</span>
        </div>
        <LineChart />
        <div style={{ marginTop: 14, padding: '10px 14px', background: D.surface, borderLeft: `2px solid ${D.terracotta}` }}>
          <span style={{ fontSize: 12, fontFamily: SANS, color: D.muted, lineHeight: 1.5 }}>
            <span style={{ color: D.text, fontWeight: 500 }}>Signal lead:</span>{' '}Reserve failure rates began rising in 2024 — approximately 5 months before secondary market price declines became visible in bottled whisky data.
          </span>
        </div>
      </section>

      {/* ── Market Status ───────────────────────────────────────────────────── */}
      <section style={{ background: D.bg, padding: sp, borderBottom: `1px solid ${D.border}` }}>
        <Lbl>Current Market Status</Lbl>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 1, background: D.border, marginBottom: 18 }}>
          {[
            { label: 'Market Health',        value: 'Critical', color: D.terracotta },
            { label: 'Reserve Failure Rate', value: '97.9%',    color: D.terracotta },
            { label: 'Last Updated',         value: 'May 2026', color: D.text       },
          ].map(item => (
            <div key={item.label} style={{ padding: isMobile ? '12px 12px' : '14px 18px', background: D.surface }}>
              <Lbl>{item.label}</Lbl>
              <div style={{ fontFamily: MONO, fontSize: isMobile ? 22 : 30, fontWeight: 400, color: item.color, lineHeight: 1, letterSpacing: 0 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', background: D.surface, borderLeft: `2px solid ${D.dim}` }}>
          <Lbl>Leading Indicator</Lbl>
          <p style={{ fontSize: 12, fontFamily: SANS, color: D.muted, lineHeight: 1.5, margin: 0 }}>
            Cask reserve failure rates lead bottled whisky price declines by approximately{' '}
            <span style={{ color: D.text }}>5 months</span>. The failure rate crossed 66% in 2024 — a threshold now reflected in softening secondary market valuations for rare bottles.
          </p>
        </div>
      </section>

      {/* ── Distillery Watchlist ─────────────────────────────────────────────── */}
      <section style={{ background: D.bg, padding: sp, borderBottom: `1px solid ${D.border}` }}>
        <Lbl>Distillery Watchlist</Lbl>
        <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 22 : 28, fontWeight: 400, lineHeight: 1.1, color: D.text, letterSpacing: '-0.01em', marginBottom: 6 }}>
          Liquidity by distillery
        </h2>
        <p style={{ fontSize: 12, fontFamily: SANS, color: D.dim, marginBottom: 14, lineHeight: 1.4 }}>
          Cask market liquidity signals by distillery. Updated monthly.
        </p>
        <div style={{ border: `1px solid ${D.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px', padding: '8px 14px', background: D.alt }}>
            {['Distillery', 'Liquidity', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: D.muted, fontFamily: SANS }}>{h}</div>
            ))}
          </div>
          {[
            { distillery: 'Macallan',         liquidity: 'Stable',   rate: '4.3%'  },
            { distillery: 'Springbank',       liquidity: 'Elevated', rate: '3.2%'  },
            { distillery: 'New distilleries', liquidity: 'Weak',     rate: '0.0%'  },
          ].map((row, i, arr) => {
            const s = sig(row.rate)
            return (
              <div key={row.distillery} style={{
                display: 'grid', gridTemplateColumns: '1fr 130px 100px',
                padding: '9px 14px', alignItems: 'center',
                borderTop: `1px solid ${D.border}`,
                background: i % 2 === 0 ? D.bg : D.surface,
              }}>
                <div style={{ fontSize: 12, fontFamily: SANS, color: D.text }}>{row.distillery}</div>
                <div style={{ fontSize: 12, fontFamily: MONO, color: s.color }}>{row.liquidity}</div>
                <div><Pill bg={s.bg} color={s.color}>{s.label}</Pill></div>
              </div>
            )
          })}
          <div style={{ padding: '7px 14px', background: D.alt, borderTop: `1px solid ${D.border}` }}>
            <span style={{ fontSize: 10, fontFamily: MONO, color: D.dim, fontStyle: 'italic' }}>Full watchlist for subscribers — updated monthly with GWA data</span>
          </div>
        </div>
      </section>

      {/* ── Email Capture ────────────────────────────────────────────────────── */}
      <section style={{ background: D.surface, padding: isMobile ? '36px 16px' : '44px 48px', borderBottom: `1px solid ${D.border}` }}>
        <div style={{ maxWidth: 520 }}>
          <Lbl color={D.terracotta}>Free monthly briefing</Lbl>
          <h2 style={{ fontFamily: DISPLAY, fontSize: isMobile ? 28 : 38, fontWeight: 500, lineHeight: 1.05, color: D.text, letterSpacing: '-0.01em', marginBottom: 10 }}>
            Whisky market<br />intelligence, monthly
          </h2>
          <p style={{ fontSize: 13, fontFamily: SANS, color: D.muted, lineHeight: 1.4, marginBottom: 8 }}>
            Auction liquidity, clearance rates, cask market health.
          </p>
          <div style={{ fontSize: 10, fontFamily: MONO, color: D.dim, letterSpacing: '0.08em', marginBottom: 20 }}>
            Next issue: Whisky Market Pulse — May 2026
          </div>
          {submitted ? (
            <div style={{ padding: '14px 18px', background: 'rgba(74,124,89,0.1)', border: `1px solid rgba(74,124,89,0.25)` }}>
              <div style={{ fontSize: 14, fontFamily: SANS, color: D.green }}>You're on the list.</div>
              <div style={{ fontSize: 12, fontFamily: SANS, color: D.dim, marginTop: 4 }}>We'll send the May issue as soon as it's ready.</div>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email.trim()) setSubmitted(true) }} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
              <input
                type="email" placeholder="your@email.com" value={email} required
                onChange={e => setEmail(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', background: D.bg, border: `1px solid ${D.border}`, fontSize: 13, fontFamily: MONO, color: D.text, outline: 'none' }}
              />
              <button type="submit" style={{ padding: '10px 22px', background: D.terracotta, color: D.text, border: 'none', fontSize: 9, fontFamily: SANS, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Join free
              </button>
            </form>
          )}
          <p style={{ fontSize: 11, fontFamily: SANS, color: D.dim, marginTop: 10 }}>No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ── SEO ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: D.bg, padding: sp, borderBottom: `1px solid ${D.border}` }}>
        <Lbl>Market Context</Lbl>
        <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 22 : 28, fontWeight: 400, lineHeight: 1.1, color: D.text, letterSpacing: '-0.01em', marginBottom: 18 }}>
          Is the whisky cask investment market broken?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SEO_SECTIONS.map((s, i) => (
            <div key={i} style={{ paddingTop: 16, paddingBottom: 16, borderBottom: `1px solid ${D.border}` }}>
              <h3 style={{ fontFamily: SERIF, fontSize: isMobile ? 16 : 18, fontWeight: 400, color: D.text, marginBottom: 7, lineHeight: 1.3 }}>{s.heading}</h3>
              <p style={{ fontSize: 12, fontFamily: SANS, color: D.muted, lineHeight: 1.6, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, fontFamily: MONO, color: D.dim, marginTop: 16, lineHeight: 1.55 }}>
          Data source: Grand Whisky Auction completed lot results, 2020–2026. Analysis by The Bottle Keep. Updated monthly. Not investment advice.
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: D.surface, padding: isMobile ? '18px 16px' : '22px 48px', borderTop: `1px solid ${D.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: D.dim }}>The Bottle Keep</span>
          <p style={{ fontSize: 10, fontFamily: MONO, color: D.dim, margin: 0 }}>Market data updated monthly. Not investment advice.</p>
        </div>
      </footer>
    </Layout>
  )
}

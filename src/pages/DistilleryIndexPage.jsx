import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'
import { supabase } from '../supabase'

const SANS    = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO    = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"
const SERIF   = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const DISPLAY = "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif"

const C = {
  bg:         '#FAFAF7',
  rowAlt:     '#F5F2EC',
  dark:       '#1A1A18',
  stone:      '#B8A882',
  muted:      '#9A9080',
  ink:        '#4A4540',
  border:     '#E8E4DC',
  borderMid:  '#D8D2C8',
  terracotta: '#7A3328',
}

const SIGNALS = [
  { color: '#8B3A2A', label: '0% No sales'          },
  { color: '#A0522D', label: 'Under 5% Critical'     },
  { color: '#C4892A', label: 'Under 10% Distressed'  },
  { color: '#B8A882', label: 'Under 20% Weak'        },
  { color: '#4A7C59', label: '20%+ Functioning'      },
]

function clearanceColor(rate) {
  if (rate === 0)  return '#8B3A2A'
  if (rate <= 5)   return '#A0522D'
  if (rate <= 10)  return '#C4892A'
  if (rate <= 20)  return '#B8A882'
  return '#4A7C59'
}

const TABLE_DATA = [
  { distillery: 'GlenAllachie', region: 'Speyside',    listed: 23, sold: 0, clearance: 0.0,  bidAsk: 35 },
  { distillery: 'Glen Scotia',  region: 'Campbeltown', listed: 28, sold: 0, clearance: 0.0,  bidAsk: 38 },
  { distillery: 'Bowmore',      region: 'Islay',       listed: 22, sold: 0, clearance: 0.0,  bidAsk: 42 },
  { distillery: 'Springbank',   region: 'Campbeltown', listed: 31, sold: 1, clearance: 3.2,  bidAsk: 28 },
  { distillery: 'Macallan',     region: 'Speyside',    listed: 47, sold: 2, clearance: 4.3,  bidAsk: 31 },
  { distillery: 'Ardbeg',       region: 'Islay',       listed: 19, sold: 1, clearance: 5.3,  bidAsk: 27 },
  { distillery: 'Dalmore',      region: 'Highlands',   listed: 18, sold: 1, clearance: 5.6,  bidAsk: 33 },
  { distillery: 'Glenfarclas',  region: 'Speyside',    listed: 15, sold: 1, clearance: 6.7,  bidAsk: 29 },
  { distillery: 'Glengoyne',    region: 'Highlands',   listed: 12, sold: 1, clearance: 8.3,  bidAsk: 25 },
  { distillery: 'Tomatin',      region: 'Highlands',   listed:  9, sold: 1, clearance: 11.1, bidAsk: 22 },
]

const COLUMNS = [
  { key: 'distillery', label: 'Distillery',     numeric: false },
  { key: 'region',     label: 'Region',         numeric: false },
  { key: 'listed',     label: 'Casks Listed',   numeric: true  },
  { key: 'sold',       label: 'Sold',           numeric: true  },
  { key: 'clearance',  label: 'Clearance Rate', numeric: true  },
  { key: 'bidAsk',     label: 'Bid–Ask Gap',    numeric: true  },
]

const TITLE       = 'Whisky Distillery Liquidity Index — The Bottle Keep'
const DESCRIPTION = '10 Scottish distilleries tracked by cask clearance rate. GlenAllachie, Bowmore, and Glen Scotia showing 0% clearance in 2026.'

const STATS = [
  { label: 'Distilleries Tracked',      value: '10',   descriptor: 'Cask lots tracked Jan–Apr 2026'           },
  { label: 'Average Clearance Rate',    value: '4.5%', descriptor: 'Across all tracked distilleries, YTD'     },
  { label: 'Distilleries with Zero Sales', value: '3', descriptor: 'No lots sold at auction in Jan–Apr 2026'  },
]

export default function DistilleryIndexPage() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [sort, setSort]         = useState({ col: 'clearance', dir: 'asc' })
  const [mailEmail, setMailEmail] = useState('')
  const [mailDone, setMailDone]   = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function handleMailSubmit(e) {
    e.preventDefault()
    if (!mailEmail.includes('@')) return
    await supabase.from('mailing_list').upsert({ email: mailEmail }, { onConflict: 'email', ignoreDuplicates: true })
    setMailDone(true)
  }

  function handleSort(col) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    )
  }

  const isNumeric = (col) => COLUMNS.find(c => c.key === col)?.numeric

  const sortedData = [...TABLE_DATA].sort((a, b) => {
    const mul = sort.dir === 'asc' ? 1 : -1
    return isNumeric(sort.col)
      ? mul * (a[sort.col] - b[sort.col])
      : mul * a[sort.col].localeCompare(b[sort.col])
  })

  return (
    <Layout>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.thebottlekeep.co.uk/distillery-index" />
      </Helmet>

      <section style={{ background: C.bg, padding: isMobile ? '40px 24px 64px' : '56px 48px 80px' }}>

        {/* Header */}
        <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.terracotta, fontWeight: 400, marginBottom: 14 }}>
          Whisky Cask Market Intelligence — Jan–Apr 2026
        </div>
        <h1 style={{ fontFamily: DISPLAY, fontSize: isMobile ? 38 : 52, fontWeight: 500, lineHeight: 1.05, color: C.dark, letterSpacing: '-0.01em', margin: '0 0 12px', hyphens: 'none' }}>
          Distillery Index
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 300, color: C.muted, margin: '0 0 48px', lineHeight: 1.5 }}>
          Clearance rates across Scottish distilleries tracked at auction, updated monthly.
        </p>

        {/* Stat blocks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 48,
        }}>
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{
              padding: isMobile ? '18px 12px 18px 16px' : '24px 0 24px 32px',
              borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: SANS, color: C.stone, fontWeight: 400, marginBottom: 10 }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: MONO, fontSize: isMobile ? 28 : 42, fontWeight: 400, color: C.dark, lineHeight: 1, letterSpacing: 0, marginBottom: 6 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, fontFamily: SANS, fontWeight: 300, color: C.muted, lineHeight: 1.45 }}>
                {stat.descriptor}
              </div>
            </div>
          ))}
        </div>

        {/* Colour legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '8px 16px' : '0 22px', alignItems: 'center', marginBottom: 10 }}>
          {SIGNALS.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 1, background: s.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.ink, fontWeight: 400 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <div style={{ minWidth: 560 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.4fr 100px 60px 130px 110px',
              borderBottom: `1px solid ${C.borderMid}`,
              paddingBottom: 10,
            }}>
              {COLUMNS.map(col => (
                <button
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4,
                    justifyContent: col.numeric ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span style={{
                    fontFamily: SANS, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: sort.col === col.key ? C.terracotta : C.stone, fontWeight: 400,
                  }}>
                    {col.label}
                  </span>
                  {sort.col === col.key && (
                    <span style={{ color: C.terracotta, fontSize: 10, lineHeight: 1 }}>
                      {sort.dir === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {sortedData.map((row, i) => (
              <div key={row.distillery} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.4fr 100px 60px 130px 110px',
                padding: '11px 0',
                background: i % 2 === 0 ? C.bg : C.rowAlt,
                borderBottom: `1px solid ${C.border}`,
                alignItems: 'center',
              }}>
                <div style={{ fontFamily: SANS, fontSize: 13, color: C.dark, fontWeight: 400, padding: '0 8px' }}>{row.distillery}</div>
                <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted, fontWeight: 300, padding: '0 8px' }}>{row.region}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.ink, textAlign: 'right', padding: '0 8px' }}>{row.listed}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.ink, textAlign: 'right', padding: '0 8px' }}>{row.sold}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: clearanceColor(row.clearance), textAlign: 'right', padding: '0 8px' }}>
                  {row.clearance.toFixed(1)}%
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.ink, textAlign: 'right', padding: '0 8px' }}>{row.bidAsk}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div style={{ border: `1px solid ${C.border}`, padding: isMobile ? '20px' : '22px 28px', marginBottom: 52 }}>
          <div style={{ fontFamily: SANS, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.terracotta, fontWeight: 400, marginBottom: 10 }}>
            Data Source
          </div>
          <p style={{ fontFamily: SANS, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
            Analysis covers cask lots listed at Grand Whisky Auction, January–April 2026. Bottle auction data excluded. Reserve not met lots counted as unsold. Data updated monthly.
          </p>
        </div>

        {/* Email capture */}
        <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: isMobile ? '28px 0' : '32px 0', marginBottom: 52 }}>
          {mailDone ? (
            <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 400, color: C.dark, fontStyle: 'italic' }}>
              You'll be notified when June data publishes.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 24 : 48, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.terracotta, fontFamily: SANS, fontWeight: 400, marginBottom: 12 }}>
                  Stay updated
                </div>
                <div style={{ fontFamily: SERIF, fontSize: isMobile ? 20 : 24, fontWeight: 400, color: C.dark, marginBottom: 8, lineHeight: 1.15 }}>
                  This index updates monthly.
                </div>
                <div style={{ fontSize: 13, color: C.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.6 }}>
                  Get notified when June 2026 data publishes.
                </div>
              </div>
              <form onSubmit={handleMailSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'stretch' : 'flex-end', gap: 10 }}>
                <input
                  type="email" value={mailEmail} onChange={e => setMailEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: `1px solid ${C.borderMid}`, borderRadius: 0, fontSize: 14, fontFamily: SANS, fontWeight: 300, color: C.dark, background: C.bg, outline: 'none' }}
                />
                <button type="submit" style={{ display: 'block', width: '100%', padding: '13px 28px', background: C.dark, color: '#F5F2EC', border: 'none', borderRadius: 0, fontSize: 10, fontFamily: SANS, fontWeight: 400, cursor: 'pointer', letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Notify me
                </button>
              </form>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{
          borderTop: `1px solid ${C.border}`,
          paddingTop: 40,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 22 : 28, fontWeight: 400, lineHeight: 1.1, color: C.dark, letterSpacing: '-0.01em', margin: '0 0 8px' }}>
              What is your cask worth in this market?
            </h2>
            <p style={{ fontFamily: SANS, fontSize: 13, color: C.muted, fontWeight: 300, margin: 0, lineHeight: 1.5 }}>
              Independent valuation calibrated to current auction clearance data.
            </p>
          </div>
          <Link
            to="/cask-valuation"
            style={{
              display: 'inline-flex', alignItems: 'center', flexShrink: 0,
              padding: '13px 28px',
              background: C.dark, color: '#F5F2EC',
              textDecoration: 'none',
              fontFamily: SANS, fontSize: 10, fontWeight: 400,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Run a free valuation
          </Link>
        </div>

      </section>
    </Layout>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { estimateBottleValue, extractDistilleryFromTitle } from '../lib/bottleValuation'
import { KNOWN_DISTILLERIES } from '../lib/caskValuation'

const C = {
  dark: '#1a1208', amber: '#b8882a', muted: '#a09080',
  border: '#f0ebe2', borderMid: '#ede5d8', bg: '#f7f4f0',
  white: '#fff', ink: '#5a4a35', navy: '#0f0a04',
  green: '#2d6a4f', greenBg: '#f0fdf4',
}

function fmt(n) {
  if (n == null || n <= 0) return '—'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: C.muted, fontFamily: 'monospace', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function MetaPill({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.muted, fontFamily: 'monospace', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: C.ink }}>{value}</div>
    </div>
  )
}

const INPUT_STYLE = {
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  border: `1px solid #ede5d8`, borderRadius: 3,
  fontSize: 13, fontFamily: 'Ronzino, sans-serif', color: '#1a1208',
  background: '#fff', outline: 'none',
}

const DROPDOWN_STYLE = {
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 120,
  background: '#fff', border: `1px solid #ede5d8`,
  borderTop: 'none', borderRadius: '0 0 3px 3px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  maxHeight: 300, overflowY: 'auto',
}

export default function BottleValuator({ isMobile }) {
  // ── Search mode state ─────────────────────────────────────
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState(null)
  const [comps, setComps] = useState([])
  const [auctionSales, setAuctionSales] = useState([])  // real WA hammer prices

  // ── Estimate mode state ───────────────────────────────────
  const [mode, setMode] = useState('search')
  const [estDistillery, setEstDistillery] = useState('')
  const [estDistQuery, setEstDistQuery] = useState('')
  const [showEstDist, setShowEstDist] = useState(false)
  const [estAge, setEstAge] = useState('')
  const [estSize, setEstSize] = useState('700')
  const [estResult, setEstResult] = useState(null)

  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
        setShowEstDist(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const search = useCallback(async (q) => {
    if (q.length < 3) { setResults([]); setShowDropdown(false); return }
    setSearching(true)
    const { data } = await supabase
      .from('whiskies')
      .select('id, title, distillery, age, abv, price_gbp, score, whiskybase_id')
      .ilike('title', `%${q}%`)
      .not('price_gbp', 'is', null)
      .gt('price_gbp', 0)
      .order('score', { ascending: false, nullsFirst: false })
      .limit(8)
    setResults(data ?? [])
    setShowDropdown(true)
    setSearching(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
  }, [query, search])

  async function selectBottle(bottle) {
    setSelected(bottle)
    setShowDropdown(false)
    setQuery(bottle.title)
    setAuctionSales([])

    const distKey = extractDistilleryFromTitle(bottle.title, KNOWN_DISTILLERIES)

    const [compsResult, auctionResult] = await Promise.all([
      distKey
        ? supabase
            .from('whiskies')
            .select('id, title, age, abv, price_gbp, score')
            .ilike('title', `%${distKey}%`)
            .neq('id', bottle.id)
            .not('price_gbp', 'is', null)
            .gt('price_gbp', 0)
            .order('score', { ascending: false, nullsFirst: false })
            .limit(5)
        : Promise.resolve({ data: [] }),
      supabase
        .from('auction_sales')
        .select('hammer_price, sale_date, lot_number, lot_url')
        .eq('bottle_id', bottle.id)
        .eq('result_status', 'sold')
        .not('hammer_price', 'is', null)
        .order('sale_date', { ascending: false, nullsFirst: true })
        .limit(12),
    ])

    setComps(compsResult.data ?? [])
    setAuctionSales(auctionResult.error ? [] : (auctionResult.data ?? []))
  }

  function runEstimate() {
    if (!estDistillery) return
    setEstResult(estimateBottleValue({
      distillery: estDistillery,
      age: estAge ? parseInt(estAge) : null,
      sizeMl: parseInt(estSize),
    }))
  }

  const filteredDist = estDistQuery
    ? KNOWN_DISTILLERIES.filter(d => d.toLowerCase().includes(estDistQuery.toLowerCase())).slice(0, 8)
    : []

  return (
    <div ref={containerRef}>
      {/* ── Mode tabs ── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.borderMid}`, marginBottom: 24 }}>
        {[['search', 'Find my bottle'], ['estimate', 'Estimate manually']].map(([m, label]) => (
          <button key={m}
            onClick={() => { setMode(m); setEstResult(null); setSelected(null); setQuery(''); setResults([]) }}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              fontSize: 12, letterSpacing: '0.06em',
              fontFamily: 'Ronzino, sans-serif', background: 'none',
              color: mode === m ? C.amber : C.muted,
              borderBottom: `2px solid ${mode === m ? C.amber : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          SEARCH MODE
          ══════════════════════════════════════════════════════ */}
      {mode === 'search' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <input
              type="text"
              placeholder="Type a bottle name, distillery, or expression…"
              value={query}
              onChange={e => { setQuery(e.target.value); if (selected) setSelected(null) }}
              onFocus={() => results.length && setShowDropdown(true)}
              style={{ ...INPUT_STYLE, fontSize: 14, padding: '12px 16px' }}
            />
            {searching && (
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.muted }}>
                searching…
              </div>
            )}

            {/* Results dropdown */}
            {showDropdown && results.length > 0 && (
              <div style={DROPDOWN_STYLE}>
                {results.map((r, i) => (
                  <button key={r.id}
                    onMouseDown={() => selectBottle(r)}
                    style={{
                      display: 'block', width: '100%', padding: '11px 16px',
                      border: 'none',
                      borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : 'none',
                      background: C.white, cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Ronzino, sans-serif',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = C.white}
                  >
                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500, marginBottom: 3 }}>
                      {r.title}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.muted }}>
                      {r.age != null && <span>{r.age}yr</span>}
                      {r.abv != null && <span>{r.abv}%</span>}
                      {r.price_gbp > 0 && (
                        <span style={{ color: C.amber, fontFamily: 'monospace', fontWeight: 600 }}>
                          {fmt(r.price_gbp)}
                        </span>
                      )}
                      {r.score != null && (
                        <span style={{ color: C.ink }}>{r.score.toFixed(1)} ★</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && results.length === 0 && query.length >= 3 && !searching && (
              <div style={{
                ...DROPDOWN_STYLE,
                padding: '14px 16px', fontSize: 13, color: C.muted,
              }}>
                No bottles found —{' '}
                <button
                  onMouseDown={() => setMode('estimate')}
                  style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'Ronzino, sans-serif' }}
                >
                  try the estimate tool
                </button>
              </div>
            )}
          </div>

          {/* ── Selected bottle detail ── */}
          {selected && (
            <div>
              {/* Navy price panel */}
              <div style={{
                background: C.navy, borderRadius: 3,
                padding: isMobile ? '24px 20px' : '28px 30px',
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(184,136,42,0.75)', fontFamily: 'monospace', marginBottom: 10 }}>
                  Secondary market price
                </div>
                <div style={{ fontSize: isMobile ? 38 : 50, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1, color: C.amber, marginBottom: 8 }}>
                  {fmt(selected.price_gbp)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: selected.score ? 20 : 0 }}>
                  Per bottle · 700ml · Whiskybase marketplace data
                </div>
                {selected.score != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', marginBottom: 4 }}>
                        Whiskybase score
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>
                        {selected.score.toFixed(1)}
                        <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/5</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottle metadata */}
              <div style={{
                background: C.white, border: `1px solid ${C.borderMid}`, borderRadius: 3,
                padding: '18px 20px', marginBottom: 14,
              }}>
                <Label>Bottle details</Label>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 14, lineHeight: 1.35 }}>
                  {selected.title}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 16 : 28 }}>
                  {selected.age != null && <MetaPill label="Age" value={`${selected.age} year old`} />}
                  {selected.abv != null && <MetaPill label="ABV" value={`${selected.abv}%`} />}
                  <MetaPill label="Size" value="700ml" />
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                  Price reflects secondary market transactions and shop listings aggregated on Whiskybase. Updated May 2026. Not a guaranteed offer.
                </div>
              </div>

              {/* Auction hammer prices */}
              {auctionSales.length > 0 && (
                <div style={{
                  background: C.white, border: `1px solid ${C.borderMid}`, borderRadius: 3,
                  padding: '18px 20px', marginBottom: 14,
                }}>
                  <Label>Auction hammer prices — Whisky Auctioneer</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 16px' }}>
                    {['Lot', 'Date', 'Hammer'].map(h => (
                      <div key={h} style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontFamily: 'monospace', paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                        {h}
                      </div>
                    ))}
                    {auctionSales.map((s, i) => (
                      <>
                        <div key={`lot-${i}`} style={{ padding: '9px 0', borderBottom: i < auctionSales.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 12, color: C.ink }}>
                          {s.lot_url
                            ? <a href={s.lot_url} target="_blank" rel="noopener noreferrer" style={{ color: C.amber, textDecoration: 'none' }}>#{s.lot_number ?? 'view'}</a>
                            : (s.lot_number ? `#${s.lot_number}` : '—')
                          }
                        </div>
                        <div key={`date-${i}`} style={{ padding: '9px 0', borderBottom: i < auctionSales.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>
                          {s.sale_date ? new Date(s.sale_date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : '—'}
                        </div>
                        <div key={`price-${i}`} style={{ padding: '9px 0', borderBottom: i < auctionSales.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: C.dark, textAlign: 'right' }}>
                          {fmt(s.hammer_price)}
                        </div>
                      </>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparables */}
              {comps.length > 0 && (
                <div style={{
                  background: C.white, border: `1px solid ${C.borderMid}`, borderRadius: 3,
                  padding: '18px 20px',
                }}>
                  <Label>Other bottles from the same distillery</Label>
                  {comps.map((c, i) => (
                    <div key={c.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < comps.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <div style={{ fontSize: 13, color: C.dark, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          {[c.age && `${c.age}yr`, c.abv && `${c.abv}%`].filter(Boolean).join(' · ')}
                          {c.score != null && ` · ${c.score.toFixed(1)} ★`}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: C.amber, whiteSpace: 'nowrap' }}>
                        {fmt(c.price_gbp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prompt to search */}
          {!selected && query.length < 3 && (
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
              Search across{' '}
              <span style={{ color: C.dark, fontWeight: 500 }}>5,000+ bottles</span>
              {' '}with secondary market prices from Whiskybase — including standard releases, distillery exclusives, and independent bottlings.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ESTIMATE MODE
          ══════════════════════════════════════════════════════ */}
      {mode === 'estimate' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 120px 120px',
            gap: 12, marginBottom: 20,
          }}>
            {/* Distillery */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace', color: C.muted, display: 'block', marginBottom: 6 }}>
                Distillery
              </label>
              <input
                type="text"
                placeholder="e.g. Macallan"
                value={estDistillery || estDistQuery}
                onChange={e => { setEstDistQuery(e.target.value); setEstDistillery(''); setShowEstDist(true) }}
                onFocus={() => { if (estDistQuery) setShowEstDist(true) }}
                style={INPUT_STYLE}
              />
              {showEstDist && filteredDist.length > 0 && (
                <div style={{ ...DROPDOWN_STYLE }}>
                  {filteredDist.map((d, i) => (
                    <button key={d}
                      onMouseDown={() => { setEstDistillery(d); setEstDistQuery(d); setShowEstDist(false) }}
                      style={{
                        display: 'block', width: '100%', padding: '9px 14px',
                        border: 'none',
                        borderBottom: i < filteredDist.length - 1 ? `1px solid ${C.border}` : 'none',
                        background: C.white, cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontFamily: 'Ronzino, sans-serif', color: C.dark,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = C.white}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Age */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace', color: C.muted, display: 'block', marginBottom: 6 }}>
                Age (yr)
              </label>
              <input
                type="number" min="1" max="60" placeholder="NAS"
                value={estAge}
                onChange={e => setEstAge(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            {/* Size */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace', color: C.muted, display: 'block', marginBottom: 6 }}>
                Size
              </label>
              <select
                value={estSize}
                onChange={e => setEstSize(e.target.value)}
                style={{ ...INPUT_STYLE, appearance: 'none', cursor: 'pointer' }}
              >
                {[['50','50ml'],['200','200ml'],['350','350ml'],['500','500ml'],['700','700ml'],['750','750ml'],['1000','1L']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={runEstimate}
            disabled={!estDistillery}
            style={{
              padding: '12px 28px',
              background: estDistillery ? C.amber : C.muted,
              color: '#fff', border: 'none', borderRadius: 3, fontSize: 13,
              fontFamily: 'Ronzino, sans-serif', fontWeight: 500,
              cursor: estDistillery ? 'pointer' : 'not-allowed',
              letterSpacing: '0.04em', marginBottom: 24,
            }}
          >
            Estimate value
          </button>

          {estResult && (
            <div>
              {/* Navy value panel */}
              <div style={{
                background: C.navy, borderRadius: 3,
                padding: isMobile ? '24px 20px' : '28px 30px',
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(184,136,42,0.75)', fontFamily: 'monospace', marginBottom: 10 }}>
                  Estimated secondary market value
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: isMobile ? 38 : 50, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-0.02em', color: C.amber, lineHeight: 1 }}>
                    {fmt(estResult.secondary)}
                  </span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.30)' }}>
                    {estResult.sizeMl}ml
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 22 }}>
                  Range: {fmt(estResult.p20)} – {fmt(estResult.p80)} · {estResult.confidence} confidence
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)',
                  gap: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.07)',
                }}>
                  {[
                    { label: 'Est. RRP', value: fmt(estResult.rrp) },
                    { label: estResult.premiumPct >= 0 ? 'Secondary premium' : 'Secondary discount', value: `${estResult.premiumPct >= 0 ? '+' : ''}${estResult.premiumPct}%` },
                    { label: 'Normalised market est.', value: fmt(estResult.recovery) },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', marginBottom: 6 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: '#fff' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Context card */}
              <div style={{
                background: C.white, border: `1px solid ${C.borderMid}`, borderRadius: 3,
                padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 20 : 32, marginBottom: 14 }}>
                  <div>
                    <Label>Tier</Label>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{estResult.tierLabel}</div>
                  </div>
                  <div>
                    <Label>Bottle liquidity</Label>
                    <div style={{ fontSize: 14, color: C.green }}>{estResult.liquidityLabel}</div>
                  </div>
                  <div>
                    <Label>Model confidence</Label>
                    <div style={{ fontSize: 14, color: C.dark }}>{estResult.confidence}</div>
                  </div>
                </div>
                <div style={{ paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                  Model estimate based on distillery tier, age, and current bottle market conditions (May 2026).
                  The bottle market remains more liquid than the cask market — secondary premiums are compressed
                  from 2022 highs but have not collapsed. ±{estResult.uncertainty}% uncertainty.
                  For a more accurate figure, use the bottle finder above.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

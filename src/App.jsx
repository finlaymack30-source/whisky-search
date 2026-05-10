import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from './supabase'
import WhiskyCard from './components/WhiskyCard'

const SLIDE_DURATION = 10000

const SLIDE_THEMES = [
  { bg: '#0c1209', glow: '#162e12' },
  { bg: '#090c14', glow: '#0f1a2e' },
  { bg: '#130d06', glow: '#2e1c0a' },
  { bg: '#100a12', glow: '#20122a' },
  { bg: '#0a100d', glow: '#142818' },
]

const NAV_ITEMS = [
  { label: 'All', value: 'All' },
  { label: 'Single Malts', value: 'Single Malt' },
  { label: 'Blends', value: 'Blend' },
  { label: 'Bourbon & Rye', value: 'Bourbon' },
  { label: 'Regions', value: 'Region' },
  { label: 'Distilleries', value: 'Distillery' },
]

const REGIONS = [
  'Speyside', 'Highland', 'Islay', 'Islands', 'Campbeltown', 'Lowland',
  'Irish', 'Japanese', 'American', 'Taiwan', 'Australian', 'Indian',
  'Danish', 'English', 'Swedish', 'Welsh', 'Blended Scotch',
]

const SORT_OPTIONS = [
  { label: 'Score: High → Low', value: 'score-desc' },
  { label: 'Score: Low → High', value: 'score-asc' },
  { label: 'Price: Low → High', value: 'price-asc' },
  { label: 'Price: High → Low', value: 'price-desc' },
  { label: 'Name: A → Z', value: 'name-asc' },
]

const SCORE_OPTIONS = [
  { label: 'Any', value: null },
  { label: '3.5+', value: 3.5 },
  { label: '4.0+', value: 4.0 },
  { label: '4.5+', value: 4.5 },
]

const PRICE_OPTIONS = [
  { label: 'Any', value: null },
  { label: 'Under £50', value: [0, 50] },
  { label: '£50–100', value: [50, 100] },
  { label: '£100–200', value: [100, 200] },
  { label: '£200+', value: [200, Infinity] },
]

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 11, padding: '4px 10px', borderRadius: 2,
      border: active ? '1px solid #b8882a' : '1px solid #e0d8cc',
      background: active ? '#fdf5e8' : '#fff',
      color: active ? '#8a5c10' : '#6b5a42',
      cursor: 'pointer', fontFamily: 'Ronzino, sans-serif',
      fontWeight: active ? 500 : 400, transition: 'all 0.15s',
    }}>{label}</button>
  )
}

function SortDropdown({ open, value, onChange }) {
  if (!open) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
      background: '#fff', border: '1px solid #ede5d8', borderRadius: 4,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)', minWidth: 200,
      fontFamily: 'Ronzino, sans-serif', overflow: 'hidden',
    }}>
      {SORT_OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 16px', background: 'none', border: 'none',
          borderBottom: '1px solid #f7f4f0', cursor: 'pointer', fontSize: 12,
          color: '#1a1208', textAlign: 'left', fontFamily: 'Ronzino, sans-serif',
          backgroundColor: value === opt.value ? '#f7f4f0' : 'transparent',
          fontWeight: value === opt.value ? 500 : 400,
        }}>
          {opt.label}
          {value === opt.value && <span style={{ color: '#b8882a' }}>✓</span>}
        </button>
      ))}
    </div>
  )
}

function FilterDropdown({ open, regions, minScore, priceRange, onRegionToggle, onScoreChange, onPriceChange, onClear, activeCount }) {
  if (!open) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
      background: '#fff', border: '1px solid #ede5d8', borderRadius: 4,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)', width: 300,
      fontFamily: 'Ronzino, sans-serif',
    }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f0e8da' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#a09080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Region</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {REGIONS.map(r => <Chip key={r} label={r} active={regions.has(r)} onClick={() => onRegionToggle(r)} />)}
        </div>
      </div>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #f0e8da' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#a09080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Min Score</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {SCORE_OPTIONS.map(opt => <Chip key={String(opt.value)} label={opt.label} active={minScore === opt.value} onClick={() => onScoreChange(opt.value)} />)}
        </div>
      </div>
      <div style={{ padding: '14px 18px 12px', borderBottom: activeCount > 0 ? '1px solid #f0e8da' : 'none' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#a09080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Price</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {PRICE_OPTIONS.map(opt => <Chip key={String(opt.value)} label={opt.label} active={JSON.stringify(priceRange) === JSON.stringify(opt.value)} onClick={() => onPriceChange(opt.value)} />)}
        </div>
      </div>
      {activeCount > 0 && (
        <div style={{ padding: '12px 18px' }}>
          <button onClick={onClear} style={{
            width: '100%', padding: '8px', border: '1px solid #e0d8cc', borderRadius: 3,
            background: '#fff', color: '#6b5a42', fontSize: 11, cursor: 'pointer',
            fontFamily: 'Ronzino, sans-serif',
          }}>Clear all filters</button>
        </div>
      )}
    </div>
  )
}

function CarouselHero({ whiskies }) {
  const [slide, setSlide] = useState(0)
  const [fading, setFading] = useState(false)
  const [imgErrors, setImgErrors] = useState(new Set())

  const featured = useMemo(() => {
    if (!whiskies.length) return []
    const sanaig = whiskies.find(w => w.title?.toLowerCase().includes('sanaig'))
    const seenDistilleries = new Set()
    const seenRegions = new Set()
    const results = []

    // Exclude American region, cap at £400, require image + tasting note
    const pool = [...whiskies]
      .filter(w => w.image_url && w.tasting_note && w.region !== 'American' && (!w.price_gbp || w.price_gbp <= 400))
      .sort((a, b) => b.score - a.score)

    // Force Kilchoman Sanaig in first
    if (sanaig?.image_url && sanaig?.tasting_note) {
      results.push(sanaig)
      seenDistilleries.add(sanaig.distillery)
      seenRegions.add(sanaig.region)
    }

    // Fill remaining slots — one per distillery, one per region
    for (const w of pool) {
      if (results.length >= 5) break
      if (seenDistilleries.has(w.distillery) || seenRegions.has(w.region)) continue
      results.push(w)
      seenDistilleries.add(w.distillery)
      seenRegions.add(w.region)
    }

    return results
  }, [whiskies])

  const goTo = (i) => {
    if (i === slide || fading) return
    setFading(true)
    setTimeout(() => { setSlide(i); setFading(false) }, 420)
  }

  useEffect(() => {
    if (featured.length < 2) return
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setSlide(i => (i + 1) % featured.length)
        setFading(false)
      }, 420)
    }, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [featured.length])

  if (!featured.length) return null

  const w = featured[slide]
  const theme = SLIDE_THEMES[slide % SLIDE_THEMES.length]
  const showImg = w.image_url && !imgErrors.has(w.id)

  return (
    <div style={{
      height: '88vh', position: 'relative', overflow: 'hidden',
      background: theme.bg,
      transition: 'background 0.8s ease',
    }}>
      {/* Radial glow — shifts colour per theme */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 70% 52%, ${theme.glow} 0%, ${theme.bg} 60%)`,
        transition: 'background 0.8s ease',
      }} />

      {/* Slide content */}
      <div style={{
        position: 'relative', zIndex: 1, display: 'flex',
        height: '100%', width: '100%',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.42s ease',
      }}>
        {/* Left — text */}
        <div style={{
          flex: '0 0 52%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '90px 64px 72px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22,
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: 'Ronzino, sans-serif',
          }}>
            <span style={{ color: '#c8a96e', fontWeight: 500 }}>{String(slide + 1).padStart(2, '0')}</span>
            <span style={{ color: '#3d3020' }}>·</span>
            <span style={{ color: '#7a6a52' }}>{w.region}</span>
          </div>

          <div style={{
            fontSize: 50, fontWeight: 700, color: '#f5e6c8', lineHeight: 1.06,
            marginBottom: 14, fontFamily: 'Ronzino, sans-serif', letterSpacing: '-0.5px',
          }}>
            {w.title}
          </div>

          <div style={{
            fontSize: 11, color: '#7a6a52', marginBottom: 30,
            letterSpacing: '0.08em', fontFamily: 'Ronzino, sans-serif',
          }}>
            {w.distillery}
            {w.age ? ` · ${w.age} Year Old` : ''}
            {w.abv ? ` · ${w.abv}%` : ''}
          </div>

          {w.tasting_note && (
            <div style={{
              fontSize: 14, color: '#9a8878', lineHeight: 1.85,
              fontStyle: 'italic', marginBottom: 38, maxWidth: 390,
              fontFamily: 'Ronzino, sans-serif',
            }}>
              "{w.tasting_note.length > 180 ? w.tasting_note.slice(0, 177) + '…' : w.tasting_note}"
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 50 }}>
            {w.price_gbp && (
              <span style={{ fontSize: 26, fontWeight: 500, color: '#c8a96e', fontFamily: 'Ronzino, sans-serif' }}>
                £{w.price_gbp}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16, color: '#c8a96e' }}>★</span>
              <span style={{ fontSize: 17, fontWeight: 500, color: '#f5e6c8', fontFamily: 'Ronzino, sans-serif' }}>{w.score}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {featured.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: slide === i ? 28 : 6, height: 6, borderRadius: 3,
                background: slide === i ? '#c8a96e' : '#2e2416',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'width 0.35s ease, background 0.35s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Right — bottle */}
        <div style={{
          flex: '0 0 48%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', paddingTop: 50, paddingBottom: 30,
        }}>
          {showImg && (
            <img
              src={w.image_url}
              alt={w.title}
              onError={() => setImgErrors(prev => new Set([...prev, w.id]))}
              style={{
                height: '82%', maxWidth: '84%', objectFit: 'contain',
                filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.7))',
              }}
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div key={`pb-${slide}`} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, background: 'rgba(200,169,110,0.12)', zIndex: 2,
      }}>
        <div style={{
          height: '100%', background: '#c8a96e',
          animation: `slideProgress ${SLIDE_DURATION}ms linear forwards`,
        }} />
      </div>
    </div>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [activeNav, setActiveNav] = useState('All')
  const [saved, setSaved] = useState(new Set())
  const [whiskies, setWhiskies] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [showSort, setShowSort] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [sortBy, setSortBy] = useState('score-desc')
  const [filterRegions, setFilterRegions] = useState(new Set())
  const [filterMinScore, setFilterMinScore] = useState(null)
  const [filterPriceRange, setFilterPriceRange] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)

  const sortRef = useRef(null)
  const filterRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('whiskies').select('*').limit(364)
      if (!error) setWhiskies(data)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > window.innerHeight - 70)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false)
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleSave = (id) => setSaved(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleRegion = (r) => setFilterRegions(prev => {
    const next = new Set(prev)
    next.has(r) ? next.delete(r) : next.add(r)
    return next
  })

  const clearFilters = () => {
    setFilterRegions(new Set())
    setFilterMinScore(null)
    setFilterPriceRange(null)
  }

  const activeFilterCount = filterRegions.size + (filterMinScore ? 1 : 0) + (filterPriceRange ? 1 : 0)

  const filtered = whiskies
    .filter(w => {
      if (activeNav !== 'All' && activeNav !== 'Region' && activeNav !== 'Distillery' && w.type !== activeNav) return false
      if (query && ![w.title, w.distillery, w.region].join(' ').toLowerCase().includes(query.toLowerCase())) return false
      if (filterRegions.size > 0 && !filterRegions.has(w.region)) return false
      if (filterMinScore && w.score < filterMinScore) return false
      if (filterPriceRange && w.price_gbp) {
        const [min, max] = filterPriceRange
        if (w.price_gbp < min || w.price_gbp > max) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score-desc') return b.score - a.score
      if (sortBy === 'score-asc') return a.score - b.score
      if (sortBy === 'price-asc') return (a.price_gbp ?? Infinity) - (b.price_gbp ?? Infinity)
      if (sortBy === 'price-desc') return (b.price_gbp ?? -1) - (a.price_gbp ?? -1)
      if (sortBy === 'name-asc') return a.title.localeCompare(b.title)
      return 0
    })

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Score: High → Low'

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1208', fontFamily: 'Ronzino, sans-serif', color: '#6b5a42', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
      Loading…
    </div>
  )

  const navLight = !navScrolled

  return (
    <div style={{ fontFamily: 'Ronzino, sans-serif', background: '#f7f4f0', minHeight: '100vh' }}>

      {/* Fixed navbar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: navScrolled ? '#fff' : 'transparent',
        borderBottom: navScrolled ? '1px solid #f0ebe2' : 'none',
        padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}>
        <span style={{
          fontSize: 22, fontWeight: 500, letterSpacing: '-0.3px',
          fontFamily: 'Ronzino, sans-serif',
          color: navLight ? '#f5e6c8' : '#1a1208',
          transition: 'color 0.4s ease',
        }}>
          The Bottle Keep
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: searchOpen ? `1px solid ${navLight ? '#f5e6c8' : '#1a1208'}` : '1px solid transparent',
            paddingBottom: 2, transition: 'border-color 0.2s',
          }}>
            {searchOpen && (
              <input
                autoFocus
                type="text"
                placeholder="Search…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onBlur={() => { if (!query) setSearchOpen(false) }}
                style={{
                  border: 'none', outline: 'none', fontSize: 12,
                  fontFamily: 'Ronzino, sans-serif', background: 'transparent',
                  color: navLight ? '#f5e6c8' : '#1a1208', width: 180,
                }}
              />
            )}
            <button onClick={() => setSearchOpen(v => !v)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: navLight ? '#c8b89a' : '#6b5a42', display: 'flex', alignItems: 'center',
              transition: 'color 0.4s ease',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </div>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: navLight ? '#c8b89a' : '#6b5a42', display: 'flex', alignItems: 'center',
            transition: 'color 0.4s ease',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
        </div>
      </div>

      {/* Full-bleed carousel hero */}
      <CarouselHero whiskies={whiskies} />

      {/* Sticky subnav */}
      <div style={{
        position: 'sticky', top: 60, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #f0ebe2',
        padding: '0 40px', height: 44,
        display: 'flex', alignItems: 'center', gap: 32, overflowX: 'auto',
      }}>
        {NAV_ITEMS.map(item => (
          <button key={item.value} onClick={() => setActiveNav(item.value)} style={{
            fontSize: 12, letterSpacing: '0.04em',
            color: activeNav === item.value ? '#1a1208' : '#a09080',
            fontWeight: activeNav === item.value ? 500 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Ronzino, sans-serif', padding: 0,
            height: 44, whiteSpace: 'nowrap', flexShrink: 0,
            borderBottom: activeNav === item.value ? '1px solid #1a1208' : '1px solid transparent',
            transition: 'color 0.15s',
          }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '32px 40px' }}>

        {/* Results + controls bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid #ede5d8',
        }}>
          <span style={{ fontSize: 12, color: '#a09080', letterSpacing: '0.02em' }}>
            {filtered.length} whisk{filtered.length === 1 ? 'y' : 'ies'}
            {saved.size > 0 && <span style={{ marginLeft: 12, color: '#b8882a' }}>{saved.size} saved</span>}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div ref={sortRef} style={{ position: 'relative' }}>
              <button onClick={() => { setShowSort(v => !v); setShowFilter(false) }} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 12, color: '#1a1208', fontFamily: 'Ronzino, sans-serif',
                display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.02em',
              }}>
                Sort: {sortLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showSort ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <SortDropdown open={showSort} value={sortBy} onChange={v => { setSortBy(v); setShowSort(false) }} />
            </div>

            <span style={{ color: '#ddd4c4' }}>·</span>

            <div ref={filterRef} style={{ position: 'relative' }}>
              <button onClick={() => { setShowFilter(v => !v); setShowSort(false) }} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 12, fontFamily: 'Ronzino, sans-serif',
                color: activeFilterCount > 0 ? '#b8882a' : '#1a1208', letterSpacing: '0.02em',
              }}>
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
              <FilterDropdown
                open={showFilter}
                regions={filterRegions}
                minScore={filterMinScore}
                priceRange={filterPriceRange}
                onRegionToggle={toggleRegion}
                onScoreChange={setFilterMinScore}
                onPriceChange={setFilterPriceRange}
                onClear={clearFilters}
                activeCount={activeFilterCount}
              />
            </div>

            <span style={{ color: '#ddd4c4' }}>·</span>

            <div style={{ display: 'flex', gap: 12 }}>
              {['grid', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: view === v ? '#1a1208' : '#c8b89a', display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}>
                  {v === 'grid'
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                  }
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div style={view === 'grid' ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
        } : {
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          {filtered.length > 0
            ? filtered.map(w => (
                <WhiskyCard key={w.id} whisky={w} saved={saved.has(w.id)} onSave={toggleSave} view={view} />
              ))
            : <p style={{ color: '#a09080', fontSize: 13 }}>No whiskies found.</p>
          }
        </div>
      </div>
    </div>
  )
}

export default App

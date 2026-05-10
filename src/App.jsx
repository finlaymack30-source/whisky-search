import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import WhiskyCard from './components/WhiskyCard'

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
      fontWeight: active ? 500 : 400,
      transition: 'all 0.15s',
    }}>{label}</button>
  )
}

function SortDropdown({ open, value, onChange }) {
  if (!open) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100,
      background: '#fff', border: '1px solid #ede5d8', borderRadius: 4,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)', minWidth: 200,
      fontFamily: 'Ronzino, sans-serif', overflow: 'hidden',
    }}>
      {SORT_OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 16px', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 12, color: '#1a1208', textAlign: 'left',
          fontFamily: 'Ronzino, sans-serif',
          backgroundColor: value === opt.value ? '#f7f4f0' : 'transparent',
          fontWeight: value === opt.value ? 500 : 400,
          borderBottom: '1px solid #f7f4f0',
        }}>
          {opt.label}
          {value === opt.value && <span style={{ color: '#b8882a', fontSize: 13 }}>✓</span>}
        </button>
      ))}
    </div>
  )
}

function FilterDropdown({ open, regions, minScore, priceRange, onRegionToggle, onScoreChange, onPriceChange, onClear, activeCount }) {
  if (!open) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100,
      background: '#fff', border: '1px solid #ede5d8', borderRadius: 4,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)', width: 300,
      fontFamily: 'Ronzino, sans-serif',
    }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f0e8da' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#a09080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Region</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {REGIONS.map(r => (
            <Chip key={r} label={r} active={regions.has(r)} onClick={() => onRegionToggle(r)} />
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #f0e8da' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#a09080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Min Score</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {SCORE_OPTIONS.map(opt => (
            <Chip key={String(opt.value)} label={opt.label} active={minScore === opt.value} onClick={() => onScoreChange(opt.value)} />
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 18px 12px', borderBottom: activeCount > 0 ? '1px solid #f0e8da' : 'none' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#a09080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Price</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {PRICE_OPTIONS.map(opt => (
            <Chip key={String(opt.value)} label={opt.label}
              active={JSON.stringify(priceRange) === JSON.stringify(opt.value)}
              onClick={() => onPriceChange(opt.value)} />
          ))}
        </div>
      </div>
      {activeCount > 0 && (
        <div style={{ padding: '12px 18px' }}>
          <button onClick={onClear} style={{
            width: '100%', padding: '8px', border: '1px solid #e0d8cc', borderRadius: 3,
            background: '#fff', color: '#6b5a42', fontSize: 11, cursor: 'pointer',
            fontFamily: 'Ronzino, sans-serif', letterSpacing: '0.05em',
          }}>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}

function Hero({ whisky }) {
  const [imgError, setImgError] = useState(false)
  if (!whisky) return null
  return (
    <div style={{
      background: '#1a1208',
      padding: '52px 48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 40,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ flex: 1, maxWidth: 520 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6b5a42', marginBottom: 16, fontFamily: 'Ronzino, sans-serif' }}>
          Editor's Pick · {whisky.region}
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, color: '#f5e6c8', lineHeight: 1.12, marginBottom: 10, fontFamily: 'Ronzino, sans-serif' }}>
          {whisky.title}
        </div>
        <div style={{ fontSize: 12, color: '#6b5a42', marginBottom: 24, letterSpacing: '0.04em', fontFamily: 'Ronzino, sans-serif' }}>
          {whisky.distillery}
          {whisky.age && ` · ${whisky.age} Year Old`}
          {whisky.abv && ` · ${whisky.abv}%`}
        </div>
        {whisky.tasting_note && (
          <div style={{ fontSize: 14, color: '#a09080', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 32, maxWidth: 420, fontFamily: 'Ronzino, sans-serif' }}>
            "{whisky.tasting_note.length > 160 ? whisky.tasting_note.slice(0, 157) + '…' : whisky.tasting_note}"
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {whisky.price_gbp && (
            <span style={{ fontSize: 22, fontWeight: 500, color: '#c8a96e', fontFamily: 'Ronzino, sans-serif' }}>
              £{whisky.price_gbp}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14, color: '#c8a96e' }}>★</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#f5e6c8', fontFamily: 'Ronzino, sans-serif' }}>{whisky.score}</span>
          </div>
        </div>
      </div>
      {whisky.image_url && !imgError && (
        <div style={{ flexShrink: 0, width: 180, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={whisky.image_url} alt={whisky.title} onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }} />
        </div>
      )}
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
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false)
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleSave = (id) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleRegion = (r) => {
    setFilterRegions(prev => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
  }

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

  const featured = [...whiskies].sort((a, b) => b.score - a.score)[0]
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Score: High → Low'

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4f0', fontFamily: 'Ronzino, sans-serif', color: '#a09080', fontSize: 13, letterSpacing: '0.08em' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ fontFamily: 'Ronzino, sans-serif', background: '#f7f4f0', minHeight: '100vh' }}>

      {/* Navbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0ebe2', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 22, fontWeight: 500, color: '#1a1208', letterSpacing: '-0.3px', fontFamily: 'Ronzino, sans-serif' }}>
          The Bottle Keep
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Inline search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: searchOpen ? '1px solid #1a1208' : '1px solid transparent',
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
                style={{ border: 'none', outline: 'none', fontSize: 12, fontFamily: 'Ronzino, sans-serif', color: '#1a1208', background: 'transparent', width: 180 }}
              />
            )}
            <button onClick={() => setSearchOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b5a42', display: 'flex', alignItems: 'center', padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b5a42', display: 'flex', alignItems: 'center', padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0ebe2', padding: '0 40px', height: 44, display: 'flex', alignItems: 'center', gap: 32, overflowX: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.value}
            onClick={() => setActiveNav(item.value)}
            style={{
              fontSize: 12,
              letterSpacing: '0.04em',
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

      {/* Hero */}
      <Hero whisky={featured} />

      {/* Content */}
      <div style={{ padding: '32px 40px' }}>

        {/* Results + controls bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid #ede5d8' }}>
          <span style={{ fontSize: 12, color: '#a09080', letterSpacing: '0.02em' }}>
            {filtered.length} whisk{filtered.length === 1 ? 'y' : 'ies'}
            {saved.size > 0 && <span style={{ marginLeft: 12, color: '#b8882a' }}>{saved.size} saved</span>}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

            {/* Sort */}
            <div ref={sortRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowSort(v => !v); setShowFilter(false) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: '#1a1208', fontFamily: 'Ronzino, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 5, padding: 0,
                  letterSpacing: '0.02em',
                }}>
                Sort: {sortLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showSort ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <SortDropdown open={showSort} value={sortBy} onChange={v => { setSortBy(v); setShowSort(false) }} />
            </div>

            <span style={{ color: '#ddd4c4', fontSize: 14 }}>·</span>

            {/* Filter */}
            <div ref={filterRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowFilter(v => !v); setShowSort(false) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'Ronzino, sans-serif', padding: 0,
                  color: activeFilterCount > 0 ? '#b8882a' : '#1a1208',
                  letterSpacing: '0.02em',
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

            <span style={{ color: '#ddd4c4', fontSize: 14 }}>·</span>

            {/* View toggle */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {['grid', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: view === v ? '#1a1208' : '#c8b89a',
                  display: 'flex', alignItems: 'center',
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
            : <p style={{ color: '#a09080', fontSize: 13, letterSpacing: '0.02em' }}>No whiskies found.</p>
          }
        </div>
      </div>
    </div>
  )
}

export default App

import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import WhiskyCard from './components/WhiskyCard'

const NAV_ITEMS = [
  { label: 'All Whiskies', value: 'All' },
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
  { label: 'Any score', value: null },
  { label: '3.5+ stars', value: 3.5 },
  { label: '4.0+ stars', value: 4.0 },
  { label: '4.5+ stars', value: 4.5 },
]

const PRICE_OPTIONS = [
  { label: 'Any price', value: null },
  { label: 'Under £50', value: [0, 50] },
  { label: '£50 – £100', value: [50, 100] },
  { label: '£100 – £200', value: [100, 200] },
  { label: '£200+', value: [200, Infinity] },
]

function Dropdown({ open, children, style }) {
  if (!open) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
      background: '#fff', border: '1px solid #ede5d8', borderRadius: 12,
      boxShadow: '0 8px 28px rgba(0,0,0,0.12)', minWidth: 220,
      fontFamily: 'Ronzino, sans-serif',
      ...style
    }}>
      {children}
    </div>
  )
}

function SortDropdown({ open, value, onChange }) {
  return (
    <Dropdown open={open}>
      <div style={{ padding: '6px 0' }}>
        {SORT_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '9px 16px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13, color: '#1a1208', textAlign: 'left',
            fontFamily: 'Ronzino, sans-serif',
            backgroundColor: value === opt.value ? '#f7f4f0' : 'transparent',
            fontWeight: value === opt.value ? 500 : 400,
          }}>
            {opt.label}
            {value === opt.value && <span style={{ color: '#b8882a', fontSize: 14 }}>✓</span>}
          </button>
        ))}
      </div>
    </Dropdown>
  )
}

function FilterDropdown({ open, regions, minScore, priceRange, onRegionToggle, onScoreChange, onPriceChange, onClear, activeCount }) {
  return (
    <Dropdown open={open} style={{ minWidth: 260 }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0e8da' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#8a7660', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Region</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {REGIONS.map(r => {
            const active = regions.has(r)
            return (
              <button key={r} onClick={() => onRegionToggle(r)} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 20,
                border: active ? '1.5px solid #b8882a' : '1px solid #ddd4c4',
                background: active ? '#fdf5e8' : '#fff',
                color: active ? '#8a5c10' : '#6b5a42',
                cursor: 'pointer', fontFamily: 'Ronzino, sans-serif',
                fontWeight: active ? 500 : 400,
              }}>{r}</button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f0e8da' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#8a7660', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Min Score</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SCORE_OPTIONS.map(opt => {
            const active = minScore === opt.value
            return (
              <button key={String(opt.value)} onClick={() => onScoreChange(opt.value)} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 20,
                border: active ? '1.5px solid #b8882a' : '1px solid #ddd4c4',
                background: active ? '#fdf5e8' : '#fff',
                color: active ? '#8a5c10' : '#6b5a42',
                cursor: 'pointer', fontFamily: 'Ronzino, sans-serif',
                fontWeight: active ? 500 : 400,
              }}>{opt.label}</button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 10px', borderBottom: activeCount > 0 ? '1px solid #f0e8da' : 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#8a7660', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Price</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRICE_OPTIONS.map(opt => {
            const active = JSON.stringify(priceRange) === JSON.stringify(opt.value)
            return (
              <button key={String(opt.value)} onClick={() => onPriceChange(opt.value)} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 20,
                border: active ? '1.5px solid #b8882a' : '1px solid #ddd4c4',
                background: active ? '#fdf5e8' : '#fff',
                color: active ? '#8a5c10' : '#6b5a42',
                cursor: 'pointer', fontFamily: 'Ronzino, sans-serif',
                fontWeight: active ? 500 : 400,
              }}>{opt.label}</button>
            )
          })}
        </div>
      </div>

      {activeCount > 0 && (
        <div style={{ padding: '10px 16px' }}>
          <button onClick={onClear} style={{
            width: '100%', padding: '8px', border: '1px solid #ddd4c4', borderRadius: 8,
            background: '#fff', color: '#6b5a42', fontSize: 12, cursor: 'pointer',
            fontFamily: 'Ronzino, sans-serif',
          }}>
            Clear all filters
          </button>
        </div>
      )}
    </Dropdown>
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

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'

  if (loading) return <div style={{ padding: 32, color: '#8a7660', fontFamily: 'Ronzino, sans-serif' }}>Loading whiskies…</div>

  return (
    <div style={{ fontFamily: 'Ronzino, sans-serif', background: '#f7f4f0', minHeight: '100vh' }}>

      {/* Navbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ede5d8', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontFamily: "'Ronzino', sans-serif", fontSize: 26, fontWeight: 500, color: '#b8882a', letterSpacing: '-0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          The Bottle Keep
        </span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #c8b89a', borderRadius: 30, overflow: 'hidden', height: 40, flex: 1, maxWidth: 480, background: '#fff' }}>
          <input
            type="text"
            placeholder="Search any whisky…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Ronzino, sans-serif', color: '#1a1208', background: 'transparent', padding: '0 16px', height: '100%' }}
          />
          <div style={{ width: 42, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6648', borderLeft: '1px solid #e8e0d4', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b5a42' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>

      {/* Subnav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ede5d8', padding: '0 28px', height: 48, display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.value}
            onClick={() => setActiveNav(item.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: activeNav === item.value ? '#1a1208' : '#6b5a42',
              whiteSpace: 'nowrap', cursor: 'pointer',
              padding: `0 ${i === 0 ? 0 : 18}px`,
              paddingRight: 18,
              height: 48,
              borderBottom: activeNav === item.value ? '2px solid #b8882a' : '2px solid transparent',
              fontWeight: activeNav === item.value ? 500 : 400,
              background: 'none', border: 'none',
              borderBottom: activeNav === item.value ? '2px solid #b8882a' : '2px solid transparent',
              cursor: 'pointer', flexShrink: 0, fontFamily: 'Ronzino, sans-serif'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 28px' }}>

        {/* Filter / Sort */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          {/* Filter */}
          <div ref={filterRef} style={{ flex: 1, position: 'relative' }}>
            <button
              onClick={() => { setShowFilter(v => !v); setShowSort(false) }}
              style={{
                width: '100%', height: 44,
                border: showFilter ? '1.5px solid #b8882a' : '1.5px solid #3d2e1a',
                borderRadius: 30, background: '#fff',
                fontFamily: 'Ronzino, sans-serif', fontSize: 14, fontWeight: 500, color: '#1a1208',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
              Filter
              <span style={{
                background: activeFilterCount > 0 ? '#b8882a' : '#1a1208',
                color: '#fff', borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 500, flexShrink: 0
              }}>{activeFilterCount}</span>
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

          {/* Sort */}
          <div ref={sortRef} style={{ flex: 1, position: 'relative' }}>
            <button
              onClick={() => { setShowSort(v => !v); setShowFilter(false) }}
              style={{
                width: '100%', height: 44,
                border: showSort ? '1.5px solid #b8882a' : '1.5px solid #3d2e1a',
                borderRadius: 30, background: '#fff',
                fontFamily: 'Ronzino, sans-serif', fontSize: 14, fontWeight: 500, color: '#1a1208',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
              {sortBy !== 'score-desc' ? sortLabel : 'Sort'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showSort ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <SortDropdown open={showSort} value={sortBy} onChange={(v) => { setSortBy(v); setShowSort(false) }} />
          </div>
        </div>

        {/* Results bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#6b5a42' }}>
            Showing {filtered.length} whisk{filtered.length === 1 ? 'y' : 'ies'}
            {saved.size > 0 && <span style={{ marginLeft: 12, color: '#8a6830', fontWeight: 500 }}>{saved.size} saved</span>}
          </span>
          <div style={{ display: 'flex', border: '1.5px solid #3d2e1a', borderRadius: 8, overflow: 'hidden' }}>
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                height: 32, padding: '0 12px', border: 'none',
                borderRight: v === 'grid' ? '1.5px solid #3d2e1a' : 'none',
                background: view === v ? '#1a1208' : '#fff',
                color: view === v ? '#f5e6c8' : '#3d2e1a',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'Ronzino, sans-serif'
              }}>
                {v === 'grid'
                  ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> Grid</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> List</>
                }
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={view === 'grid' ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: 14
        } : {
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          {filtered.length > 0
            ? filtered.map(w => (
                <WhiskyCard key={w.id} whisky={w} saved={saved.has(w.id)} onSave={toggleSave} view={view} />
              ))
            : <p style={{ color: '#8a7660', fontSize: 14 }}>No whiskies found.</p>
          }
        </div>
      </div>
    </div>
  )
}

export default App

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import WhiskyCard from './components/WhiskyCard'

const NAV_ITEMS = [
  { label: 'All Whiskies', value: 'All', icon: '🥃' },
  { label: 'Single Malts', value: 'Single Malt', icon: null },
  { label: 'Blends', value: 'Blend', icon: null },
  { label: 'Bourbon & Rye', value: 'Bourbon', icon: null },
  { label: 'Regions', value: 'Region', icon: null },
  { label: 'Distilleries', value: 'Distillery', icon: null },
]

function App() {
  const [query, setQuery] = useState('')
  const [activeNav, setActiveNav] = useState('All')
  const [saved, setSaved] = useState(new Set())
  const [whiskies, setWhiskies] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('whiskies')
        .select('*')
        .limit(364)
      if (!error) setWhiskies(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const toggleSave = (id) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = whiskies.filter(w => {
    const matchesNav = activeNav === 'All' || activeNav === 'Region' || activeNav === 'Distillery' || w.type === activeNav
    const matchesQuery = [w.title, w.distillery, w.region].join(' ').toLowerCase().includes(query.toLowerCase())
    return matchesNav && matchesQuery
  })

  if (loading) return <div style={{ padding: 32, color: '#8a7660', fontFamily: 'Inter, sans-serif' }}>Loading whiskies…</div>

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f7f4f0', minHeight: '100vh' }}>

      {/* Navbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ede5d8', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#b8882a', letterSpacing: '-0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          the bottle keep
        </span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #c8b89a', borderRadius: 30, overflow: 'hidden', height: 40, flex: 1, maxWidth: 480, background: '#fff' }}>
          <input
            type="text"
            placeholder="Search any whisky…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#1a1208', background: 'transparent', padding: '0 16px', height: '100%' }}
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
              padding: `0 ${i === 0 ? 0 : 18}px 0 ${i === 0 ? 0 : 18}px`,
              paddingRight: 18,
              height: 48,
              borderBottom: activeNav === item.value ? '2px solid #b8882a' : '2px solid transparent',
              fontWeight: activeNav === item.value ? 500 : 400,
              background: 'none', border: 'none',
              borderBottom: activeNav === item.value ? '2px solid #b8882a' : '2px solid transparent',
              cursor: 'pointer', flexShrink: 0, fontFamily: 'Inter, sans-serif'
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
          {['Filter', 'Sort'].map(label => (
            <button key={label} style={{
              flex: 1, height: 44,
              border: '1.5px solid #3d2e1a', borderRadius: 30,
              background: '#fff', fontFamily: 'Inter, sans-serif',
              fontSize: 14, fontWeight: 500, color: '#1a1208',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              {label}
              {label === 'Filter' && <span style={{ background: '#1a1208', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500 }}>0</span>}
            </button>
          ))}
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
                height: 32, padding: '0 12px',
                border: 'none',
                borderRight: v === 'grid' ? '1.5px solid #3d2e1a' : 'none',
                background: view === v ? '#1a1208' : '#fff',
                color: view === v ? '#f5e6c8' : '#3d2e1a',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'Inter, sans-serif'
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
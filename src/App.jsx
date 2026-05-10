import { useState } from 'react'
import whiskies from './data/whiskies'
import WhiskyCard from './components/WhiskyCard'

const FILTERS = ['All', 'Single Malt', 'Blend', 'Grain']

function App() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [saved, setSaved] = useState(new Set())

  const toggleSave = (id) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = whiskies.filter(w => {
    const matchesType = activeFilter === 'All' || w.type === activeFilter
    const matchesQuery = [w.name, w.distillery, w.region].join(' ').toLowerCase().includes(query.toLowerCase())
    return matchesType && matchesQuery
  })

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Whisky Search</h1>
      <p className="text-gray-500 text-sm mb-6">Find and save whiskies you love</p>

      <input
        type="text"
        placeholder="Search by name, distillery, or region…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-amber-400"
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              activeFilter === f
                ? 'bg-amber-500 text-white border-amber-500'
                : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {saved.size > 0 && (
        <p className="text-sm text-amber-600 font-medium mb-4">
          {saved.size} whisky{saved.size > 1 ? 'ies' : ''} saved
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filtered.length > 0
          ? filtered.map(w => (
              <WhiskyCard key={w.id} whisky={w} saved={saved.has(w.id)} onSave={toggleSave} />
            ))
          : <p className="text-gray-400 text-sm col-span-full">No whiskies found.</p>
        }
      </div>
    </div>
  )
}

export default App
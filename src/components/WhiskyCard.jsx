function scoreColor(s) {
  if (s >= 4.5) return '#2d6a2d'
  if (s >= 4.2) return '#4a8c2a'
  if (s >= 3.9) return '#7aaa25'
  if (s >= 3.6) return '#c8a020'
  if (s >= 3.3) return '#d4720a'
  return '#c03020'
}

function Stars({ score }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (score >= i) stars.push('full')
    else if (score >= i - 0.5) stars.push('half')
    else stars.push('empty')
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {stars.map((t, i) => (
        <span key={i} style={{
          fontSize: 12,
          color: t === 'empty' ? '#ddd0be' : '#c8a96e',
          opacity: t === 'half' ? 0.55 : 1
        }}>★</span>
      ))}
      <span style={{ fontSize: 10, color: '#8a7660', marginLeft: 3 }}>{score}</span>
    </div>
  )
}

function WhiskyCard({ whisky, saved, onSave, view }) {
  const color = scoreColor(whisky.score)

  if (view === 'list') {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 10,
        border: saved ? '1.5px solid #c8a96e' : '1px solid #ede5d8',
        padding: '12px 14px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        cursor: 'pointer',
        transition: 'border-color 0.15s'
      }}>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 500, color: '#fff'
          }}>{whisky.score}</div>
          <Stars score={whisky.score} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1208', lineHeight: 1.2 }}>{whisky.title}</div>
          <div style={{ fontSize: 11, color: '#8a7660', marginBottom: 5 }}>{whisky.distillery} · {whisky.region}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
            {whisky.type && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.type}</span>}
            {whisky.age && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.age}yr</span>}
            {whisky.abv && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.abv}%</span>}
            {whisky.cask_type && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.cask_type}</span>}
          </div>
          {whisky.tasting_note && <div style={{ fontSize: 11, color: '#6b5a42', lineHeight: 1.5, fontStyle: 'italic' }}>{whisky.tasting_note}</div>}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, minHeight: 42 }}>
          <button onClick={() => onSave(whisky.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: saved ? '#c8a96e' : '#c8b89a', lineHeight: 1 }}>
            {saved ? '★' : '☆'}
          </button>
          {whisky.price_gbp && <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1208' }}>£{whisky.price_gbp}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: saved ? '1.5px solid #c8a96e' : '1px solid #ede5d8',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'border-color 0.15s'
    }}>
      <div style={{ padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 500, color: '#fff', flexShrink: 0
          }}>{whisky.score}</div>
          <button onClick={() => onSave(whisky.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: saved ? '#c8a96e' : '#c8b89a', lineHeight: 1 }}>
            {saved ? '★' : '☆'}
          </button>
        </div>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#1a1208', lineHeight: 1.3 }}>{whisky.title}</div>
          <div style={{ fontSize: 10, color: '#8a7660', marginTop: 1 }}>{whisky.distillery}</div>
        </div>
      </div>
      <div style={{ height: 1, background: '#f0e8dc', margin: '0 12px' }} />
      <div style={{ padding: '8px 12px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {whisky.region && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.region}</span>}
          {whisky.age && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.age}yr</span>}
          {whisky.cask_type && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.cask_type}</span>}
        </div>
        <Stars score={whisky.score} />
        {whisky.tasting_note && <div style={{ fontSize: 10, color: '#6b5a42', lineHeight: 1.45, fontStyle: 'italic' }}>{whisky.tasting_note}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {whisky.price_gbp && <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1208' }}>£{whisky.price_gbp}</span>}
          {whisky.abv && <span style={{ fontSize: 10, color: '#a09080' }}>{whisky.abv}%</span>}
        </div>
      </div>
    </div>
  )
}

export default WhiskyCard
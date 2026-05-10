import { useState } from 'react'

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

function BottlePlaceholder() {
  return (
    <svg viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 36, height: 72, opacity: 0.35 }}>
      <rect x="22" y="2" width="16" height="8" rx="2" fill="#8a7660"/>
      <rect x="24" y="10" width="12" height="18" rx="1" fill="#8a7660"/>
      <path d="M20 28 Q13 42 13 52 L13 100 Q13 110 20 110 L40 110 Q47 110 47 100 L47 52 Q47 42 40 28 Z" fill="#8a7660"/>
      <rect x="16" y="60" width="28" height="32" rx="2" fill="#f7f4f0" opacity="0.5"/>
    </svg>
  )
}

function WhiskyCard({ whisky, saved, onSave, view }) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const color = scoreColor(whisky.score)
  const showImage = whisky.image_url && !imgError

  if (view === 'list') {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#fff',
          borderRadius: 10,
          border: saved ? '1.5px solid #c8a96e' : '1px solid #ede5d8',
          padding: '12px 14px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          cursor: 'pointer',
          boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.05)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.15s'
        }}>

        {/* Bottle thumbnail */}
        <div style={{
          flexShrink: 0, width: 52, height: 72,
          background: '#f7f4f0', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
          {showImage
            ? <img src={whisky.image_url} alt={whisky.title} onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
            : <BottlePlaceholder />
          }
        </div>

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
          <div style={{ fontFamily: "'Ronzino', sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1208', lineHeight: 1.2 }}>{whisky.title}</div>
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
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 12,
        border: saved ? '1.5px solid #c8a96e' : '1px solid #ede5d8',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.11)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.15s'
      }}>

      {/* Bottle image */}
      <div style={{
        height: 130, background: '#f7f4f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative'
      }}>
        {showImage
          ? <img src={whisky.image_url} alt={whisky.title} onError={() => setImgError(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'contain', padding: '10px 16px',
                transform: hovered ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 0.3s ease'
              }} />
          : <BottlePlaceholder />
        }
        {/* Score badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          width: 32, height: 32, borderRadius: '50%',
          background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, color: '#fff'
        }}>{whisky.score}</div>
        <button onClick={() => onSave(whisky.id)} style={{
          position: 'absolute', top: 6, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 17, color: saved ? '#c8a96e' : '#c8b89a', lineHeight: 1
        }}>
          {saved ? '★' : '☆'}
        </button>
      </div>

      <div style={{ padding: '10px 12px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <div style={{ fontFamily: "'Ronzino', sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1208', lineHeight: 1.3 }}>{whisky.title}</div>
          <div style={{ fontSize: 10, color: '#8a7660', marginTop: 1 }}>{whisky.distillery}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {whisky.region && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.region}</span>}
          {whisky.age && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.age}yr</span>}
          {whisky.cask_type && <span style={{ fontSize: 10, color: '#7a6648', background: '#f5efe6', padding: '2px 6px', borderRadius: 8 }}>{whisky.cask_type}</span>}
        </div>
        <Stars score={whisky.score} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {whisky.price_gbp && <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1208' }}>£{whisky.price_gbp}</span>}
          {whisky.abv && <span style={{ fontSize: 10, color: '#a09080' }}>{whisky.abv}%</span>}
        </div>
      </div>
    </div>
  )
}

export default WhiskyCard

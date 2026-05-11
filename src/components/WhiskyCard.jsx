import { useState } from 'react'

function BottlePlaceholder() {
  return (
    <svg viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 36, height: 72, opacity: 0.2 }}>
      <rect x="22" y="2" width="16" height="8" rx="2" fill="#8a7660"/>
      <rect x="24" y="10" width="12" height="18" rx="1" fill="#8a7660"/>
      <path d="M20 28 Q13 42 13 52 L13 100 Q13 110 20 110 L40 110 Q47 110 47 100 L47 52 Q47 42 40 28 Z" fill="#8a7660"/>
      <rect x="16" y="60" width="28" height="32" rx="2" fill="#f7f4f0" opacity="0.5"/>
    </svg>
  )
}

const buyHref = (w) =>
  w.buy_url || `https://www.thewhiskyexchange.com/search#q=${encodeURIComponent(w.title)}`

function WhiskyCard({ whisky, saved, onSave, view }) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const showImage = whisky.image_url && !imgError

  if (view === 'list') {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#fff',
          border: '1px solid #f0ebe2',
          borderRadius: 4,
          padding: '16px 20px',
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
          cursor: 'pointer',
          boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.08)' : 'none',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        }}>

        <div style={{
          flexShrink: 0, width: 56, height: 84,
          background: '#f9f7f4', borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}>
          {showImage
            ? <img src={whisky.image_url} alt={whisky.title} onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
            : <BottlePlaceholder />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Ronzino', sans-serif", fontSize: 15, fontWeight: 700, color: '#1a1208', lineHeight: 1.25, marginBottom: 3 }}>{whisky.title}</div>
          <div style={{ fontSize: 11, color: '#a09080', marginBottom: 8 }}>{whisky.distillery} · {whisky.region}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {whisky.type && <span style={{ fontSize: 10, color: '#8a7660', background: '#f5efe6', padding: '2px 8px', borderRadius: 2 }}>{whisky.type}</span>}
            {whisky.age && <span style={{ fontSize: 10, color: '#8a7660', background: '#f5efe6', padding: '2px 8px', borderRadius: 2 }}>{whisky.age}yr</span>}
            {whisky.abv && <span style={{ fontSize: 10, color: '#8a7660', background: '#f5efe6', padding: '2px 8px', borderRadius: 2 }}>{whisky.abv}%</span>}
            {whisky.cask_type && <span style={{ fontSize: 10, color: '#8a7660', background: '#f5efe6', padding: '2px 8px', borderRadius: 2 }}>{whisky.cask_type}</span>}
          </div>
          {whisky.tasting_note && (
            <div style={{ fontSize: 11, color: '#8a7660', lineHeight: 1.6, fontStyle: 'italic' }}>{whisky.tasting_note}</div>
          )}
        </div>

        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 84, gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onSave(whisky.id) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: saved ? '#c8a96e' : '#ddd4c4', lineHeight: 1, padding: 0 }}>
            {saved ? '★' : '☆'}
          </button>
          <div style={{ textAlign: 'right' }}>
            {whisky.price_gbp && <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1208' }}>£{whisky.price_gbp}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 3 }}>
              <span style={{ fontSize: 11, color: '#c8a96e' }}>★</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1208' }}>{whisky.score}</span>
            </div>
            <a
              href={buyHref(whisky)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-block', marginTop: 8,
                padding: '5px 14px', borderRadius: 2, textDecoration: 'none',
                background: hovered ? '#c8a96e' : '#f5efe6',
                color: hovered ? '#1a1208' : '#8a7660',
                fontFamily: 'Ronzino, sans-serif', fontSize: 11,
                fontWeight: 500, letterSpacing: '0.08em',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              Buy
            </a>
          </div>
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
        border: '1px solid #f0ebe2',
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.10)' : 'none',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        position: 'relative',
      }}>

      {/* Save button */}
      <button
        onClick={e => { e.stopPropagation(); onSave(whisky.id) }}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 17, color: saved ? '#c8a96e' : '#ddd4c4',
          lineHeight: 1, padding: 0,
          opacity: hovered || saved ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
        {saved ? '★' : '☆'}
      </button>

      {/* Bottle image */}
      <div style={{
        height: 200, background: '#f9f7f4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {showImage
          ? <img src={whisky.image_url} alt={whisky.title} onError={() => setImgError(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                padding: '20px 24px',
                transform: hovered ? 'scale(1.06)' : 'scale(1)',
                transition: 'transform 0.4s ease',
              }} />
          : <BottlePlaceholder />
        }
      </div>

      {/* Info */}
      <div style={{ padding: '14px 14px 16px' }}>
        <div style={{ fontFamily: "'Ronzino', sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1208', lineHeight: 1.3, marginBottom: 3 }}>{whisky.title}</div>
        <div style={{ fontSize: 10, color: '#a09080', marginBottom: 10 }}>{whisky.distillery}</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {whisky.region && <span style={{ fontSize: 10, color: '#8a7660', background: '#f5efe6', padding: '2px 8px', borderRadius: 2 }}>{whisky.region}</span>}
          {whisky.age && <span style={{ fontSize: 10, color: '#8a7660', background: '#f5efe6', padding: '2px 8px', borderRadius: 2 }}>{whisky.age}yr</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          {whisky.price_gbp
            ? <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1208' }}>£{whisky.price_gbp}</span>
            : <span />
          }
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 11, color: '#c8a96e' }}>★</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1208' }}>{whisky.score}</span>
          </div>
        </div>
        <a
          href={buyHref(whisky)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            padding: '7px 0', borderRadius: 2,
            background: hovered ? '#c8a96e' : '#f5efe6',
            color: hovered ? '#1a1208' : '#8a7660',
            fontFamily: 'Ronzino, sans-serif', fontSize: 11,
            fontWeight: 500, letterSpacing: '0.08em',
            transition: 'background 0.2s ease, color 0.2s ease',
          }}
        >
          Buy
        </a>
      </div>
    </div>
  )
}

export default WhiskyCard

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'

const G = (a) => `rgba(200,169,110,${a})`   // gold with alpha
const BASE_FRAC = 0.40   // globe radius as fraction of min(W,H)
const MIN_R = 160
const MAX_R = 1600

const LAND_POLYS = [
  // Great Britain
  [[51.1,1.3],[51.9,1.6],[52.9,1.7],[53.7,0.1],[54.5,-0.6],[55.0,-1.6],[55.8,-2.1],
   [56.5,-2.7],[57.1,-2.0],[57.7,-1.9],[58.6,-3.1],[58.5,-5.1],[57.9,-5.2],
   [57.3,-5.9],[56.7,-6.2],[56.0,-5.6],[55.3,-5.8],[55.0,-5.0],[54.6,-3.5],
   [54.1,-3.2],[53.4,-3.1],[53.3,-4.4],[52.8,-4.6],[52.1,-5.0],[51.6,-5.1],
   [51.6,-4.3],[51.5,-3.2],[51.0,-4.6],[50.4,-5.1],[50.1,-5.7],[50.6,-1.9],
   [50.9,0.3],[51.1,1.3]],
  // Ireland
  [[55.3,-7.4],[55.2,-6.3],[54.7,-5.9],[54.1,-6.1],[52.9,-6.0],[52.2,-6.4],
   [51.9,-7.6],[51.5,-9.8],[52.1,-10.1],[53.0,-10.0],[53.9,-10.2],[54.3,-8.5],
   [55.0,-7.6],[55.3,-7.4]],
  // France
  [[51.1,2.5],[50.0,1.6],[49.5,-1.5],[48.5,-4.7],[47.4,-2.5],[46.4,-1.9],
   [45.7,-1.2],[43.4,-1.6],[43.4,3.0],[43.1,5.9],[43.6,7.3],[44.2,7.5],
   [46.5,7.0],[47.5,7.6],[49.5,6.5],[50.5,3.0],[51.1,2.5]],
  // Iberia
  [[43.7,-7.9],[44.0,-1.6],[43.4,-1.6],[41.0,2.2],[40.5,0.5],[38.5,-0.3],
   [36.0,-5.4],[36.7,-6.4],[37.9,-8.9],[39.0,-9.5],[40.0,-8.8],[41.8,-8.8],
   [43.7,-7.9]],
  // Scandinavia + Finland
  [[57.7,10.5],[57.5,8.0],[58.5,5.3],[60.5,5.0],[62.0,5.0],[63.5,7.5],
   [65.0,14.0],[68.0,14.0],[70.0,18.0],[71.0,25.0],[70.0,30.0],[69.0,28.0],
   [65.0,25.0],[62.0,21.0],[60.5,22.0],[60.0,25.0],[59.5,24.0],[59.5,22.0],
   [58.0,12.0],[57.7,10.5]],
  // Central Europe
  [[51.1,2.5],[51.5,3.5],[53.3,7.2],[54.9,8.4],[55.0,10.0],[54.5,12.0],
   [54.0,14.0],[51.0,14.0],[50.0,12.5],[47.6,12.5],[47.5,7.6],[49.5,6.5],
   [50.5,3.0],[51.1,2.5]],
  // Italy
  [[44.2,7.5],[44.5,8.5],[43.5,10.5],[40.5,15.0],[38.0,16.0],[38.2,15.6],
   [40.0,15.7],[40.6,14.2],[42.0,11.8],[44.0,12.5],[45.5,12.3],[45.0,10.5],
   [44.2,7.5]],
  // Balkans + Turkey
  [[45.5,13.5],[46.5,16.5],[45.5,19.0],[42.0,20.0],[41.0,20.5],[40.6,22.0],
   [39.0,22.5],[38.0,23.5],[37.0,24.0],[36.5,29.0],[36.5,36.0],[37.5,37.0],
   [39.0,36.5],[40.0,38.5],[42.0,42.5],[43.0,27.5],[44.0,30.0],[45.5,30.0],
   [48.5,22.0],[47.0,18.0],[46.0,16.5],[45.5,13.5]],
  // North Africa
  [[35.9,-5.9],[36.5,-1.8],[36.8,3.0],[37.2,10.5],[33.0,12.0],[32.5,15.0],
   [30.5,25.0],[30.0,32.5],[27.5,34.0],[22.0,38.0],[15.0,38.0],[15.0,-17.0],
   [27.5,-13.0],[30.0,-9.5],[33.0,-8.7],[35.9,-5.9]],
  // Iceland
  [[63.5,-24.0],[63.5,-13.5],[66.5,-13.5],[66.0,-17.0],
   [65.5,-24.0],[64.0,-24.5],[63.5,-24.0]],
  // Greenland (simplified)
  [[76.0,-73.0],[83.0,-30.0],[83.0,-18.0],[76.0,-18.0],[72.0,-22.0],
   [68.0,-28.0],[65.0,-40.0],[66.0,-52.0],[68.0,-54.0],[72.0,-58.0],
   [76.0,-73.0]],
]

const MARKERS = [
  { id: 'Speyside',    lat: 57.4, lon: -3.1 },
  { id: 'Highland',   lat: 57.5, lon: -4.5 },
  { id: 'Islands',    lat: 57.8, lon: -6.8 },
  { id: 'Islay',      lat: 55.8, lon: -6.2 },
  { id: 'Campbeltown',lat: 55.4, lon: -5.6 },
  { id: 'Lowland',    lat: 55.5, lon: -3.0 },
  { id: 'Irish',      lat: 53.3, lon: -8.0 },
]

function rad(d) { return d * Math.PI / 180 }

function proj(lat, lon, cLat, cLon, R) {
  const φ = rad(lat), λ = rad(lon), φ0 = rad(cLat), λ0 = rad(cLon)
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0)
  if (cosC < 0) return null
  return {
    x: R * Math.cos(φ) * Math.sin(λ - λ0),
    y: -R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0)),
  }
}

function drawFrame(ctx, W, H, state, t) {
  const { cLat, cLon, R, hovered } = state
  const cx = W / 2, cy = H / 2

  ctx.clearRect(0, 0, W, H)

  // Outer atmosphere halos
  for (let i = 0; i < 4; i++) {
    const outer = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R + 60 + i * 30)
    outer.addColorStop(0, G(0.10 - i * 0.022))
    outer.addColorStop(1, G(0))
    ctx.fillStyle = outer
    ctx.beginPath()
    ctx.arc(cx, cy, R + 60 + i * 30, 0, Math.PI * 2)
    ctx.fill()
  }

  // Globe sphere gradient
  const bg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R * 1.05)
  bg.addColorStop(0, '#1e1c2e')
  bg.addColorStop(0.5, '#0c0b18')
  bg.addColorStop(1, '#050510')
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = bg
  ctx.fill()

  // Clip everything to globe circle
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.clip()

  // ── Grid lines ──────────────────────────────────────────
  ctx.shadowColor = G(1)
  ctx.shadowBlur = 5
  ctx.strokeStyle = G(0.13)
  ctx.lineWidth = 0.5

  for (let lat = -70; lat <= 90; lat += 20) {
    ctx.beginPath()
    let first = true
    for (let lon = -180; lon <= 180; lon += 2) {
      const p = proj(lat, lon, cLat, cLon, R)
      if (p) {
        if (first) { ctx.moveTo(cx + p.x, cy + p.y); first = false }
        else ctx.lineTo(cx + p.x, cy + p.y)
      } else first = true
    }
    ctx.stroke()
  }

  for (let lon = -180; lon < 180; lon += 20) {
    ctx.beginPath()
    let first = true
    for (let lat = -90; lat <= 90; lat += 2) {
      const p = proj(lat, lon, cLat, cLon, R)
      if (p) {
        if (first) { ctx.moveTo(cx + p.x, cy + p.y); first = false }
        else ctx.lineTo(cx + p.x, cy + p.y)
      } else first = true
    }
    ctx.stroke()
  }

  ctx.shadowBlur = 0

  // ── Land masses ──────────────────────────────────────────
  for (const poly of LAND_POLYS) {
    ctx.beginPath()
    let first = true
    for (const [la, lo] of poly) {
      const p = proj(la, lo, cLat, cLon, R)
      if (p) {
        if (first) { ctx.moveTo(cx + p.x, cy + p.y); first = false }
        else ctx.lineTo(cx + p.x, cy + p.y)
      } else first = true
    }
    ctx.closePath()
    ctx.fillStyle = G(0.072)
    ctx.fill()
    ctx.strokeStyle = G(0.11)
    ctx.lineWidth = 0.4
    ctx.stroke()
  }

  ctx.restore()

  // ── Globe rim ──────────────────────────────────────────
  ctx.shadowColor = G(0.6)
  ctx.shadowBlur = 18
  ctx.strokeStyle = G(0.35)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0

  // ── Region markers ──────────────────────────────────────────
  for (const m of MARKERS) {
    const p = proj(m.lat, m.lon, cLat, cLon, R)
    if (!p) continue
    const sx = cx + p.x, sy = cy + p.y
    const isHov = hovered === m.id
    const pulse = 0.65 + 0.35 * Math.sin(t * 0.0016 + m.lat * 0.35)

    // Outer pulse ring
    ctx.beginPath()
    ctx.arc(sx, sy, (isHov ? 20 : 11) * pulse, 0, Math.PI * 2)
    ctx.strokeStyle = G(isHov ? 0.45 : 0.22)
    ctx.lineWidth = 0.9
    ctx.stroke()

    // Second ring on hover
    if (isHov) {
      ctx.beginPath()
      ctx.arc(sx, sy, 30, 0, Math.PI * 2)
      ctx.strokeStyle = G(0.12)
      ctx.lineWidth = 0.6
      ctx.stroke()
    }

    // Inner glow fill
    const dg = ctx.createRadialGradient(sx, sy, 0, sx, sy, isHov ? 12 : 8)
    dg.addColorStop(0, G(isHov ? 0.55 : 0.28))
    dg.addColorStop(1, G(0))
    ctx.fillStyle = dg
    ctx.beginPath()
    ctx.arc(sx, sy, isHov ? 12 : 8, 0, Math.PI * 2)
    ctx.fill()

    // Core dot
    ctx.shadowColor = isHov ? 'rgba(245,230,200,0.9)' : G(1)
    ctx.shadowBlur = isHov ? 18 : 10
    ctx.fillStyle = isHov ? '#f5e6c8' : G(1)
    ctx.beginPath()
    ctx.arc(sx, sy, isHov ? 6.5 : 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Label on hover
    if (isHov) {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.95)'
      ctx.shadowBlur = 6
      ctx.font = 'italic 11px Ronzino, Georgia, serif'
      ctx.fillStyle = G(0.95)
      ctx.fillText(m.id, sx + 12, sy + 4)
      ctx.restore()
    }
  }
}

export default function GlobeHero({ whiskies, onRegionSelect }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const sizeRef = useRef({ W: 1200, H: 800, dpr: 1 })
  const stateRef = useRef({
    cLat: 54, cLon: -4, R: 340,
    targetLat: 54, targetLon: -4, targetR: 340,
    dragging: false, lastX: 0, lastY: 0,
    velX: 0, velY: 0, hovered: null,
    animating: false, zoomingIn: false, wasDrag: false,
  })

  const [selected, setSelected] = useState(null)
  const [showCard, setShowCard] = useState(false)

  const featured = useMemo(() => {
    if (!selected || !whiskies.length) return null
    return whiskies
      .filter(w => w.region === selected && w.image_url)
      .sort((a, b) => b.score - a.score)[0] || null
  }, [selected, whiskies])

  // ── Hit detection ──────────────────────────────────────────
  function markerAt(clientX, clientY) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const { W, H } = sizeRef.current
    const s = stateRef.current
    const cx = W / 2, cy = H / 2
    for (const m of MARKERS) {
      const p = proj(m.lat, m.lon, s.cLat, s.cLon, s.R)
      if (!p) continue
      const dx = mx - (cx + p.x), dy = my - (cy + p.y)
      if (dx * dx + dy * dy < 20 * 20) return m.id
    }
    return null
  }

  // ── Canvas setup + animation loop ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resize() {
      const parent = canvas.parentElement
      const W = parent.clientWidth
      const H = parent.clientHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      sizeRef.current = { W, H, dpr }
      const baseR = Math.min(W, H) * BASE_FRAC
      const s = stateRef.current
      if (!s.animating) { s.R = baseR; s.targetR = baseR }
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    function loop(t) {
      const s = stateRef.current
      const { W, H, dpr } = sizeRef.current

      // Inertia drift when idle
      if (!s.dragging && !s.animating) {
        s.cLon -= s.velX
        s.cLat = Math.max(-80, Math.min(80, s.cLat - s.velY))
        s.velX *= 0.93
        s.velY *= 0.93
      }

      // Smooth zoom-pan animation
      if (s.animating) {
        let dLon = s.targetLon - s.cLon
        if (dLon > 180) dLon -= 360
        if (dLon < -180) dLon += 360
        s.cLon += dLon * 0.055
        s.cLat += (s.targetLat - s.cLat) * 0.055
        s.R += (s.targetR - s.R) * 0.05
        const done = Math.abs(s.R - s.targetR) < 2 && Math.abs(s.cLat - s.targetLat) < 0.05 && Math.abs(dLon) < 0.05
        if (done) {
          s.animating = false
          if (s.zoomingIn) { s.zoomingIn = false; setShowCard(true) }
        }
      }

      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawFrame(ctx, W, H, s, t)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    // Wheel must be non-passive to call preventDefault
    function onWheel(e) {
      e.preventDefault()
      const s = stateRef.current
      const factor = e.deltaY > 0 ? 0.92 : 1.09
      const newR = Math.max(MIN_R, Math.min(MAX_R, s.R * factor))
      s.R = newR
      s.targetR = newR
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [])

  // ── Mouse interaction ──────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    const s = stateRef.current
    if (s.dragging) {
      const dx = e.clientX - s.lastX
      const dy = e.clientY - s.lastY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) s.wasDrag = true
      const fac = 130 / s.R
      s.velX = dx * fac
      s.velY = dy * fac
      s.cLon -= dx * fac
      s.cLat = Math.max(-80, Math.min(80, s.cLat + dy * fac))
      s.lastX = e.clientX
      s.lastY = e.clientY
    } else {
      const hov = markerAt(e.clientX, e.clientY)
      s.hovered = hov
      if (canvasRef.current) canvasRef.current.style.cursor = hov ? 'pointer' : 'grab'
    }
  }, [])

  const onMouseDown = useCallback((e) => {
    const s = stateRef.current
    s.dragging = true; s.wasDrag = false
    s.lastX = e.clientX; s.lastY = e.clientY
    s.velX = 0; s.velY = 0
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
  }, [])

  const onMouseUp = useCallback((e) => {
    const s = stateRef.current
    s.dragging = false
    if (canvasRef.current) canvasRef.current.style.cursor = s.hovered ? 'pointer' : 'grab'
    if (!s.wasDrag) {
      const hit = markerAt(e.clientX, e.clientY)
      if (hit) {
        const m = MARKERS.find(x => x.id === hit)
        if (m) {
          setSelected(hit)
          setShowCard(false)
          const targetR = Math.min(MAX_R, Math.min(sizeRef.current.W, sizeRef.current.H) * BASE_FRAC * 2.6)
          s.targetLat = m.lat
          s.targetLon = m.lon
          s.targetR = targetR
          s.animating = true
          s.zoomingIn = true
        }
      }
    }
  }, [])

  // Touch support
  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    const s = stateRef.current
    s.dragging = true; s.wasDrag = false
    s.lastX = t.clientX; s.lastY = t.clientY
    s.velX = 0; s.velY = 0
  }, [])

  const onTouchMove = useCallback((e) => {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    const s = stateRef.current
    const dx = t.clientX - s.lastX, dy = t.clientY - s.lastY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) s.wasDrag = true
    const fac = 130 / s.R
    s.velX = dx * fac; s.velY = dy * fac
    s.cLon -= dx * fac
    s.cLat = Math.max(-80, Math.min(80, s.cLat + dy * fac))
    s.lastX = t.clientX; s.lastY = t.clientY
  }, [])

  const onTouchEnd = useCallback((e) => {
    const s = stateRef.current
    s.dragging = false
    if (!s.wasDrag && e.changedTouches.length === 1) {
      const t = e.changedTouches[0]
      const hit = markerAt(t.clientX, t.clientY)
      if (hit) {
        const m = MARKERS.find(x => x.id === hit)
        if (m) {
          setSelected(hit)
          setShowCard(false)
          const targetR = Math.min(MAX_R, Math.min(sizeRef.current.W, sizeRef.current.H) * BASE_FRAC * 2.6)
          s.targetLat = m.lat; s.targetLon = m.lon; s.targetR = targetR
          s.animating = true; s.zoomingIn = true
        }
      }
    }
  }, [])

  const handleBack = useCallback(() => {
    const s = stateRef.current
    const baseR = Math.min(sizeRef.current.W, sizeRef.current.H) * BASE_FRAC
    setShowCard(false)
    setSelected(null)
    s.targetLat = 54; s.targetLon = -4; s.targetR = baseR
    s.zoomingIn = false; s.animating = true
  }, [])

  return (
    <div style={{ position: 'relative', height: '90vh', background: '#070708', overflow: 'hidden' }}>

      <canvas
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          stateRef.current.dragging = false
          stateRef.current.hovered = null
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* Whisky card overlay — fades in after zoom completes */}
      {selected && (
        <div style={{
          position: 'absolute', inset: 0,
          background: showCard ? 'rgba(5,5,10,0.86)' : 'rgba(5,5,10,0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.7s ease',
          pointerEvents: showCard ? 'auto' : 'none',
        }}>
          <div style={{
            display: 'flex', gap: 72, alignItems: 'center',
            maxWidth: 900, width: '100%', padding: '0 64px',
            fontFamily: 'Ronzino, sans-serif', color: '#f5e6c8',
            opacity: showCard ? 1 : 0,
            transform: showCard ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s',
          }}>

            {/* Bottle image */}
            {featured?.image_url && (
              <img
                src={featured.image_url}
                alt={featured.title}
                style={{
                  height: 310, objectFit: 'contain', flexShrink: 0,
                  filter: 'drop-shadow(0 24px 64px rgba(0,0,0,0.85))',
                }}
              />
            )}

            {/* Info */}
            {featured && (
              <div>
                <div style={{
                  fontSize: 9, letterSpacing: '0.24em', color: 'rgba(200,169,110,0.65)',
                  marginBottom: 16, textTransform: 'uppercase',
                }}>
                  {selected} · Editor's Pick
                </div>
                <div style={{
                  fontSize: 40, fontWeight: 700, lineHeight: 1.06,
                  marginBottom: 10, letterSpacing: '-0.3px',
                }}>
                  {featured.title}
                </div>
                <div style={{
                  fontSize: 11, color: '#3a2e20', marginBottom: 22,
                  letterSpacing: '0.09em',
                }}>
                  {featured.distillery}
                  {featured.age ? ` · ${featured.age}yr` : ''}
                  {featured.abv ? ` · ${featured.abv}%` : ''}
                </div>
                {featured.tasting_note && (
                  <div style={{
                    fontSize: 14, fontStyle: 'italic', color: '#4e3e2a',
                    lineHeight: 1.82, marginBottom: 28, maxWidth: 360,
                  }}>
                    "{featured.tasting_note.slice(0, 170).trimEnd()}…"
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 34 }}>
                  {featured.score && (
                    <span style={{ fontSize: 14, color: 'rgba(200,169,110,0.85)' }}>
                      ★ {featured.score}
                    </span>
                  )}
                  {featured.price_gbp && (
                    <span style={{ fontSize: 26, fontWeight: 500 }}>£{featured.price_gbp}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => { onRegionSelect(selected); handleBack() }}
                    style={{
                      padding: '10px 26px',
                      border: '1px solid rgba(200,169,110,0.45)',
                      background: 'transparent',
                      color: 'rgba(200,169,110,0.9)',
                      fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: 'Ronzino, sans-serif', borderRadius: 2,
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                  >
                    Explore {selected}
                  </button>
                  <button
                    onClick={handleBack}
                    style={{
                      padding: '10px 26px',
                      border: '1px solid rgba(200,169,110,0.1)',
                      background: 'transparent',
                      color: 'rgba(90,74,52,0.7)',
                      fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: 'Ronzino, sans-serif', borderRadius: 2,
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

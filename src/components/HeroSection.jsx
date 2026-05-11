import { useRef, useEffect, useState, useMemo } from 'react'
import scotlandGeo from '../data/scotland-geo.json'

// Real boundary data from OpenStreetMap admin boundaries
// scotlandGeo.mainland  = 473 pts, actual Scotland coastline
// scotlandGeo.island_2  = Skye / south Outer Hebrides
// scotlandGeo.island_3  = Lewis & Harris (Outer Hebrides north)
// scotlandGeo.island_4  = Orkney
// scotlandGeo.island_5  = Islay

// ─── Equirectangular projection ──────────────────────────────────────────────
// Centred on the geographic middle of mainland Scotland
const MID_LAT = 56.65
const MID_LON = -4.00
const COS_LAT = Math.cos(MID_LAT * Math.PI / 180)   // ≈ 0.548
const LAT_SPAN = 4.5   // degrees visible

function project(lat, lon, W, H) {
  const scale = (H * 0.82) / LAT_SPAN
  return {
    x: W * 0.42 + (lon - MID_LON) * scale * COS_LAT,
    y: H * 0.50 - (lat - MID_LAT) * scale,
  }
}

// ─── Elevation centres (for contour rings) ───────────────────────────────────
const ELEV_ZONES = [
  { lat: 57.1, lon: -3.7, r: 0.14 },  // Cairngorms
  { lat: 57.5, lon: -5.0, r: 0.11 },  // NW Highlands
  { lat: 55.5, lon: -3.5, r: 0.07 },  // Southern Uplands
]

// ─── Whisky region markers ───────────────────────────────────────────────────
const SCOTTISH_REGIONS = [
  { id: 'Islay',       lat: 55.76, lon: -6.22, note: 'Peat & brine. Tidal air, deep earth.' },
  { id: 'Campbeltown', lat: 55.43, lon: -5.62, note: 'Sea-salted air. Three working distilleries.' },
  { id: 'Highland',    lat: 57.10, lon: -4.10, note: "Scotland's largest region. Untamed & varied." },
  { id: 'Speyside',    lat: 57.45, lon: -3.32, note: "Half of Scotland's distilleries. Elegant grain." },
  { id: 'Lowland',     lat: 55.88, lon: -3.45, note: 'Light & approachable. Triple distilled.' },
  { id: 'Islands',     lat: 57.30, lon: -5.85, note: 'Skye to Orkney. Each isle its own tongue.' },
]

const REGION_TONES = {
  Islay:       '#7aa89a',
  Campbeltown: '#b89a7a',
  Highland:    '#8a9aaa',
  Speyside:    '#c8a96e',
  Lowland:     '#a0b88a',
  Islands:     '#8a9ab8',
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function strokePoly(ctx, coords, W, H, dashOff, alpha, lineWidth = 1.1) {
  if (!coords?.length) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#c8a96e'
  ctx.lineWidth = lineWidth
  ctx.setLineDash([9, 5])
  ctx.lineDashOffset = dashOff
  ctx.shadowBlur = 6
  ctx.shadowColor = 'rgba(200,169,110,0.4)'
  ctx.beginPath()
  coords.forEach(([lat, lon], i) => {
    const p = project(lat, lon, W, H)
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  })
  ctx.stroke()
  ctx.restore()
}

function drawElevContours(ctx, zone, W, H, t, breath) {
  const c = project(zone.lat, zone.lon, W, H)
  const scale = (H * 0.82) / LAT_SPAN
  const baseR = scale * zone.r
  for (let ring = 0; ring < 5; ring++) {
    const r = baseR * (0.3 + ring * 0.18)
    const alpha = Math.max(0, (0.08 - ring * 0.012) * (1 + Math.sin(breath + ring) * 0.1))
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#c8a96e'
    ctx.lineWidth = 0.6
    ctx.setLineDash([3, 8])
    ctx.lineDashOffset = -t * 6 - ring * 10
    ctx.beginPath()
    for (let s = 0; s <= 80; s++) {
      const a = (s / 80) * Math.PI * 2
      const n =
        Math.sin(a * 3 + breath * 0.7 + ring) * 0.10 +
        Math.sin(a * 5 + breath * 1.2) * 0.06 +
        Math.sin(a * 7 + t * 0.28) * 0.03
      const px = c.x + Math.cos(a) * r * 1.28 * (1 + n)
      const py = c.y + Math.sin(a) * r * (1 + n)
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  }
}

function drawRoute(ctx, x0, y0, cp1x, cp1y, cp2x, cp2y, ex, ey, t, dir) {
  const drift = dir === 'west' ? 1 : -1
  for (let i = 0; i < 2; i++) {
    ctx.save()
    ctx.globalAlpha = 0.62 - i * 0.18
    ctx.strokeStyle = '#c8a96e'
    ctx.lineWidth = 1.5 - i * 0.3
    ctx.setLineDash([5, 12])
    ctx.lineDashOffset = -(t * 18) * drift - i * 8
    ctx.shadowBlur = 8
    ctx.shadowColor = 'rgba(200,169,110,0.45)'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey)
    ctx.stroke()
    ctx.restore()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroSection({ whiskies = [], onRegionSelect }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const tRef = useRef(0)
  const lastRef = useRef(null)
  const mouseRef = useRef({ x: -1, y: -1 })
  const hoverRef = useRef(null)
  const dimRef = useRef({ W: 0, H: 0, dpr: 1 })
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      dimRef.current = { W, H, dpr }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => { mouseRef.current = { x: -1, y: -1 } }
    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { W, H } = dimRef.current
      for (const r of SCOTTISH_REGIONS) {
        const p = project(r.lat, r.lon, W, H)
        if (Math.hypot(cx - p.x, cy - p.y) < 20) {
          onRegionSelect?.(r.id)
          return
        }
      }
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('click', onClick)

    const draw = (now) => {
      if (!lastRef.current) lastRef.current = now
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      tRef.current += dt
      const t = tRef.current
      const breath = t * 0.38

      const { W, H, dpr } = dimRef.current
      if (!W || !H) { frameRef.current = requestAnimationFrame(draw); return }

      const ctx = canvas.getContext('2d')
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = '#080808'
      ctx.fillRect(0, 0, W, H)

      // Centre glow
      const glow = ctx.createRadialGradient(W * 0.42, H * 0.5, 0, W * 0.42, H * 0.5, W * 0.48)
      glow.addColorStop(0, 'rgba(200,169,110,0.022)')
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // Edge vignette
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.25, W * 0.5, H * 0.5, W * 0.72)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,0,0.38)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      // Elevation contours
      ELEV_ZONES.forEach(z => drawElevContours(ctx, z, W, H, t, breath))

      // Named trade routes
      const camp = project(55.43, -5.62, W, H)  // Campbeltown
      const low  = project(55.88, -3.45, W, H)  // Lowlands
      const high = project(57.10, -4.10, W, H)  // Highlands

      // Campbeltown → Americas (S-curve west)
      drawRoute(ctx,
        camp.x, camp.y,
        camp.x - W * 0.04, camp.y - H * 0.14,
        W * 0.07, H * 0.64,
        -30, H * 0.57,
        t, 'west')

      // Lowlands → Taiwan (arcs SE)
      drawRoute(ctx,
        low.x, low.y,
        low.x + W * 0.09, low.y + H * 0.06,
        W * 0.80, H * 0.88,
        W + 30, H * 0.86,
        t, 'east')

      // Highlands → Japan (arcs NE)
      drawRoute(ctx,
        high.x, high.y,
        high.x + W * 0.12, high.y - H * 0.10,
        W * 0.83, H * 0.22,
        W + 30, H * 0.26,
        t, 'east')


      // ── Coastlines (real OSM data) ──
      const off = -t * 16

      // Mainland — most prominent line
      strokePoly(ctx, scotlandGeo.mainland, W, H, off, 0.96, 2.0)

      // Outer islands — slightly fainter
      strokePoly(ctx, scotlandGeo.island_2, W, H, off * 0.85, 0.68)   // Skye / S Hebrides
      strokePoly(ctx, scotlandGeo.island_3, W, H, off * 0.85, 0.62)   // Lewis & Harris
      strokePoly(ctx, scotlandGeo.island_4, W, H, off * 0.8,  0.55)   // Orkney
      strokePoly(ctx, scotlandGeo.island_5, W, H, off,        0.75)   // Islay (whisky region)

      // ── Region markers ──
      const { x: mx, y: my } = mouseRef.current
      let newHov = null

      SCOTTISH_REGIONS.forEach(region => {
        const pos = project(region.lat, region.lon, W, H)
        const tone = REGION_TONES[region.id]
        const isHov = hoverRef.current === region.id

        if (mx > 0 && Math.hypot(mx - pos.x, my - pos.y) < 22) newHov = region.id

        // Glow
        const scale = (H * 0.82) / LAT_SPAN
        const glowR = scale * (isHov ? 0.28 : 0.16)
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR)
        grad.addColorStop(0, tone + (isHov ? '30' : '18'))
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.save()
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Dot
        ctx.save()
        ctx.globalAlpha = isHov ? 1 : 0.68
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, isHov ? 5 : 3.2, 0, Math.PI * 2)
        ctx.fillStyle = tone
        ctx.shadowBlur = isHov ? 16 : 7
        ctx.shadowColor = tone
        ctx.fill()

        if (isHov) {
          ctx.globalAlpha = 0.35
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 10 + Math.sin(t * 2.8) * 1.8, 0, Math.PI * 2)
          ctx.strokeStyle = tone
          ctx.lineWidth = 1
          ctx.setLineDash([])
          ctx.stroke()
        }
        ctx.restore()

        // Label
        ctx.save()
        ctx.globalAlpha = isHov ? 1.0 : 0.55
        ctx.font = `${isHov ? '500' : '400'} 9px monospace`
        ctx.fillStyle = tone
        ctx.fillText(region.id.toUpperCase(), pos.x + 9, pos.y + 3)
        ctx.restore()
      })

      if (newHov !== hoverRef.current) {
        hoverRef.current = newHov
        setHoveredRegion(newHov)
      }

      ctx.restore()
      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frameRef.current)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  const activeRegion = hoveredRegion
    ? SCOTTISH_REGIONS.find(r => r.id === hoveredRegion)
    : null

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100vh',
      background: '#080808', overflow: 'hidden',
      cursor: hoveredRegion ? 'pointer' : 'default',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Nav scrim */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 130,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.52), rgba(0,0,0,0))',
        pointerEvents: 'none',
      }} />

      {/* Tagline — desktop only */}
      {!isMobile && (
        <div style={{
          position: 'absolute',
          ...(isMobile
            ? { left: '50%', top: '42%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '82%' }
            : { right: 120, top: '50%', transform: 'translateY(-50%)', textAlign: 'right' }
          ),
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'Ronzino, sans-serif',
            fontSize: isMobile ? 30 : 42,
            fontWeight: 600,
            color: '#ffffff', letterSpacing: '0.01em', lineHeight: 1.15,
            textShadow: '0 2px 24px rgba(0,0,0,0.5)',
          }}>
            The Whisky World,<br />Made Legible.
          </div>
          <div style={{
            marginTop: 14, height: 1,
            background: isMobile
              ? 'linear-gradient(to right, rgba(200,169,110,0), rgba(200,169,110,0.70), rgba(200,169,110,0))'
              : 'linear-gradient(to left, rgba(200,169,110,0.70), rgba(200,169,110,0))',
          }} />
          <div style={{
            marginTop: 10, fontFamily: 'monospace', fontSize: 8,
            letterSpacing: '0.20em', color: 'rgba(200,169,110,0.72)',
            textTransform: 'uppercase',
          }}>
            57°36′N · 3°59′W · Scotland
          </div>
        </div>
      )}

      {/* Grain */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}>
        <filter id='gra'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter>
        <rect width='100%' height='100%' filter='url(#gra)'/>
      </svg>

      {/* Hover tooltip */}
      {activeRegion && (
        <div style={{
          position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'none', textAlign: 'center', animation: 'fadeUp 0.18s ease',
        }}>
          <div style={{ fontFamily: 'Ronzino, sans-serif', fontSize: 18, color: '#f5e6c8', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 4 }}>
            {activeRegion.id}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(200,169,110,0.52)', letterSpacing: '0.06em' }}>
            {activeRegion.note}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(200,169,110,0.28)', letterSpacing: '0.14em', marginTop: 4 }}>
            Click to explore
          </div>
        </div>
      )}

      {/* Coordinate mark */}
      <div style={{
        position: 'absolute', bottom: 22, left: 28,
        fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.14em',
        color: 'rgba(200,169,110,0.45)', pointerEvents: 'none',
      }}>
        57°N 4°W
      </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: 'Ronzino, sans-serif', fontSize: 11, letterSpacing: '0.18em',
          color: 'rgba(200,169,110,0.72)', textTransform: 'uppercase', fontWeight: 500,
        }}>
          Scroll to explore
        </div>
        <svg width="36" height="20" viewBox="0 0 36 20" fill="none" style={{ animation: 'scrollBounce 2.2s ease-in-out infinite' }}>
          <polyline points="2,2 18,18 34,2" stroke="rgba(200,169,110,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50%       { transform: translateY(4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

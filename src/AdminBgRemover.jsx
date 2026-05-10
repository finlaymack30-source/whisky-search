import { useState } from 'react'

// Use REST API directly — Supabase JS client blocks service keys in the browser
const BASE = 'https://bxqokujhuofblkrzvlke.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY
const BUCKET = 'whisky-images'
const H = { Authorization: `Bearer ${KEY}`, apikey: KEY }

async function getWhiskies() {
  const res = await fetch(
    `${BASE}/rest/v1/whiskies?select=id,title,image_url&image_url=not.is.null&image_url=like.*supabase.co*&order=id`,
    { headers: { ...H, Accept: 'application/json' } }
  )
  return res.json()
}

async function uploadPng(id, buffer) {
  const filename = `${id}.png`
  const res = await fetch(`${BASE}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'image/png', 'x-upsert': 'true' },
    body: buffer,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return `${BASE}/storage/v1/object/public/${BUCKET}/${filename}`
}

async function updateImageUrl(id, url) {
  const res = await fetch(`${BASE}/rest/v1/whiskies?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ image_url: url }),
  })
  if (!res.ok) throw new Error(`DB update failed: ${res.status}`)
}
const TOLERANCE = 32

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function detectBackground(data, w, h) {
  const pts = []
  for (let i = 0; i < 5; i++) {
    pts.push([i, 0], [w - 1 - i, 0], [i, h - 1], [w - 1 - i, h - 1])
    pts.push([0, i], [w - 1, i], [0, h - 1 - i], [w - 1, h - 1 - i])
  }
  const rs = [], gs = [], bs = []
  for (const [x, y] of pts) {
    const i = (y * w + x) * 4
    rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2])
  }
  const med = arr => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)]
  return [med(rs), med(gs), med(bs)]
}

function processImageData(imageData) {
  const { data, width: w, height: h } = imageData
  const [bgR, bgG, bgB] = detectBackground(data, w, h)
  if ((bgR + bgG + bgB) / 3 < 185) return false

  const isBg = (pos) => {
    const i = pos * 4
    return colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) < TOLERANCE
  }

  const removed = new Uint8Array(w * h)
  const stack = []
  const tryAdd = (pos) => { if (!removed[pos] && isBg(pos)) { removed[pos] = 1; stack.push(pos) } }

  for (let x = 0; x < w; x++) { tryAdd(x); tryAdd((h - 1) * w + x) }
  for (let y = 1; y < h - 1; y++) { tryAdd(y * w); tryAdd(y * w + w - 1) }

  while (stack.length) {
    const pos = stack.pop()
    const px = pos % w, py = Math.floor(pos / w)
    if (px > 0) tryAdd(pos - 1)
    if (px < w - 1) tryAdd(pos + 1)
    if (py > 0) tryAdd(pos - w)
    if (py < h - 1) tryAdd(pos + w)
  }

  for (let pos = 0; pos < w * h; pos++) {
    const i = pos * 4
    if (removed[pos]) {
      data[i + 3] = 0
    } else {
      const px = pos % w, py = Math.floor(pos / w)
      const adj =
        (px > 0 && removed[pos - 1]) || (px < w - 1 && removed[pos + 1]) ||
        (py > 0 && removed[pos - w]) || (py < h - 1 && removed[pos + w])
      if (adj) {
        const dist = colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB)
        data[i + 3] = Math.min(data[i + 3], Math.round(255 * Math.min(1, dist / (TOLERANCE * 0.8))))
      }
    }
  }
  return true
}

export default function AdminBgRemover() {
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const addLog = (msg, type = 'info') => setLog(prev => [...prev, { msg, type }])

  async function processAll() {
    setRunning(true)
    setLog([])

    let whiskies
    try {
      whiskies = await getWhiskies()
      if (!Array.isArray(whiskies)) throw new Error(whiskies?.message || 'Unexpected response')
    } catch (e) {
      addLog(`Error fetching whiskies: ${e.message}`, 'error')
      setRunning(false)
      return
    }

    setProgress({ done: 0, total: whiskies.length })
    addLog(`${whiskies.length} images to process…`)

    let done = 0, skipped = 0, failed = 0

    for (let i = 0; i < whiskies.length; i++) {
      const w = whiskies[i]

      try {
        const res = await fetch(w.image_url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)

        const img = await new Promise((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('Image load failed'))
          el.src = objectUrl
        })
        URL.revokeObjectURL(objectUrl)

        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const processed = processImageData(imageData)

        if (!processed) {
          addLog(`~ ${w.title}`, 'skip')
          skipped++
          setProgress({ done: i + 1, total: whiskies.length })
          await new Promise(r => setTimeout(r, 10))
          continue
        }

        ctx.putImageData(imageData, 0, 0)
        const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        const pngBuffer = await pngBlob.arrayBuffer()

        const publicUrl = await uploadPng(w.id, pngBuffer)
        await updateImageUrl(w.id, publicUrl)

        addLog(`✓ ${w.title}`, 'ok')
        done++
      } catch (e) {
        addLog(`✗ ${w.title}: ${e.message}`, 'error')
        failed++
      }

      setProgress({ done: i + 1, total: whiskies.length })
      await new Promise(r => setTimeout(r, 40))
    }

    addLog(`Done — ${done} processed, ${skipped} skipped, ${failed} failed.`, 'info')
    setRunning(false)
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div style={{ padding: 48, fontFamily: 'monospace', background: '#080808', minHeight: '100vh', color: '#888' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 8 }}>
          Admin
        </div>
        <h2 style={{ color: '#f5e6c8', fontFamily: 'Ronzino, sans-serif', fontSize: 28, fontWeight: 700, marginBottom: 32 }}>
          Background Removal
        </h2>

        {progress.total > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ background: '#1a1a1a', borderRadius: 3, height: 6, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ background: '#c8a96e', height: '100%', width: `${pct}%`, transition: 'width 0.3s ease', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, color: '#555' }}>{progress.done} / {progress.total} — {pct}%</span>
          </div>
        )}

        <button
          onClick={processAll}
          disabled={running}
          style={{
            padding: '10px 28px', marginBottom: 32,
            background: running ? '#1a1a1a' : '#c8a96e',
            color: running ? '#555' : '#1a1208',
            border: 'none', borderRadius: 3,
            cursor: running ? 'not-allowed' : 'pointer',
            fontFamily: 'Ronzino, sans-serif', fontSize: 13, fontWeight: 500,
          }}>
          {running ? 'Processing…' : 'Remove All Backgrounds'}
        </button>

        <div style={{ height: 480, overflowY: 'auto', fontSize: 12, lineHeight: 2 }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: l.type === 'ok' ? '#6aaa78' : l.type === 'error' ? '#aa6666' : l.type === 'skip' ? '#555' : '#888' }}>
              {l.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

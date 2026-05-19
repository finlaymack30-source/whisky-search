// Removes backgrounds from all whisky bottle images in Supabase Storage
// Requires: npm install jimp@0
// Run: node scripts/remove-all-bg.js

import Jimp from 'jimp'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET = 'whisky-images'
const TOLERANCE = 32

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

async function processImage(imageBuffer) {
  let img
  try {
    img = await Jimp.read(imageBuffer)
  } catch {
    return null // unsupported format (e.g. WebP)
  }

  const w = img.bitmap.width
  const h = img.bitmap.height
  const data = img.bitmap.data

  const [bgR, bgG, bgB] = detectBackground(data, w, h)
  if ((bgR + bgG + bgB) / 3 < 185) return null // dark/coloured bg, skip

  const isBg = (pos) => {
    const i = pos * 4
    return colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) < TOLERANCE
  }

  const removed = new Uint8Array(w * h)
  const stack = []

  const tryAdd = (pos) => {
    if (!removed[pos] && isBg(pos)) { removed[pos] = 1; stack.push(pos) }
  }

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
      const hasRemovedNeighbour =
        (px > 0 && removed[pos - 1]) || (px < w - 1 && removed[pos + 1]) ||
        (py > 0 && removed[pos - w]) || (py < h - 1 && removed[pos + w])
      if (hasRemovedNeighbour) {
        const dist = colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB)
        data[i + 3] = Math.min(data[i + 3], Math.round(255 * Math.min(1, dist / (TOLERANCE * 0.8))))
      }
    }
  }

  return img.getBufferAsync(Jimp.MIME_PNG)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  const { data: whiskies, error } = await supabase
    .from('whiskies')
    .select('id, title, image_url')
    .not('image_url', 'is', null)
    .like('image_url', '%supabase.co%')

  if (error) { console.error(error.message); process.exit(1) }

  console.log(`${whiskies.length} images to process...\n`)

  let done = 0, skipped = 0, failed = 0

  for (let i = 0; i < whiskies.length; i++) {
    const w = whiskies[i]
    process.stdout.write(`[${i + 1}/${whiskies.length}] ${w.title} ... `)

    try {
      const res = await fetch(w.image_url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const imgBuffer = Buffer.from(await res.arrayBuffer())
      const pngBuffer = await processImage(imgBuffer)

      if (!pngBuffer) {
        console.log('~ skipped')
        skipped++
        continue
      }

      const filename = `${w.id}.png`
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filename, pngBuffer, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)
      await supabase.from('whiskies').update({ image_url: publicUrl }).eq('id', w.id)

      console.log('✓')
      done++
    } catch (e) {
      console.log(`✗ ${e.message}`)
      failed++
    }

    if (i < whiskies.length - 1) await sleep(350)
  }

  console.log(`\nDone. ${done} processed, ${skipped} skipped, ${failed} failed.`)
}

run()

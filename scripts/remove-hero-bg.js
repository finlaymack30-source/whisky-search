// Removes white backgrounds from the 5 featured carousel images
// Requires: npm install sharp
// Run: node scripts/remove-hero-bg.js

import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bxqokujhuofblkrzvlke.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET = 'whisky-images'
const THRESHOLD = 230 // pixels with all R,G,B above this become transparent

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getFeaturedWhiskies() {
  const { data } = await supabase
    .from('whiskies')
    .select('id, title, distillery, region, score, price_gbp, image_url, tasting_note')
    .not('image_url', 'is', null)
    .not('tasting_note', 'is', null)

  if (!data) return []

  const sanaig = data.find(w => w.title?.toLowerCase().includes('sanaig'))
  const seenDistilleries = new Set()
  const seenRegions = new Set()
  const results = []

  const pool = [...data]
    .filter(w => w.region !== 'American' && (!w.price_gbp || w.price_gbp <= 400))
    .sort((a, b) => b.score - a.score)

  if (sanaig) {
    results.push(sanaig)
    seenDistilleries.add(sanaig.distillery)
    seenRegions.add(sanaig.region)
  }

  for (const w of pool) {
    if (results.length >= 5) break
    if (seenDistilleries.has(w.distillery) || seenRegions.has(w.region)) continue
    results.push(w)
    seenDistilleries.add(w.distillery)
    seenRegions.add(w.region)
  }

  return results
}

async function removeBackground(imageUrl) {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())

  // Decode to raw RGBA
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data)

  // Flood fill from all four edges to find connected white regions
  // This avoids removing whites inside the bottle (labels, glass highlights)
  const w = info.width
  const h = info.height
  const visited = new Uint8Array(w * h)
  const queue = []

  const isWhitish = (i) => pixels[i] > THRESHOLD && pixels[i + 1] > THRESHOLD && pixels[i + 2] > THRESHOLD

  // Seed from all edge pixels
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const idx = (y * w + x) * 4
      if (isWhitish(idx) && !visited[y * w + x]) {
        visited[y * w + x] = 1
        queue.push(y * w + x)
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const idx = (y * w + x) * 4
      if (isWhitish(idx) && !visited[y * w + x]) {
        visited[y * w + x] = 1
        queue.push(y * w + x)
      }
    }
  }

  // BFS flood fill
  while (queue.length > 0) {
    const pos = queue.pop()
    const px = pos % w
    const py = Math.floor(pos / w)
    pixels[pos * 4 + 3] = 0 // make transparent

    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = px + dx
      const ny = py + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const npos = ny * w + nx
      if (visited[npos]) continue
      const nidx = npos * 4
      if (isWhitish(nidx)) {
        visited[npos] = 1
        queue.push(npos)
      }
    }
  }

  // Re-encode as PNG with alpha
  return sharp(Buffer.from(pixels), { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer()
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('Fetching featured carousel whiskies...')
  const whiskies = await getFeaturedWhiskies()
  console.log(`Processing ${whiskies.length} images...\n`)

  for (const w of whiskies) {
    process.stdout.write(`[${w.title}] ... `)
    try {
      const pngBuffer = await removeBackground(w.image_url)
      const filename = `${w.id}.png`

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, pngBuffer, { contentType: 'image/png', upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)
      await supabase.from('whiskies').update({ image_url: publicUrl }).eq('id', w.id)
      console.log('✓')
    } catch (e) {
      console.log(`✗ ${e.message}`)
    }
    await sleep(300)
  }

  console.log('\nDone. Refresh the carousel to see transparent backgrounds.')
}

run()

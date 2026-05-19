import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET = 'whisky-images'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Referer': 'https://www.google.com/',
}

async function searchImages(title, distillery) {
  const query = encodeURIComponent(`${title} ${distillery} whisky bottle`)
  const initRes = await fetch(`https://duckduckgo.com/?q=${query}&iax=images&ia=images`, { headers: HEADERS })
  const initHtml = await initRes.text()
  const vqdMatch = initHtml.match(/vqd=["']([^"']+)["']/)
  if (!vqdMatch) return []
  const vqd = vqdMatch[1]
  const imgRes = await fetch(
    `https://duckduckgo.com/i.js?q=${query}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`,
    { headers: { ...HEADERS, Referer: 'https://duckduckgo.com/' } }
  )
  const data = await imgRes.json()
  return (data.results || []).slice(0, 8).map(r => r.image).filter(Boolean)
}

async function tryDownload(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength < 2000) return null // skip tiny/placeholder images
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    return { buffer, contentType, ext }
  } catch {
    return null
  }
}

async function uploadToStorage(id, buffer, contentType, ext) {
  const filename = `${id}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType, upsert: true })
  if (error) return null
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return publicUrl
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  const { data: whiskies, error } = await supabase
    .from('whiskies')
    .select('id, title, distillery')
    .is('image_url', null)

  if (error) { console.error(error.message); process.exit(1) }

  console.log(`${whiskies.length} whiskies missing images — searching and re-hosting...\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < whiskies.length; i++) {
    const w = whiskies[i]
    process.stdout.write(`[${i + 1}/${whiskies.length}] ${w.title} ... `)

    try {
      const urls = await searchImages(w.title, w.distillery)
      let saved = false

      for (const url of urls) {
        const img = await tryDownload(url)
        if (!img) continue
        const publicUrl = await uploadToStorage(w.id, img.buffer, img.contentType, img.ext)
        if (!publicUrl) continue
        await supabase.from('whiskies').update({ image_url: publicUrl }).eq('id', w.id)
        console.log('✓')
        success++
        saved = true
        break
      }

      if (!saved) {
        console.log('✗ no downloadable image found')
        failed++
      }
    } catch (e) {
      console.log(`✗ ${e.message}`)
      failed++
    }

    if (i < whiskies.length - 1) await sleep(1500)
  }

  console.log(`\nDone. ${success} saved, ${failed} not found.`)
}

run()

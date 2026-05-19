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

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Bucket creation failed: ${error.message}`)
    console.log(`Created storage bucket: ${BUCKET}\n`)
  }
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return null
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) return null
  const buffer = await res.arrayBuffer()
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  return { buffer, contentType, ext }
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
  await ensureBucket()

  const { data: whiskies, error } = await supabase
    .from('whiskies')
    .select('id, title, image_url')
    .not('image_url', 'is', null)

  if (error) { console.error(error.message); process.exit(1) }

  // Skip images already hosted in our Supabase storage
  const toProcess = whiskies.filter(w => !w.image_url.includes('supabase.co/storage'))

  console.log(`${toProcess.length} externally-hosted images to check and re-host...\n`)

  let rehosted = 0
  let failed = 0

  for (let i = 0; i < toProcess.length; i++) {
    const w = toProcess[i]
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${w.title} ... `)

    try {
      const img = await fetchImage(w.image_url)

      if (img) {
        const newUrl = await uploadToStorage(w.id, img.buffer, img.contentType, img.ext)
        if (newUrl) {
          await supabase.from('whiskies').update({ image_url: newUrl }).eq('id', w.id)
          console.log('✓ re-hosted')
          rehosted++
        } else {
          console.log('✗ upload failed')
          failed++
        }
      } else {
        // URL is blocked or broken — clear it so placeholder shows
        await supabase.from('whiskies').update({ image_url: null }).eq('id', w.id)
        console.log('✗ blocked/broken — cleared')
        failed++
      }
    } catch (e) {
      console.log(`✗ ${e.message}`)
      failed++
    }

    if (i < toProcess.length - 1) await sleep(200)
  }

  console.log(`\nDone. ${rehosted} re-hosted to Supabase Storage, ${failed} cleared.`)
}

run()

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-GB,en;q=0.9',
}

async function searchImage(title, distillery) {
  const query = encodeURIComponent(`${title} ${distillery} whisky bottle`)

  // Step 1: get DuckDuckGo vqd token
  const initRes = await fetch(`https://duckduckgo.com/?q=${query}&iax=images&ia=images`, { headers: HEADERS })
  const initHtml = await initRes.text()
  const vqdMatch = initHtml.match(/vqd=["']([^"']+)["']/)
  if (!vqdMatch) return null
  const vqd = vqdMatch[1]

  // Step 2: fetch image results
  const imgRes = await fetch(
    `https://duckduckgo.com/i.js?q=${query}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`,
    { headers: { ...HEADERS, Referer: 'https://duckduckgo.com/' } }
  )
  const data = await imgRes.json()
  const results = data.results || []
  return results[0]?.image ?? null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  const { data: whiskies, error } = await supabase
    .from('whiskies')
    .select('id, title, distillery')
    .is('image_url', null)

  if (error) { console.error('Supabase error:', error.message); process.exit(1) }

  console.log(`${whiskies.length} whiskies without images — fetching via DuckDuckGo...\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < whiskies.length; i++) {
    const w = whiskies[i]
    process.stdout.write(`[${i + 1}/${whiskies.length}] ${w.title} ... `)

    try {
      const imageUrl = await searchImage(w.title, w.distillery)
      if (imageUrl) {
        await supabase.from('whiskies').update({ image_url: imageUrl }).eq('id', w.id)
        console.log('✓')
        success++
      } else {
        console.log('✗ not found')
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

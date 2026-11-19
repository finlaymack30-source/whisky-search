// Fetches current prices from Whiskybase and caches them in Supabase.
//
// Setup (first time only):
//   npm install -D playwright
//   npx playwright install chromium
//
// Usage:
//   SUPABASE_SERVICE_KEY=... node scripts/whiskybase-prices.js --match    # find Whiskybase IDs
//   SUPABASE_SERVICE_KEY=... node scripts/whiskybase-prices.js --update   # refresh prices
//   SUPABASE_SERVICE_KEY=... node scripts/whiskybase-prices.js --match --update  # both
//   ... --id=42   # run for a single whisky ID only

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { createClient } from '@supabase/supabase-js'

chromium.use(StealthPlugin())

const SUPABASE_URL = 'https://bxqokujhuofblkrzvlke.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getEurToGbp() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR')
    const json = await res.json()
    return json.rates?.GBP ?? 0.855
  } catch {
    return 0.855 // fallback
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function similarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const wordsA = new Set(na.split(' ').filter(w => w.length > 2))
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 2))
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  return (2 * intersection) / (wordsA.size + wordsB.size)
}

async function searchWhiskybase(page, title, debug = false) {
  const url = `https://www.whiskybase.com/search?q=${encodeURIComponent(title)}`
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
  } catch {
    // fall through — try reading what loaded
  }
  await page.waitForTimeout(2000)

  if (debug) {
    const html = await page.content()
    const fs = await import('fs')
    fs.writeFileSync('/tmp/wb-debug.html', html)
    await page.screenshot({ path: '/tmp/wb-debug.png', fullPage: true })
    console.log('\n[debug] Saved HTML → /tmp/wb-debug.html, screenshot → /tmp/wb-debug.png')
  }

  // Grab every link that contains /bottle/{id} — avoids fragile container selectors
  const results = await page.evaluate(() => {
    const seen = new Set()
    return Array.from(document.querySelectorAll('a[href*="/whisky/"]'))
      .map(a => {
        const idMatch = a.href.match(/\/whisky\/(\d+)/)
        if (!idMatch) return null
        const id = parseInt(idMatch[1])
        if (seen.has(id)) return null
        seen.add(id)
        // Walk up to find the closest text that looks like a bottle name
        const nameEl = a.querySelector('strong, [class*="name"], [class*="title"]')
          ?? a.closest('li, tr, [class*="item"], [class*="result"]')
              ?.querySelector('strong, [class*="name"], [class*="title"], h3, h4')
        const title = (nameEl?.textContent ?? a.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
        return { id, title, href: a.href }
      })
      .filter(Boolean)
      .slice(0, 12)
  })

  if (debug) console.log('[debug] bottle links found:', JSON.stringify(results, null, 2))
  if (!results.length) return null

  let best = null
  let bestScore = 0
  for (const r of results) {
    const score = similarity(title, r.title ?? '')
    if (score > bestScore) { bestScore = score; best = r }
  }

  return bestScore >= 0.45 ? { ...best, matchScore: bestScore } : null
}

async function fetchPrices(page, whiskybaseId) {
  const url = `https://www.whiskybase.com/whiskies/whisky/${whiskybaseId}`
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
  } catch {
    // networkidle can timeout on heavy pages — try reading anyway
  }
  await page.waitForTimeout(2000)

  return page.evaluate(() => {
    const body = document.body.innerText ?? ''

    // "Found 52 online shops"
    const shopMatch = body.match(/Found\s+(\d+)\s+online\s+shop/i)
    const shopCount = shopMatch ? parseInt(shopMatch[1]) : null

    // Collect all GBP prices and take the lowest (UK retailers show £)
    // Cap at £800 — anything higher is likely a rare/old bottling mismatch
    const gbpPrices = [...body.matchAll(/£\s*([\d,]+\.\d{2})/g)]
      .map(m => parseFloat(m[1].replace(',', '')))
      .filter(p => p > 0 && p <= 800)
    const lowestGbp = gbpPrices.length ? Math.min(...gbpPrices) : null

    // Fall back to EUR lowest if no GBP prices
    let lowestEur = null
    if (!lowestGbp) {
      const eurMatch = body.match(/[Ll]owest price[^€]*€\s*([\d,]+\.?\d*)/i)
        ?? body.match(/€\s*([\d,]+\.\d{2})/)
      if (eurMatch) lowestEur = parseFloat(eurMatch[1].replace(',', ''))
    }

    return { shopCount, lowestGbp, lowestEur }
  })
}

async function run() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Set SUPABASE_SERVICE_KEY env var')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const doMatch = args.includes('--match')
  const doUpdate = args.includes('--update') || !doMatch
  const debug = args.includes('--debug')
  const singleId = args.find(a => /^--id=\d+$/.test(a))?.split('=')[1]

  const eurToGbp = await getEurToGbp() // fallback for bottles with no GBP price listed

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  try {
    // ── Phase 1: Match bottles to Whiskybase IDs ──────────────────────────────
    if (doMatch) {
      let q = supabase.from('whiskies').select('id, title').is('whiskybase_id', null).order('id')
      if (singleId) q = q.eq('id', singleId)
      const { data: whiskies, error } = await q
      if (error) { console.error(error.message); process.exit(1) }

      console.log(`Matching ${whiskies.length} bottles to Whiskybase...\n`)

      for (let i = 0; i < whiskies.length; i++) {
        const w = whiskies[i]
        process.stdout.write(`[${i + 1}/${whiskies.length}] ${w.title} ... `)

        try {
          const match = await searchWhiskybase(page, w.title, debug)
          if (match) {
            const pct = (match.matchScore * 100).toFixed(0)
            console.log(`✓ ID ${match.id} (${pct}% — "${match.title}")`)
            await supabase.from('whiskies').update({ whiskybase_id: match.id }).eq('id', w.id)
          } else {
            console.log('~ no match')
          }
        } catch (e) {
          console.log(`✗ ${e.message}`)
        }

        await sleep(2000 + Math.random() * 2000) // 2–4s random to avoid rate limiting
      }
      console.log()
    }

    // ── Phase 2: Fetch prices for matched bottles ─────────────────────────────
    if (doUpdate) {
      let q = supabase.from('whiskies').select('id, title, whiskybase_id').not('whiskybase_id', 'is', null).order('id')
      if (singleId) q = q.eq('id', singleId)
      const { data: whiskies, error } = await q
      if (error) { console.error(error.message); process.exit(1) }

      console.log(`Refreshing prices for ${whiskies.length} bottles...\n`)

      let done = 0, noPrice = 0, failed = 0

      for (let i = 0; i < whiskies.length; i++) {
        const w = whiskies[i]
        process.stdout.write(`[${i + 1}/${whiskies.length}] ${w.title} ... `)

        try {
          const { shopCount, lowestGbp, lowestEur } = await fetchPrices(page, w.whiskybase_id)
          const priceGbp = lowestGbp ?? (lowestEur ? Math.round(lowestEur * eurToGbp) : null)

          if (priceGbp) {
            await supabase.from('whiskies').update({
              price_gbp: priceGbp,
              price_shop_count: shopCount,
              price_updated_at: new Date().toISOString(),
            }).eq('id', w.id)
            const src = lowestGbp ? `£${priceGbp}` : `€${lowestEur} → £${priceGbp}`
            console.log(`✓  ${src}${shopCount ? `, ${shopCount} shops` : ''}`)
            done++
          } else {
            console.log(`~ no price found${shopCount ? ` (${shopCount} shops listed but price unreadable)` : ''}`)
            noPrice++
          }
        } catch (e) {
          console.log(`✗ ${e.message}`)
          failed++
        }

        await sleep(1100)
      }

      console.log(`\nDone — ${done} updated, ${noPrice} no price, ${failed} failed.`)
    }
  } finally {
    await browser.close()
  }
}

run()

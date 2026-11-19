/**
 * Scrapes The Whisky Exchange full catalog into Supabase.
 *
 * SQL migration — run in Supabase SQL Editor before first use:
 *
 *   ALTER TABLE whiskies ADD COLUMN IF NOT EXISTS twe_url TEXT;
 *
 *   -- Dedup any existing rows before adding the constraint:
 *   DELETE FROM whiskies a USING whiskies b
 *     WHERE a.id > b.id AND a.twe_url IS NOT NULL AND a.twe_url = b.twe_url;
 *   ALTER TABLE whiskies ADD CONSTRAINT whiskies_twe_url_unique UNIQUE (twe_url);
 *
 *   CREATE TABLE IF NOT EXISTS price_history (
 *     id BIGSERIAL PRIMARY KEY,
 *     whisky_id INTEGER NOT NULL REFERENCES whiskies(id) ON DELETE CASCADE,
 *     price_gbp NUMERIC(10,2) NOT NULL,
 *     source TEXT NOT NULL DEFAULT 'twe',
 *     recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_price_history_whisky
 *     ON price_history(whisky_id, recorded_at DESC);
 *
 * Prerequisites (first time only):
 *   npx playwright install chromium
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node scripts/twe-catalog.js
 *   SUPABASE_SERVICE_KEY=... node scripts/twe-catalog.js --resume
 *   SUPABASE_SERVICE_KEY=... node scripts/twe-catalog.js --dry-run
 *   SUPABASE_SERVICE_KEY=... node scripts/twe-catalog.js --enrich
 *   SUPABASE_SERVICE_KEY=... node scripts/twe-catalog.js --category=single-malt-scotch-whisky
 *   SUPABASE_SERVICE_KEY=... node scripts/twe-catalog.js --debug
 *   SUPABASE_SERVICE_KEY=... node scripts/twe-catalog.js --reset-category=single-malt-scotch-whisky
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { createBrowser, createPage, sleep, jitter, navigate, withRetry } from './lib/browser.js'
import { upsertBottle, upsertBottles } from './lib/db.js'
import { normaliseBottle } from './lib/normalise.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.thewhiskyexchange.com'

const CATEGORIES = [
  { id: 40,  slug: 'single-malt-scotch-whisky', type: 'Single Malt' },
  { id: 304, slug: 'blended-scotch-whisky',      type: 'Blend'       },
  { id: 310, slug: 'grain-scotch-whisky',         type: 'Single Grain'},
  { id: 32,  slug: 'irish-whiskey',               type: 'Irish'       },
  { id: 35,  slug: 'japanese-whisky',             type: 'Japanese'    },
  { id: 33,  slug: 'american-whiskey',            type: 'Bourbon'     },
  { id: 317, slug: 'indian-whisky',               type: 'Indian'      },
  { id: 540, slug: 'taiwanese-whisky',            type: 'Taiwan'      },
]

/** Maximum price in GBP — filter out gift sets / cases */
const MAX_PRICE = 2000

/** Concurrency cap for product-page enrichment */
const ENRICH_CONCURRENCY = 2

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROGRESS_FILE = path.join(__dirname, '.twe-progress.json')

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const FLAGS = {
  resume:        args.includes('--resume'),
  dryRun:        args.includes('--dry-run'),
  enrich:        args.includes('--enrich'),
  debug:         args.includes('--debug'),
  category:      (args.find(a => a.startsWith('--category=')) ?? '').replace('--category=', '') || null,
  resetCategory: (args.find(a => a.startsWith('--reset-category=')) ?? '').replace('--reset-category=', '') || null,
}

// ── Progress file ─────────────────────────────────────────────────────────────

/**
 * Load saved scrape progress from disk.
 * Returns a fresh skeleton if the file does not exist or is unreadable.
 *
 * @returns {{ categories: Record<string, object>, lastRun: string|null }}
 */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
    }
  } catch {
    console.warn('[progress] could not read progress file — starting fresh')
  }
  return { categories: {}, lastRun: null }
}

/**
 * Persist progress to disk synchronously.
 *
 * @param {object} progress
 */
function saveProgress(progress) {
  progress.lastRun = new Date().toISOString()
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Return the ordered list of URLs to try for a category page.
 * TWE uses both /c/{slug} and /c/1/{slug} patterns.
 *
 * @param {string} slug
 * @param {number} page  1-based page number
 * @returns {string[]}
 */
function categoryUrls(id, slug, page) {
  const pg = page > 1 ? `?pg=${page}` : ''
  return [`${BASE_URL}/c/${id}/${slug}${pg}`]
}

// ── Catalog page scraping ─────────────────────────────────────────────────────

/**
 * Scrape all product cards from a loaded catalog page.
 * Tries class-based selectors first, falls back to href pattern matching.
 *
 * @param {import('playwright').Page} page
 * @param {string} defaultType  Category-level type hint
 * @returns {Promise<object[]>}
 */
async function scrapeProductCards(page, defaultType) {
  return page.evaluate(({ BASE_URL, defaultType, MAX_PRICE }) => {
    const cards = []

    // Each product card is itself the <a> element: <a class="product-card" href="/p/{id}/{slug}">
    const cardEls = document.querySelectorAll('a.product-card[href*="/p/"]')

    for (const card of cardEls) {
      const href = card.getAttribute('href') ?? ''
      const twe_url = href.startsWith('http') ? href : `${BASE_URL}${href}`

      const name = (card.querySelector('.product-card__name')?.textContent ?? '').trim()
      if (!name) continue

      // product-card__meta = "70cl / 43%" — extract ABV
      const metaText = card.querySelector('.product-card__meta')?.textContent ?? ''
      const abvMatch = metaText.match(/(\d+(?:\.\d+)?)\s*%/)
      const abv = abvMatch ? parseFloat(abvMatch[1]) : null

      const priceText = card.querySelector('.product-card__price')?.textContent ?? ''
      const priceMatch = priceText.match(/£(\d[\d,]*(?:\.\d{1,2})?)/)
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null
      if (price !== null && price > MAX_PRICE) continue

      // Image src is a full URL on listing pages (no lazy data-src)
      const imgEl = card.querySelector('img.product-card__image') ?? card.querySelector('img')
      const image_url = imgEl?.getAttribute('src') ?? null

      cards.push({
        title: name,
        distillery: null,
        abv,
        twe_url,
        buy_url: twe_url,
        price_gbp: price,
        image_url,
        type: defaultType,
        categoryHint: defaultType,
      })
    }

    return cards
  }, { BASE_URL, defaultType, MAX_PRICE })
}

// ── Product page enrichment ───────────────────────────────────────────────────

/**
 * Visit a TWE product page and extract detailed metadata.
 * Returns a partial record — only fields that were successfully extracted.
 *
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<object>}
 */
async function scrapeProductPage(page, url) {
  const response = await navigate(page, url, { timeout: 30_000 })
  if (!response) return {}

  await sleep(jitter(600, 1200))

  return page.evaluate(({ MAX_PRICE }) => {
    const data = {}

    // Title
    const titleEl =
      document.querySelector('.product-main__name') ??
      document.querySelector('h1')
    if (titleEl) data.title = (titleEl.textContent ?? '').trim()

    // Sub-name / distillery
    const subNameEl = document.querySelector('.product-main__sub-name')
    if (subNameEl) data.distillery = (subNameEl.textContent ?? '').trim()

    // Price
    const priceEl =
      document.querySelector('.product-main__price') ??
      document.querySelector('.product-main__data .price')
    const priceText = priceEl?.textContent ?? ''
    const priceMatch = priceText.match(/£(\d[\d,]*(?:\.\d{1,2})?)/)
    if (priceMatch) {
      const p = parseFloat(priceMatch[1].replace(/,/g, ''))
      if (p > 0 && p <= MAX_PRICE) data.price_gbp = p
    }

    // Specs — .product-main__meta-list li items
    const specItems = document.querySelectorAll('.product-main__meta-list li')
    for (const item of specItems) {
      const label = (item.querySelector('strong')?.textContent ?? '').toLowerCase().trim()
      const value = (item.querySelector('span')?.textContent ?? '').trim()
      if (!label || !value) continue

      if (label.includes('age') || label.includes('year')) data.age = value
      else if (label.includes('abv') || label.includes('strength')) data.abv = value
      else if (label.includes('region')) data.region = value
      else if (label.includes('distillery') || label.includes('producer')) data.distillery = value
      else if (label.includes('cask')) data.cask_type = value
    }

    // Tasting notes
    const legalPatterns = /copyright|terms|privacy|©|all rights reserved/i
    const candidates = [
      document.querySelector('.product-main__description'),
      document.querySelector('.tasting-notes'),
      ...(Array.from(document.querySelectorAll('p')).filter(p => {
        const t = (p.textContent ?? '').trim()
        return t.length > 80 && !legalPatterns.test(t)
      })),
    ]
    for (const el of candidates) {
      if (!el) continue
      const text = (el.textContent ?? '').trim()
      if (text.length > 80 && !legalPatterns.test(text)) {
        data.tasting_note = text
        break
      }
    }

    return data
  }, { MAX_PRICE })
}

// ── Enrichment pool ───────────────────────────────────────────────────────────

/**
 * Enrich a batch of products with metadata from their product pages.
 * Each concurrent worker gets its own dedicated page to avoid navigation
 * conflicts. Pages are reused across the batch and closed when done.
 * Mutates the products array in-place.
 *
 * @param {object[]} products
 * @param {import('playwright').Browser} browser
 * @returns {Promise<void>}
 */
async function enrichProducts(products, browser) {
  const count = Math.min(ENRICH_CONCURRENCY, products.length)
  const pages = await Promise.all(Array.from({ length: count }, () => createPage(browser)))
  let cursor = 0
  let done = 0
  const total = products.length
  const startTime = Date.now()

  async function worker(page) {
    while (cursor < products.length) {
      const i = cursor++
      try {
        const extra = await withRetry(
          () => scrapeProductPage(page, products[i].twe_url),
          { retries: 2, delay: 1500, label: products[i].twe_url }
        )
        products[i] = { ...products[i], ...extra }
      } catch (err) {
        console.warn(`[enrich] failed for ${products[i].twe_url} — ${err.message}`)
      }
      done++
      const pct = ((done / total) * 100).toFixed(1)
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = done / ((Date.now() - startTime) / 1000)
      const etaSec = Math.round((total - done) / rate)
      const eta = etaSec > 3600
        ? `${Math.floor(etaSec / 3600)}h ${Math.floor((etaSec % 3600) / 60)}m`
        : `${Math.floor(etaSec / 60)}m ${etaSec % 60}s`
      process.stdout.write(`\r[enrich] ${done}/${total} (${pct}%) — elapsed ${elapsed}s — ETA ${eta}   `)
      await sleep(jitter(500, 1000))
    }
  }

  await Promise.all(pages.map(p => worker(p)))
  await Promise.all(pages.map(p => p.context().close()))
  process.stdout.write(`\n[enrich] done — ${total} products processed\n`)
}

// ── Category scrape ───────────────────────────────────────────────────────────

/**
 * Scrape all pages of one TWE category, persisting records as they are found.
 *
 * @param {import('playwright').Page} page
 * @param {import('playwright').Browser} browser  Used to open enrichment pages
 * @param {{ slug: string, type: string }} category
 * @param {object} progress  Mutable progress object (updated in-place)
 * @returns {Promise<void>}
 */
async function scrapeCategory(page, browser, category, progress) {
  const { id, slug, type } = category

  if (!progress.categories[slug]) {
    progress.categories[slug] = { lastPage: 0, done: false, added: 0, updated: 0 }
  }

  const state = progress.categories[slug]
  if (state.done && !FLAGS.resetCategory) {
    console.log(`[${slug}] already complete — skipping`)
    return
  }

  const startPage = FLAGS.resume ? (state.lastPage ?? 0) : 0
  let pageNum = startPage + 1
  let totalPages = state.totalPages ?? null

  while (true) {
    // Stop once we've confirmed the total page count and exceeded it
    if (totalPages !== null && pageNum > totalPages) {
      console.log(`[${slug}] all ${totalPages} pages complete`)
      break
    }

    const urls = categoryUrls(id, slug, pageNum)
    let products = []
    let loaded = false

    for (const url of urls) {
      const response = await withRetry(
        () => navigate(page, url, { timeout: 30_000 }),
        { retries: 3, delay: 2000, label: slug }
      )

      if (!response || response.status() === 404) continue

      await sleep(jitter(800, 1600))

      // Debug mode: save screenshot and HTML for the first page of first category
      if (FLAGS.debug && pageNum === 1 && slug === (FLAGS.category ?? CATEGORIES[0].slug) ) {
        await page.screenshot({ path: '/tmp/twe-debug.png', fullPage: false })
        const html = await page.content()
        fs.writeFileSync('/tmp/twe-debug.html', html)
        console.log('[debug] screenshot → /tmp/twe-debug.png, HTML → /tmp/twe-debug.html')
      }

      products = await scrapeProductCards(page, type)
      if (products.length > 0) { loaded = true; break }
    }

    if (!loaded || products.length === 0) {
      console.log(`[${slug}] page ${pageNum} — 0 products, stopping pagination`)
      break
    }

    // Read total product count from the page on first load, compute last page
    if (totalPages === null) {
      totalPages = await page.evaluate(() => {
        const text = document.body?.innerText ?? ''
        const m = text.match(/Showing\s+\d+\s+to\s+\d+\s+of\s+([\d,]+)\s+products?/i)
        if (!m) return null
        const total = parseInt(m[1].replace(/,/g, ''), 10)
        return Math.ceil(total / 24)
      })
      if (totalPages) {
        console.log(`[${slug}] ${totalPages} pages to scrape`)
        if (!FLAGS.dryRun) { state.totalPages = totalPages; saveProgress(progress) }
      }
    }

    // ── Optional enrichment ────────────────────────────────────────────────
    if (FLAGS.enrich) {
      await enrichProducts(products, browser)
    }

    // ── Normalise ──────────────────────────────────────────────────────────
    const normalised = products.map(raw => normaliseBottle({
      ...raw,
      price_updated_at: raw.price_gbp != null ? new Date().toISOString() : undefined,
    }))

    // ── Persist records ────────────────────────────────────────────────────
    let added = 0; let updated = 0

    if (FLAGS.dryRun) {
      for (const record of normalised) {
        console.log(`[dry-run] [${slug}] ${record.title ?? '(no title)'} — £${record.price_gbp ?? '?'}`)
        console.log(JSON.stringify(record, null, 2))
      }
      added = normalised.length
    } else {
      try {
        await withRetry(
          () => upsertBottles(normalised),
          { retries: 3, delay: 1000, label: slug }
        )
        added = normalised.length
      } catch (err) {
        // Batch upsert failed (UNIQUE constraint likely not yet applied) — fall back to serial
        console.warn(`[${slug}] batch upsert failed, falling back to serial — ${err.message}`)
        for (const record of normalised) {
          try {
            const { action } = await withRetry(
              () => upsertBottle(record),
              { retries: 3, delay: 1000, label: record.title ?? slug }
            )
            if (action === 'insert') added++
            else updated++
          } catch (err2) {
            console.error(`[${slug}] upsert failed for "${record.title}" — ${err2.message}`)
          }
        }
      }
    }

    if (!FLAGS.dryRun) {
      state.lastPage = pageNum
      state.added  = (state.added  ?? 0) + added
      state.updated = (state.updated ?? 0) + updated
      saveProgress(progress)
    }

    console.log(
      `[${slug}] page ${pageNum} — ${products.length} products (+${added} new, ~${updated} updated)`
    )

    pageNum++
    await sleep(jitter(4000, 8000))
  }

  if (!FLAGS.dryRun) {
    state.done = true
    saveProgress(progress)
  }
  console.log(`[${slug}] complete — total +${state.added} new, ~${state.updated} updated`)
}

// ── Session warm-up ───────────────────────────────────────────────────────────

/**
 * Navigate to the TWE homepage and accept the cookie consent modal.
 * TWE redirects category pages to the homepage for sessions that haven't
 * accepted cookies yet — this must run before any catalog navigation.
 */
async function warmUp(page) {
  console.log('[setup] warming up session…')
  await navigate(page, BASE_URL, { timeout: 30_000 })
  await sleep(jitter(2500, 4000))

  // Sourcepoint CMP renders the consent dialog inside an iframe — check every
  // frame in the page, not just the main document.
  let accepted = false
  const allFrames = [page.mainFrame(), ...page.frames().filter(f => f !== page.mainFrame())]

  for (const frame of allFrames) {
    try {
      const clicked = await frame.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => /^accept$/i.test((b.textContent ?? '').trim()))
        if (btn) { btn.click(); return true }
        return false
      })
      if (clicked) { accepted = true; break }
    } catch (_) {}
  }

  if (accepted) {
    console.log('[setup] cookie consent accepted')
    await sleep(jitter(1200, 2000))
  } else {
    // Try clicking via Playwright's frame-aware locator as a fallback
    try {
      await page.getByRole('button', { name: /^accept$/i }).click({ timeout: 5000 })
      accepted = true
      console.log('[setup] cookie consent accepted (locator fallback)')
      await sleep(jitter(1200, 2000))
    } catch (_) {
      console.log('[setup] no cookie modal found — continuing')
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Handle --reset-category before anything else
  if (FLAGS.resetCategory) {
    const progress = loadProgress()
    if (progress.categories[FLAGS.resetCategory]) {
      delete progress.categories[FLAGS.resetCategory]
      saveProgress(progress)
      console.log(`[reset] removed "${FLAGS.resetCategory}" from progress — it will be re-scraped`)
    } else {
      console.log(`[reset] "${FLAGS.resetCategory}" not found in progress file`)
    }
    // If only --reset-category was passed, exit after resetting
    if (!FLAGS.category && args.every(a => a.startsWith('--reset-category'))) return
  }

  const progress = loadProgress()

  const categoriesToRun = FLAGS.category
    ? CATEGORIES.filter(c => c.slug === FLAGS.category)
    : CATEGORIES

  if (categoriesToRun.length === 0) {
    console.error(`[error] unknown category "${FLAGS.category}"`)
    process.exit(1)
  }

  console.log(`Starting TWE catalog scrape — ${categoriesToRun.length} categories`)
  if (FLAGS.dryRun) console.log('[dry-run] no writes will be made to the database')
  if (FLAGS.enrich) console.log('[enrich] product pages will be visited for full metadata')

  const browser = await createBrowser({ headless: true })
  let page = await createPage(browser)

  try {
    await warmUp(page)
    for (const category of categoriesToRun) {
      try {
        await scrapeCategory(page, browser, category, progress)
      } catch (err) {
        console.warn(`[${category.slug}] category failed — ${err.message}`)
      }
      // Recreate the page between categories — clears any broken TCP/TLS state.
      // A new context loses cookies, so warmUp re-accepts consent.
      await page.context().close().catch(() => {})
      page = await createPage(browser)
      await sleep(jitter(8000, 15000))
      await warmUp(page)
    }
  } finally {
    await browser.close()
  }

  console.log('Scrape complete.')
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})

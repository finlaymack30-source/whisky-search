/**
 * Refreshes prices from The Whisky Exchange for all bottles with a twe_url.
 * Records price history and computes trend after every successful fetch.
 *
 * Prerequisites (first time only):
 *   npx playwright install chromium
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node scripts/sync-prices.js
 *   SUPABASE_SERVICE_KEY=... node scripts/sync-prices.js --resume
 *   SUPABASE_SERVICE_KEY=... node scripts/sync-prices.js --id=42
 *   SUPABASE_SERVICE_KEY=... node scripts/sync-prices.js --force
 *   SUPABASE_SERVICE_KEY=... node scripts/sync-prices.js --since=14
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { createBrowser, createPage, sleep, jitter, navigate, withRetry } from './lib/browser.js'
import { getBottlesForPriceSync, recordPriceHistory, computeAndSaveTrend } from './lib/db.js'
import { supabase } from './lib/db.js'

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const FLAGS = {
  resume: args.includes('--resume'),
  force:  args.includes('--force'),
  id:     (() => {
    const a = args.find(a => a.startsWith('--id='))
    return a ? parseInt(a.replace('--id=', ''), 10) : null
  })(),
  since:  (() => {
    const a = args.find(a => a.startsWith('--since='))
    return a ? parseInt(a.replace('--since=', ''), 10) : 7
  })(),
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROGRESS_FILE = path.join(__dirname, '.sync-progress.json')

/** Maximum plausible single-bottle price in GBP */
const MAX_PRICE = 2000
/** Minimum plausible full-bottle price — filters out 5cl sample prices (£3–9) */
const MIN_PRICE = 10

// ── Progress file ─────────────────────────────────────────────────────────────

/**
 * Load saved sync progress from disk.
 *
 * @returns {{ processedIds: number[], lastRun: string|null }}
 */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
    }
  } catch {
    console.warn('[progress] could not read progress file — starting fresh')
  }
  return { processedIds: [], lastRun: null }
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

// ── Price extraction ──────────────────────────────────────────────────────────

/**
 * Extract a plausible GBP price from the current page DOM.
 * Tries targeted selectors first, then falls back to scanning all price-like
 * strings in the body text and taking the minimum sensible value.
 * Returns null when no valid price is found.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<number|null>}
 */
async function extractPrice(page) {
  return page.evaluate(({ MIN_PRICE, MAX_PRICE }) => {
    const parse = text => {
      const m = (text ?? '').match(/£(\d[\d,]*(?:\.\d{1,2})?)/)
      if (!m) return null
      const p = parseFloat(m[1].replace(/,/g, ''))
      return p >= MIN_PRICE && p <= MAX_PRICE ? p : null
    }

    // 1. Primary price element
    const p1 = parse(document.querySelector('.product-main__price')?.textContent)
    if (p1) return p1

    // 2. Secondary price element
    const p2 = parse(document.querySelector('.product-main__data .price')?.textContent)
    if (p2) return p2

    // 3. Any element with a price-like class
    for (const el of document.querySelectorAll('[class*="price"]')) {
      const p = parse(el.textContent)
      if (p) return p
    }

    // 4. Full-page scan — take the lowest price above the minimum (excludes samples)
    const matches = [...(document.body?.innerText ?? '').matchAll(/£(\d[\d,]*(?:\.\d{1,2})?)/g)]
    const prices = matches
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(p => p >= MIN_PRICE && p <= MAX_PRICE)

    return prices.length > 0 ? Math.min(...prices) : null
  }, { MIN_PRICE, MAX_PRICE })
}

/**
 * Visit a TWE product page and return its current price in GBP, or null.
 *
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<number|null>}
 */
async function fetchPriceFromPage(page, url) {
  const response = await navigate(page, url, { timeout: 30_000 })
  if (!response) {
    console.warn(`[fetch] no response from ${url}`)
    return null
  }

  // Allow JS-rendered price widgets to settle
  await sleep(jitter(800, 1400))

  return extractPrice(page)
}

// ── DB update ─────────────────────────────────────────────────────────────────

/**
 * Write the new price to whiskies.price_gbp and price_updated_at.
 *
 * @param {number} id
 * @param {number} newPrice
 * @returns {Promise<void>}
 */
async function savePriceToBottle(id, newPrice) {
  const { error } = await supabase
    .from('whiskies')
    .update({
      price_gbp: newPrice,
      price_updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(`[db] price update failed for id=${id} — ${error.message}`)
}

// ── Logging helpers ───────────────────────────────────────────────────────────

/**
 * Format a price change line for console output.
 *
 * @param {number} index   1-based position
 * @param {number} total
 * @param {string} title
 * @param {number|null} newPrice
 * @param {number|null} oldPrice
 * @param {string|null} trend
 * @returns {string}
 */
function formatPriceLine(index, total, title, newPrice, oldPrice, trend) {
  const pos = `[${index}/${total}]`
  const name = title.length > 40 ? title.slice(0, 38) + '…' : title

  if (newPrice == null) return `${pos} ${name} ... ~ no price found`

  const fmt = p => `£${p.toFixed(2)}`

  if (oldPrice == null) {
    return `${pos} ${name} ... ${fmt(newPrice)} (first record)`
  }

  const diff = newPrice - oldPrice
  if (Math.abs(diff) < 0.01) {
    return `${pos} ${name} ... ${fmt(newPrice)} (unchanged)`
  }

  const sign = diff > 0 ? '+' : ''
  const trendLabel = trend ? ` trend: ${trend}` : ''
  return `${pos} ${name} ... ${fmt(newPrice)} (was ${fmt(oldPrice)}, ${sign}${fmt(diff)})${trendLabel}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const staleDays = FLAGS.force ? 0 : FLAGS.since

  // Determine which bottles to process
  const bottles = await withRetry(
    () => getBottlesForPriceSync({ staleDays, id: FLAGS.id }),
    { retries: 3, delay: 2000, label: 'getBottlesForPriceSync' }
  )

  if (bottles.length === 0) {
    console.log('No bottles require a price update.')
    return
  }

  const progress = loadProgress()
  const processedSet = FLAGS.resume ? new Set(progress.processedIds) : new Set()

  const queue = bottles.filter(b => !processedSet.has(b.id))
  const total = queue.length
  const skipped = bottles.length - total

  if (skipped > 0) console.log(`Resuming — skipping ${skipped} already-processed bottles`)
  console.log(`Syncing prices for ${total} bottles…`)

  const browser = await createBrowser({ headless: true })
  const page = await createPage(browser)

  try {
    for (let i = 0; i < queue.length; i++) {
      const bottle = queue[i]
      const index = i + 1

      let newPrice = null
      let trend = null

      try {
        newPrice = await withRetry(
          () => fetchPriceFromPage(page, bottle.twe_url),
          { retries: 3, delay: 1500, label: bottle.twe_url }
        )

        if (newPrice != null) {
          await savePriceToBottle(bottle.id, newPrice)
          const prevPrice = bottle.price_gbp != null ? parseFloat(bottle.price_gbp) : null
          await recordPriceHistory(bottle.id, newPrice, 'twe', { previousPrice: prevPrice })
          trend = await computeAndSaveTrend(bottle.id)
        }
      } catch (err) {
        console.error(
          `[${index}/${total}] error processing id=${bottle.id} "${bottle.title}" — ${err.message}`
        )
      }

      const oldPrice = bottle.price_gbp != null ? parseFloat(bottle.price_gbp) : null
      console.log(formatPriceLine(index, total, bottle.title ?? '(unknown)', newPrice, oldPrice, trend))

      // Mark processed regardless of outcome so --resume skips it next run
      processedSet.add(bottle.id)
      progress.processedIds = [...processedSet]
      saveProgress(progress)

      // Polite delay between requests
      await sleep(jitter(900, 1800))
    }
  } finally {
    await browser.close()
  }

  console.log(`Price sync complete — ${total} bottles processed.`)
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})

/**
 * Whisky Auctioneer DOM extraction helpers.
 *
 * WA serves two page types:
 *
 *   Product page  (/product/{id} or redirected from /lot/{id}/slug)
 *   — Contains a Drupal settings JSON blob with Facebook Pixel data.
 *   — The FB Pixel `contents` array lists every historic lot of that product
 *     with its hammer price — accessible WITHOUT login (uid=0 works).
 *   — One product page can yield 50–200 sale records in a single request.
 *
 *   Lot page  (/lot/{id}/slug, pre-redirect or authenticated view)
 *   — Shows a single lot with "Hammer Price" / "Sold For" text.
 *   — Used as a fallback when the product page has no FB Pixel data.
 *
 * Exports:
 *   extractProductPage(page, opts)  →  { bottle, sales[] }
 *   extractLotPage(page, opts)      →  { bottle, sale }   (legacy / fallback)
 *   extractResultsPageUrls(page)    →  string[]
 */

import { extractAbv, extractAge, extractSizeMl, parseCaskMaturation } from '../lib/normalise.js'

// ── Text helpers ──────────────────────────────────────────────────────────────

function cleanText(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim()
}

function parseGbp(text) {
  const t = cleanText(text)
  const m = t.match(/£\s*([\d,]+(?:\.\d{1,2})?)(?!\s*[a-zA-Z])/)
  if (!m) return null
  const n = parseFloat(m[1].replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseDateLoose(text) {
  const t = cleanText(text)
  const m = t.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/)
  if (!m) return null
  const d = new Date(`${m[1]} ${m[2]} ${m[3]} 12:00:00 GMT`)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

function normaliseSpecKey(key) {
  return cleanText(key).toLowerCase().replace(/[:\s]+$/g, '')
}

function mergeSpecMap(into, from) {
  for (const [k, v] of Object.entries(from ?? {})) {
    const kk = normaliseSpecKey(k)
    if (!kk) continue
    if (into[kk] == null || String(into[kk]).trim() === '') into[kk] = v
  }
  return into
}

// ── Spec map extraction (shared) ──────────────────────────────────────────────

const EXTRACT_SPEC_AND_META = `(function() {
  const text = (el) => (el?.textContent ?? '').replace(/\\s+/g, ' ').trim()
  const spec = {}

  for (const table of Array.from(document.querySelectorAll('table'))) {
    for (const tr of table.querySelectorAll('tr')) {
      const th = tr.querySelector('th'), td = tr.querySelector('td')
      const k = text(th), v = text(td)
      if (k && v && k.length <= 80 && v.length <= 500) spec[k] = v
    }
  }
  for (const dl of Array.from(document.querySelectorAll('dl'))) {
    for (const dt of dl.querySelectorAll('dt')) {
      const dd = dt.nextElementSibling
      if (dd?.tagName?.toLowerCase() === 'dd') {
        const k = text(dt), v = text(dd)
        if (k && v && k.length <= 80 && v.length <= 500) spec[k] = v
      }
    }
  }

  const title =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    text(document.querySelector('h1')) ||
    text(document.querySelector('h2'))

  const images = Array.from(document.querySelectorAll('img'))
    .map(i => i.getAttribute('src') || i.getAttribute('data-src'))
    .filter(Boolean)
    .filter(s => !s.startsWith('data:') && /\\.(jpg|jpeg|png|webp)(\\?|$)/i.test(s))
    .slice(0, 6)

  const distillery =
    spec['distillery'] ?? spec['producer'] ?? spec['brand'] ?? null

  return { title, images, spec_map: spec, distillery }
})()`

// ── FB Pixel extraction ───────────────────────────────────────────────────────

const EXTRACT_FB_PIXEL = `(function() {
  let settings = null
  try {
    const el = document.querySelector('script[data-drupal-selector="drupal-settings-json"]')
    if (el) settings = JSON.parse(el.textContent)
  } catch (_) {}

  const lots = []
  try {
    const events = settings?.facebook_pixel?.events ?? []
    for (const ev of events) {
      if (ev.event !== 'ViewContent') continue
      const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
      for (const c of (data?.contents ?? [])) {
        const price = parseFloat(c.value)
        if (c.id && price > 0) {
          lots.push({ lot_id: String(c.id), hammer_price: price })
        }
      }
    }
  } catch (_) {}

  const currentPath = settings?.path?.currentPath ?? ''
  const isProductPage = currentPath.startsWith('product/')

  return { lots, isProductPage, currentPath }
})()`

// ── Auction results date extraction ──────────────────────────────────────────
// Product pages render a historical results list that includes /lot/ links.
// We walk up from each link looking for date strings, then map lot_id → date.

const EXTRACT_AUCTION_DATES = `(function() {
  const text = el => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : '')
  const results = []

  for (const a of Array.from(document.querySelectorAll('a[href*="/lot/"]'))) {
    const m = a.getAttribute('href').match(/\\/lot\\/(\\d+)/)
    if (!m) continue
    const lot_id = m[1]

    let dateStr = null
    let saleTitle = null
    let el = a
    for (let depth = 0; depth < 7 && el; depth++) {
      const t = text(el)
      if (!dateStr) {
        // Match "04 May 2026", "May 2026", "May '26"
        const dm = t.match(/\\b(?:\\d{1,2}\\s+)?([A-Za-z]{3,9})\\s+(20\\d{2})\\b/)
        if (dm) {
          const d = new Date(dm[0].trim() + (dm[0].match(/\\d{4}/) ? '' : ''))
          if (!isNaN(d.getTime())) dateStr = d.toISOString()
        }
      }
      if (!saleTitle) {
        const sm = t.match(/[A-Za-z]+ 20\\d{2} Auction/i)
        if (sm) saleTitle = sm[0]
      }
      if (dateStr && saleTitle) break
      el = el.parentElement
    }
    results.push({ lot_id, date: dateStr, sale_title: saleTitle })
  }

  return results
})()`

// ── extractProductPage ────────────────────────────────────────────────────────

/**
 * Extract bottle identity + all historic sale records from a WA product page.
 *
 * WA embeds every prior hammer price in its Facebook Pixel analytics JSON,
 * accessible without authentication. One page visit yields many sale rows.
 *
 * Returns { bottle, sales }
 *   bottle  — normalised bottle fields
 *   sales   — Array<{ lot_id, hammer_price }>  (may be empty if not a product page)
 *
 * @param {import('playwright').Page} page
 * @param {{ url: string, source?: string }} opts
 */
export async function extractProductPage(page, { url, source = 'whiskyauctioneer' }) {
  const [meta, fbData, auctionDates] = await Promise.all([
    page.evaluate(EXTRACT_SPEC_AND_META),
    page.evaluate(EXTRACT_FB_PIXEL),
    page.evaluate(EXTRACT_AUCTION_DATES),
  ])

  const spec_map = mergeSpecMap({}, meta.spec_map)
  const title = cleanText(meta.title ?? '')
  const combined = `${title} | ${Object.entries(spec_map).map(([k, v]) => `${k}: ${v}`).join(' | ')}`

  const age     = extractAge(combined)
  const abv     = extractAbv(combined)
  const size_ml = extractSizeMl(combined)

  const caskRaw = spec_map['cask type'] ?? spec_map['cask'] ?? spec_map['cask maturation'] ?? spec_map['maturation'] ?? null
  const { cask_type, cask_finish } = parseCaskMaturation(caskRaw ?? '')

  const distillery = meta.distillery ? cleanText(meta.distillery) : null

  // Extra spec fields stored in raw on auction_sales
  const vintage = parseInt(spec_map['vintage'] ?? '') || null
  const region  = spec_map['region']  ? cleanText(spec_map['region'])  : null
  const brand   = spec_map['brand']   ? cleanText(spec_map['brand'])   : null

  const bottle = {
    title: title || null,
    canonical_name: title || null,
    distillery,
    age,
    abv,
    size_ml,
    cask_type:   cask_type  || null,
    cask_finish: cask_finish || null,
    image_url:   meta.images[0] ?? null,
    image_urls:  meta.images,
  }

  // Build lot_id → { date, sale_title } from DOM-scraped auction results
  const dateMap = {}
  for (const r of auctionDates) {
    if (r.lot_id && !dateMap[r.lot_id]) {
      dateMap[r.lot_id] = { date: r.date ?? null, sale_title: r.sale_title ?? null }
    }
  }

  const sales = fbData.lots.map(l => ({
    lot_id:      l.lot_id,
    hammer_price: l.hammer_price,
    sale_date:   dateMap[l.lot_id]?.date ?? null,
    sale_title:  dateMap[l.lot_id]?.sale_title ?? null,
    vintage,
    region,
    brand,
  }))

  return { bottle, sales }
}

// ── extractResultsPageUrls ────────────────────────────────────────────────────

/**
 * Extract lot or product URLs from a WA search/results page.
 * Used to crawl /search/past-auctions page by page.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<string[]>}
 */
export async function extractResultsPageUrls(page) {
  return page.evaluate(() => {
    const seen = new Set()
    const out  = []
    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      const href = a.getAttribute('href')
      try {
        let abs = new URL(href, window.location.href).toString()
        if (!/whiskyauctioneer\.com\/(lot|product)\/[\w\d/-]+/.test(abs)) continue
        // Normalise to canonical product page — strip /variation/... suffix
        abs = abs.replace(/\/variation\/[^/?#]+.*$/, '')
        if (!seen.has(abs)) {
          seen.add(abs)
          out.push(abs)
        }
      } catch (_) {}
    }
    return out
  })
}

/**
 * Check whether a next-page link exists on the current results page.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function hasNextPage(page) {
  return page.evaluate(() =>
    !!document.querySelector('[rel="next"], .pager__item--next, a.next')
  )
}

// ── extractLotPage (legacy / single-lot fallback) ─────────────────────────────

/**
 * Extract lot + bottle fields from a Whisky Auctioneer individual lot page.
 * This is the original parser, kept for backward compatibility and as a fallback
 * when visiting a lot page that hasn't been redirected to a product page.
 *
 * @param {import('playwright').Page} page
 * @param {{ url: string, source?: string }} opts
 * @returns {Promise<{ bottle, sale }>}
 */
export async function extractLotPage(page, { url, source = 'whiskyauctioneer' }) {
  // First try FB pixel — even lot pages may redirect to product pages
  const fbData = await page.evaluate(EXTRACT_FB_PIXEL)

  if (fbData.isProductPage && fbData.lots.length > 0) {
    // Redirected to product page — surface the first lot that matches this URL
    // (or just the first lot if we can't determine which one)
    const lotIdFromUrl = url.match(/\/lot\/(\d+)/)?.[1]
    const matchingLot = lotIdFromUrl
      ? fbData.lots.find(l => l.lot_id === lotIdFromUrl)
      : fbData.lots[0]

    const meta = await page.evaluate(EXTRACT_SPEC_AND_META)
    const spec_map = mergeSpecMap({}, meta.spec_map)
    const title = cleanText(meta.title ?? '')
    const combined = `${title} | ${Object.entries(spec_map).map(([k, v]) => `${k}: ${v}`).join(' | ')}`

    const bottle = {
      title: title || null,
      canonical_name: title || null,
      distillery: meta.distillery ? cleanText(meta.distillery) : null,
      age:      extractAge(combined),
      abv:      extractAbv(combined),
      size_ml:  extractSizeMl(combined),
      image_url:  meta.images[0] ?? null,
      image_urls: meta.images,
    }

    return {
      bottle,
      sale: {
        source,
        lot_url: url,
        auction_house: 'Whisky Auctioneer',
        sale_date: null,
        lot_number: lotIdFromUrl ?? (matchingLot?.lot_id ?? null),
        currency: 'GBP',
        hammer_price: matchingLot?.hammer_price ?? null,
        sold_price_all_in: matchingLot?.hammer_price ?? null,
        result_status: matchingLot ? 'sold' : 'unknown',
        raw: { spec_map, fb_lots_count: fbData.lots.length },
      },
    }
  }

  // ── Original DOM-based extraction ──────────────────────────────────────────

  const result = await page.evaluate(() => {
    const out = {
      title: null, lot_number: null, sale_title: null,
      started_at: null, closed_at: null,
      hammer_price: null, sold_price_all_in: null,
      currency: 'GBP', result_status: 'unknown',
      images: [], spec_map: {}, raw_text: null,
    }

    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const docText = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim()
    out.raw_text = docText.slice(0, 20_000)

    const h = document.querySelector('h1') ?? document.querySelector('main h1') ??
              document.querySelector('h2') ?? document.querySelector('h3')
    const heading = text(h)
    if (heading && heading.length > 3) out.title = heading

    const lotMatch = docText.match(/#\s*([0-9]{4,}[A-Za-z]?)\b/)
    if (lotMatch) out.lot_number = lotMatch[1]

    const saleTitle = text(document.querySelector('main h1') ?? document.querySelector('h1'))
    if (saleTitle && saleTitle.length < 120) out.sale_title = saleTitle

    const startedMatch = docText.match(/\bStarted\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i)
    const closedMatch  = docText.match(/\bClosed\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i)
    if (startedMatch) out.started_at = startedMatch[1]
    if (closedMatch)  out.closed_at  = closedMatch[1]

    const findNearLabel = (labelRe) => {
      for (const el of Array.from(document.querySelectorAll('main *'))) {
        const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (!t || !labelRe.test(t)) continue
        if (t.includes('£')) return t
        const parent = el.closest('div, li, section, article') ?? el.parentElement
        const pt = (parent?.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (pt.includes('£')) return pt
      }
      return null
    }

    out.hammer_price      = findNearLabel(/\bhammer\s+price\b/i)
    out.sold_price_all_in = findNearLabel(/\bsold\s+for\b|\bsold\b/i)

    const imgs = Array.from(document.querySelectorAll('main img, img'))
      .map(i => i.getAttribute('src') || i.getAttribute('data-src') || null)
      .filter(Boolean).filter(s => !s.startsWith('data:'))
    const seen = new Set()
    for (const src of imgs) {
      if (seen.has(src)) continue
      seen.add(src)
      out.images.push(src)
      if (out.images.length >= 12) break
    }

    const spec = {}
    for (const table of Array.from(document.querySelectorAll('table'))) {
      for (const tr of table.querySelectorAll('tr')) {
        const th = tr.querySelector('th'), td = tr.querySelector('td')
        const k = text(th), v = text(td)
        if (k && v && k.length <= 80 && v.length <= 500) spec[k] = v
      }
    }
    for (const dl of Array.from(document.querySelectorAll('dl'))) {
      for (const dt of dl.querySelectorAll('dt')) {
        const dd = dt.nextElementSibling
        if (!dd || dd.tagName.toLowerCase() !== 'dd') continue
        const k = text(dt), v = text(dd)
        if (k && v && k.length <= 80 && v.length <= 500) spec[k] = v
      }
    }
    out.spec_map = spec
    return out
  })

  const spec_map = mergeSpecMap({}, result.spec_map)
  const title      = cleanText(result.title ?? '')
  const lot_number = result.lot_number ? String(result.lot_number) : null
  const sale_title = cleanText(result.sale_title ?? '') || null
  const started_at = parseDateLoose(result.started_at)
  const closed_at  = parseDateLoose(result.closed_at)
  const sale_date  = closed_at ?? started_at ?? null
  const hammer_price      = parseGbp(result.hammer_price)
  const sold_price_all_in = parseGbp(result.sold_price_all_in)

  const specText = Object.entries(spec_map).map(([k, v]) => `${k}: ${v}`).join(' | ')
  const combined = `${title} | ${specText}`

  const age     = extractAge(combined)
  const abv     = extractAbv(combined)
  const size_ml = extractSizeMl(combined)

  const caskRaw = spec_map['cask type'] ?? spec_map['cask'] ?? spec_map['cask maturation'] ?? spec_map['maturation'] ?? null
  const { cask_type, cask_finish } = parseCaskMaturation(caskRaw ?? '')

  const distillery = spec_map['distillery'] ?? spec_map['producer'] ?? spec_map['brand'] ?? null

  const bottle = {
    title:          title || null,
    canonical_name: title || null,
    distillery:     distillery ? cleanText(distillery) : null,
    age, abv, size_ml,
    cask_type:   cask_type  || null,
    cask_finish: cask_finish || null,
    image_url: (() => {
      const imgs = (result.images ?? []).map(String)
      return (
        imgs.find(u => /\/styles\//i.test(u) && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u)) ??
        imgs.find(u => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u)) ??
        null
      )
    })(),
    image_urls: (result.images ?? []).filter(u => !/\.svg(\?|$)/i.test(String(u))),
  }

  const sale = {
    source,
    lot_url:          url,
    auction_house:    'Whisky Auctioneer',
    sale_title,
    sale_date,
    lot_number,
    currency:         'GBP',
    hammer_price,
    sold_price_all_in,
    result_status:    hammer_price != null || sold_price_all_in != null ? 'sold' : 'unknown',
    raw: { spec_map, started_at: result.started_at ?? null, closed_at: result.closed_at ?? null },
  }

  return { bottle, sale }
}

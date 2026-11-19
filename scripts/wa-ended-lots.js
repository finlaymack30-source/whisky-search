/**
 * Whisky Auctioneer scraper → Supabase pipeline.
 *
 * Two operating modes:
 *
 *   --past-auctions
 *     Crawls /search/past-auctions page by page. For each product URL found,
 *     extracts all historic hammer prices from the Facebook Pixel JSON
 *     (accessible without login — uid=0). One page visit yields up to 180
 *     sale rows. This is the primary bulk-collection mode.
 *
 *   --lot-url / --lot-file / --sale-url  (legacy / targeted)
 *     Process specific lot or sale URLs directly.
 *
 * Prerequisites (run once):
 *   1. Execute scripts/migration.sql in Supabase SQL Editor.
 *   2. npm install playwright playwright-extra puppeteer-extra-plugin-stealth
 *      npx playwright install chromium
 *
 * Usage:
 *   # Bulk crawl (recommended)
 *   SUPABASE_SERVICE_KEY=... node scripts/wa-ended-lots.js --past-auctions
 *   SUPABASE_SERVICE_KEY=... node scripts/wa-ended-lots.js --past-auctions --pages=20 --dry-run
 *
 *   # Targeted
 *   SUPABASE_SERVICE_KEY=... node scripts/wa-ended-lots.js --lot-url=https://whiskyauctioneer.com/lot/5198728/...
 *   SUPABASE_SERVICE_KEY=... node scripts/wa-ended-lots.js --sale-url=https://whiskyauctioneer.com/whisky-auctions/.../lots
 *
 * Polite crawl: 10–14 s between requests (matches WA robots.txt Crawl-delay: 10).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

import { createBrowser, createPage, sleep, jitter, navigate, withRetry } from './lib/browser.js'
import { normaliseBottle, computeBottleFingerprint } from './lib/normalise.js'
import { upsertBottleByFingerprint, upsertAuctionSale } from './lib/db.js'
import {
  extractProductPage,
  extractLotPage,
  extractResultsPageUrls,
  hasNextPage,
} from './parsers/whiskyauctioneer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const FLAGS = {
  dryRun:      args.includes('--dry-run'),
  debug:       args.includes('--debug'),
  headed:      args.includes('--headed'),
  pastAuctions: args.includes('--past-auctions'),
  pages: (() => {
    const a = args.find(a => a.startsWith('--pages='))
    return a ? parseInt(a.replace('--pages=', ''), 10) : 10
  })(),
  limit: (() => {
    const a = args.find(a => a.startsWith('--limit='))
    return a ? parseInt(a.replace('--limit=', ''), 10) : null
  })(),
  chromiumExec: (args.find(a => a.startsWith('--chromium-exec=')) ?? '').replace('--chromium-exec=', '') || null,
  storageState: (args.find(a => a.startsWith('--storage-state=')) ?? '').replace('--storage-state=', '') || null,
  saleUrl:      (args.find(a => a.startsWith('--sale-url=')) ?? '').replace('--sale-url=', '') || null,
  lotUrl:       (args.find(a => a.startsWith('--lot-url=')) ?? '').replace('--lot-url=', '') || null,
  lotFile:      (args.find(a => a.startsWith('--lot-file=')) ?? '').replace('--lot-file=', '') || null,
  keyword:      (args.find(a => a.startsWith('--keyword=')) ?? '').replace('--keyword=', '') || null,
  resume:       args.includes('--resume'),
  maxHours: (() => {
    const a = args.find(a => a.startsWith('--max-hours='))
    return a ? parseFloat(a.replace('--max-hours=', '')) : null
  })(),
  progressFile: (args.find(a => a.startsWith('--progress-file=')) ?? '').replace('--progress-file=', '')
    || path.join(path.dirname(fileURLToPath(import.meta.url)), '.wa-progress.json'),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function die(msg) {
  console.error(msg)
  process.exit(1)
}

// ── Timing helpers ────────────────────────────────────────────────────────────

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

function fmtEta(startMs, done, total) {
  if (done === 0) return '—'
  const perItem = (Date.now() - startMs) / done
  return fmtDuration(perItem * (total - done))
}

function fmtBar(done, total, width = 20) {
  const filled = Math.round((done / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function printProgress(label, done, total, startMs, extra = '') {
  const pct   = total ? Math.round((done / total) * 100) : 0
  const bar   = fmtBar(done, total)
  const elapsed = fmtDuration(Date.now() - startMs)
  const eta   = fmtEta(startMs, done, total)
  process.stdout.write(
    `\r  ${label} [${bar}] ${done}/${total} (${pct}%) | ⏱ ${elapsed} elapsed | ETA ${eta}${extra}   `
  )
}

// ── Resume / progress persistence ─────────────────────────────────────────────

function loadProgress() {
  if (!FLAGS.resume) return null
  try {
    if (!fs.existsSync(FLAGS.progressFile)) return null
    const raw = JSON.parse(fs.readFileSync(FLAGS.progressFile, 'utf8'))
    raw.processedUrls = new Set(raw.processedUrls ?? [])
    raw.completedKeywords = new Set(raw.completedKeywords ?? [])
    console.log(`[resume] Loaded progress: ${raw.completedKeywords.size} keywords done, ${raw.processedUrls.size} products done, ${raw.totalSales ?? 0} sales written\n`)
    return raw
  } catch (e) {
    console.warn('[resume] Could not read progress file:', e.message)
    return null
  }
}

function saveProgress(data) {
  try {
    fs.writeFileSync(FLAGS.progressFile, JSON.stringify({
      startedAt:         data.startedAt,
      updatedAt:         new Date().toISOString(),
      completedKeywords: [...data.completedKeywords],
      processedUrls:     [...data.processedUrls],
      totalSales:        data.totalSales,
    }, null, 2))
  } catch (e) {
    console.warn('\n[progress] save failed:', e.message)
  }
}

// ── Keep laptop awake (macOS) ─────────────────────────────────────────────────

function keepAwake() {
  if (process.platform !== 'darwin') return
  try {
    const proc = spawn('caffeinate', ['-i', '-d'], { stdio: 'ignore' })
    const cleanup = () => { try { proc.kill() } catch (_) {} }
    process.on('exit', cleanup)
    process.on('SIGINT', () => { cleanup(); process.exit(0) })
    console.log('[system] caffeinate running — laptop will not sleep\n')
  } catch (_) {
    console.warn('[system] caffeinate unavailable — laptop may sleep during long runs\n')
  }
}

function loadLotUrls() {
  const urls = []
  if (FLAGS.lotUrl) urls.push(FLAGS.lotUrl)
  if (FLAGS.lotFile) {
    const content = fs.readFileSync(FLAGS.lotFile, 'utf8')
    for (const line of content.split('\n')) {
      const u = line.trim()
      if (!u || u.startsWith('#')) continue
      urls.push(u)
    }
  }
  return [...new Set(urls)]
}

async function maybeWriteDebug(page, tag) {
  if (!FLAGS.debug) return
  try {
    const safe = tag.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80)
    const htmlPath = path.join(__dirname, `.wa-debug-${safe}.html`)
    const pngPath  = path.join(__dirname, `.wa-debug-${safe}.png`)
    fs.writeFileSync(htmlPath, await page.content())
    await page.screenshot({ path: pngPath, fullPage: false })
    console.log(`[debug] saved ${htmlPath}`)
  } catch (e) {
    console.warn('[debug] failed:', e.message)
  }
}

// ── Product-page processing ───────────────────────────────────────────────────

/**
 * Navigate to a product (or lot) URL, extract bottle + all historic sale records
 * from the FB Pixel JSON, and write everything to Supabase.
 *
 * Returns the number of sale rows written.
 */
async function processProductUrl(page, url) {
  await withRetry(
    () => navigate(page, url, { timeout: 45_000 }),
    { retries: 3, delay: 2000, label: 'navigate-product' }
  )
  await sleep(jitter(900, 1800))
  await maybeWriteDebug(page, url.split('/').slice(-3).join('-'))

  const { bottle: rawBottle, sales } = await extractProductPage(page, { url, source: 'whiskyauctioneer' })

  if (!rawBottle.title && sales.length === 0) {
    console.log('  skipped — no title and no price data')
    return 0
  }

  const normalised = normaliseBottle({ ...rawBottle })
  if (rawBottle.size_ml    != null) normalised.size_ml    = rawBottle.size_ml
  if (rawBottle.cask_finish != null) normalised.cask_finish = rawBottle.cask_finish
  if (rawBottle.canonical_name != null) normalised.canonical_name = rawBottle.canonical_name
  if (Array.isArray(rawBottle.image_urls)) normalised.image_urls = rawBottle.image_urls

  const fingerprint = await computeBottleFingerprint(normalised)
  normalised.bottle_fingerprint = fingerprint

  if (FLAGS.dryRun) {
    console.log(`  [dry] "${normalised.title}" — ${sales.length} lots`)
    if (sales.length) {
      const datesFound = sales.filter(s => s.sale_date).length
      console.log('  sample:', sales.slice(0, 3).map(s => `£${s.hammer_price}${s.sale_date ? ` (${s.sale_date.slice(0,7)})` : ''}`).join(', '))
      if (datesFound) console.log(`  dates found: ${datesFound}/${sales.length}`)
      const s0 = sales[0]
      if (s0.vintage || s0.region || s0.brand) console.log(`  meta: vintage=${s0.vintage} region=${s0.region} brand=${s0.brand}`)
    }
    return sales.length
  }

  const { id: bottleId } = await upsertBottleByFingerprint(normalised)

  let written = 0
  for (const s of sales) {
    await upsertAuctionSale({
      source:        'whiskyauctioneer',
      lot_url:       `https://whiskyauctioneer.com/lot/${s.lot_id}`,
      auction_house: 'Whisky Auctioneer',
      sale_title:    s.sale_title ?? null,
      sale_date:     s.sale_date ?? null,
      lot_number:    s.lot_id,
      currency:      'GBP',
      hammer_price:  s.hammer_price,
      result_status: 'sold',
      bottle_id:     bottleId,
      raw:           {
        product_url: url,
        ...(s.vintage ? { vintage: s.vintage } : {}),
        ...(s.region  ? { region:  s.region  } : {}),
        ...(s.brand   ? { brand:   s.brand   } : {}),
      },
    })
    written++
  }

  console.log(`  ✓ "${normalised.title}" — ${written} sale${written !== 1 ? 's' : ''}`)
  return written
}

// ── Legacy single-lot processing ──────────────────────────────────────────────

async function processLotUrl(page, lotUrl) {
  await withRetry(
    () => navigate(page, lotUrl, { timeout: 45_000 }),
    { retries: 3, delay: 2000, label: 'navigate-lot' }
  )
  await sleep(jitter(900, 1600))
  await maybeWriteDebug(page, lotUrl.split('/').slice(-2).join('-'))

  const { bottle: rawBottle, sale } = await extractLotPage(page, { url: lotUrl, source: 'whiskyauctioneer' })

  const normalised = normaliseBottle({ ...rawBottle })
  if (rawBottle.size_ml    != null) normalised.size_ml    = rawBottle.size_ml
  if (rawBottle.cask_finish != null) normalised.cask_finish = rawBottle.cask_finish
  if (rawBottle.canonical_name != null) normalised.canonical_name = rawBottle.canonical_name
  if (Array.isArray(rawBottle.image_urls)) normalised.image_urls = rawBottle.image_urls

  const fingerprint = await computeBottleFingerprint(normalised)
  normalised.bottle_fingerprint = fingerprint

  if (FLAGS.dryRun) {
    console.log('\n[lot]',    lotUrl)
    console.log('[bottle]',  JSON.stringify(normalised, null, 2))
    console.log('[sale]',    JSON.stringify(sale, null, 2))
    return
  }

  const { id: bottleId } = await upsertBottleByFingerprint(normalised)
  await upsertAuctionSale({ ...sale, bottle_id: bottleId, lot_url: lotUrl })
}

// ── Past-auctions crawler ─────────────────────────────────────────────────────

const PAST_AUCTIONS_BASE = 'https://whiskyauctioneer.com/search/past-auctions'

// WA's keyword search requires a term — blank returns nothing.
// Full A-Z distillery list + major independent bottlers + key world whiskies.
const SEARCH_KEYWORDS = [
  // A
  'aberfeldy', 'aberlour', 'abhainn dearg', 'ailsa bay', 'allt-a-bhainne',
  'annandale', 'ardbeg', 'ardmore', 'ardnahoe', 'ardnamurchan',
  'auchentoshan', 'auchroisk', 'aultmore',
  // B
  'balblair', 'balmenach', 'balvenie', 'ben nevis', 'benriach', 'benrinnes',
  'benromach', 'blair athol', 'bowmore', 'braeval', 'bruichladdich',
  'bunnahabhain', 'bushmills',
  // C
  'caol ila', 'cardhu', 'clynelish', 'convalmore', 'cragganmore',
  'craigellachie',
  // D
  'dailuaine', 'dallas dhu', 'dalmore', 'dalwhinnie', 'deanston',
  'dingle', 'dufftown',
  // E
  'edradour',
  // F
  'fettercairn',
  // G
  'glen albyn', 'glen elgin', 'glen garioch', 'glen grant', 'glen keith',
  'glen mhor', 'glen moray', 'glen ord', 'glen scotia', 'glen spey',
  'glenallachie', 'glenburgie', 'glencadam', 'glendronach', 'glendullan',
  'glenfarclas', 'glenfiddich', 'glenglassaugh', 'glengoyne', 'glenkinchie',
  'glenlivet', 'glenlossie', 'glenmorangie', 'glenrothes', 'glentauchers',
  'glenturret', 'green spot',
  // H
  'hakushu', 'hazelburn', 'heaven hill', 'hibiki', 'highland park',
  // I
  'ichiro', 'inchgower',
  // J
  'jameson', 'jura',
  // K
  'karuizawa', 'kilchoman', 'kilkerran', 'knockando', 'knockdhu',
  // L
  'lagavulin', 'laphroaig', 'ledaig', 'linkwood', 'longmorn', 'longrow',
  // M
  'macallan', 'mannochmore', 'midleton', 'miltonduff', 'miyagikyo', 'mortlach',
  // N
  'nikka',
  // O
  'oban', 'old pulteney',
  // P
  'pappy van winkle', 'port charlotte', 'port ellen',
  // R
  'redbreast', 'roseisle', 'royal brackla', 'royal lochnagar',
  // S
  'speyburn', 'springbank', 'strathisla', 'strathmill',
  // T
  'tamdhu', 'talisker', 'tamnavulin', 'teeling', 'tobermory', 'tomatin',
  'tomintoul', 'tormore', 'tullamore', 'tullibardine',
  // W
  'waterford', 'wemyss', 'wild turkey', 'woodford reserve',
  // Y
  'yamazaki', 'yellow spot', 'yoichi',
  // Independent bottlers
  'berry bros', 'cadenhead', 'cooper\'s choice', 'douglas laing',
  'gordon macphail', 'hart brothers', 'hunter laing', 'kingsbury',
  'malts of scotland', 'murray mcdavid', 'old malt cask', 'signatory',
  'the whisky agency', 'wemyss malts', 'wilson hart',
  // American & other world
  'blanton', 'buffalo trace', 'eagle rare', 'four roses', 'george t stagg',
  'heaven hill', 'michter', 'penderyn',
]

// ── Login ─────────────────────────────────────────────────────────────────────

async function loginToWA(page) {
  const username = process.env.WA_USERNAME
  const password = process.env.WA_PASSWORD
  if (!username || !password) {
    console.warn('[auth] WA_USERNAME / WA_PASSWORD not set — prices may be hidden behind login\n')
    return
  }
  console.log('[auth] Logging in to Whisky Auctioneer…')
  await navigate(page, 'https://whiskyauctioneer.com/user/login', { timeout: 30_000 })

  // WA does a JS redirect to /user/{id}?check_logged_in=1 if already logged in.
  // Wait up to 6s for that redirect — if URL changes we're done.
  const alreadyLoggedIn = await page
    .waitForURL(u => !u.includes('/user/login'), { timeout: 6000 })
    .then(() => true)
    .catch(() => false)

  if (alreadyLoggedIn) {
    console.log(`[auth] Already logged in (${page.url().split('?')[0]})\n`)
    return
  }

  try {
    await page.fill('#edit-name, input[name="name"]', username, { timeout: 15_000 })
    await sleep(jitter(500, 1000))
    await page.fill('#edit-pass, input[name="pass"], input[type="password"]', password, { timeout: 15_000 })
    await sleep(jitter(500, 1000))
    await Promise.all([
      page.waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),
      page.click('#edit-submit, input[type="submit"], button[type="submit"]'),
    ])
    console.log('[auth] Login successful\n')
  } catch (e) {
    console.warn('[auth] Login failed:', e.message, '\n')
  }
  await sleep(jitter(2500, 4000))
}

// ── Page liveness / recovery ──────────────────────────────────────────────────

async function ensurePage(browser) {
  const page = await createPage(browser)
  return page
}

async function isPageAlive(page) {
  try { await page.evaluate(() => true); return true } catch (_) { return false }
}

async function crawlKeyword(browser, page, keyword, seen, productUrls) {
  const MAX_PAGES = FLAGS.pages
  for (let p = 0; p < MAX_PAGES; p++) {
    const searchUrl = `${PAST_AUCTIONS_BASE}?items_per_page=184&sort_bef_combine=end_date_DESC&keyword=${encodeURIComponent(keyword)}&lots_bottle=All&page=${p}`
    // Note: end_date_DESC = most recently sold first (effectively most-liquid first).
    // If WA exposes a volume/bids sort, swap to e.g. sort_bef_combine=bids_DESC.

    if (!await isPageAlive(page)) {
      console.warn(`\n  [${keyword}] page context died — stopping keyword`)
      break
    }

    const resp = await navigate(page, searchUrl, { timeout: 45_000, waitFor: 'networkidle' })
    if (!resp || !await isPageAlive(page)) {
      console.warn(`\n  [${keyword}] p${p + 1} navigation failed — stopping keyword`)
      break
    }
    await sleep(jitter(1500, 2500))

    try {
      const urls = await extractResultsPageUrls(page)
      let newCount = 0
      for (const u of urls) {
        if (!seen.has(u)) { seen.add(u); productUrls.push(u); newCount++ }
      }
      process.stdout.write(`\r  [${keyword}] page ${p + 1} → ${newCount} new (${productUrls.length} total)   `)

      const more = await hasNextPage(page)
      if (!more) break
    } catch (e) {
      console.warn(`\n  [${keyword}] page ${p + 1} extract failed: ${e.message}`)
      break
    }

    await sleep(jitter(10_000, 14_000))
  }
  return page
}

async function crawlPastAuctions(browser, page) {
  await loginToWA(page)

  const progress = loadProgress() ?? {
    startedAt:         new Date().toISOString(),
    completedKeywords: new Set(),
    processedUrls:     new Set(),
    totalSales:        0,
  }

  const crawlStart  = Date.now()
  const maxMs       = FLAGS.maxHours ? FLAGS.maxHours * 3_600_000 : null

  const keywords    = FLAGS.keyword ? [FLAGS.keyword] : SEARCH_KEYWORDS
  const seen        = new Set([...progress.processedUrls])
  const productUrls = []

  // ── Phase 1: keyword discovery ──────────────────────────────────────────────
  const pendingKeywords = keywords.filter(k => !progress.completedKeywords.has(k))
  console.log(`Crawling ${pendingKeywords.length}/${keywords.length} keyword(s) (${progress.completedKeywords.size} already done), up to ${FLAGS.pages} pages each…\n`)

  const discoveryStart = Date.now()
  for (let ki = 0; ki < pendingKeywords.length; ki++) {
    if (maxMs && Date.now() - crawlStart > maxMs) {
      console.log(`\n[max-hours] ${FLAGS.maxHours}h limit reached — stopping. Resume with --resume.`)
      saveProgress(progress)
      break
    }

    const kw = pendingKeywords[ki]
    process.stdout.write(`\n[${ki + 1}/${pendingKeywords.length}] "${kw}"`)
    printProgress('keywords', ki, pendingKeywords.length, discoveryStart)

    if (!await isPageAlive(page)) {
      console.warn('\n  [recovery] reopening browser page…')
      page = await ensurePage(browser)
      await loginToWA(page)
    }

    page = await crawlKeyword(browser, page, kw, seen, productUrls)
    progress.completedKeywords.add(kw)
    saveProgress(progress)

    if (ki < pendingKeywords.length - 1) await sleep(jitter(10_000, 14_000))
  }

  process.stdout.write('\n')
  console.log(`\nDiscovered ${productUrls.length} new product URLs (${seen.size} total including prior runs)\n`)

  // ── Phase 2: product processing ─────────────────────────────────────────────
  const targets     = FLAGS.limit ? productUrls.slice(0, FLAGS.limit) : productUrls
  const procStart   = Date.now()
  let sessionSales  = 0

  for (let i = 0; i < targets.length; i++) {
    if (maxMs && Date.now() - crawlStart > maxMs) {
      console.log(`\n[max-hours] ${FLAGS.maxHours}h limit reached — stopping. Resume with --resume.`)
      break
    }

    const url = targets[i]
    if (progress.processedUrls.has(url)) continue

    printProgress(
      'products', i + 1, targets.length, procStart,
      ` | sales this session: ${sessionSales.toLocaleString()} | total: ${(progress.totalSales + sessionSales).toLocaleString()}`
    )

    if (!await isPageAlive(page)) {
      process.stdout.write('\n')
      console.warn('  [recovery] reopening browser page…')
      page = await ensurePage(browser)
      await loginToWA(page)
    }

    try {
      const n = await withRetry(
        () => processProductUrl(page, url),
        { retries: 2, delay: 3000, label: 'process-product' }
      )
      sessionSales += n
      progress.processedUrls.add(url)
      progress.totalSales = (progress.totalSales ?? 0) + n
    } catch (e) {
      process.stdout.write('\n')
      console.error(`  [${i + 1}/${targets.length}] failed: ${e.message}`)
    }

    if (i % 10 === 0) saveProgress(progress)
    if (i < targets.length - 1) await sleep(jitter(10_000, 14_000))
  }

  saveProgress(progress)
  process.stdout.write('\n')
  console.log(`\nDone. ${sessionSales.toLocaleString()} sales this session | ${progress.totalSales.toLocaleString()} total in DB.`)
  console.log(`Total elapsed: ${fmtDuration(Date.now() - crawlStart)}`)
}

// ── Sale-page discovery (legacy) ──────────────────────────────────────────────

async function discoverLotUrlsFromSalePage(page, saleUrl) {
  const response = await navigate(page, saleUrl, { timeout: 45_000 })
  if (!response) return []
  await sleep(jitter(800, 1600))

  return page.evaluate(() => {
    const hrefs = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(Boolean)
    const abs   = (href) => { try { return new URL(href, window.location.href).toString() } catch { return null } }
    const candidates = hrefs.map(abs).filter(Boolean)
      .filter(u => /whiskyauctioneer\.com/i.test(u))
      .filter(u => /\/lot\b|\/lots\//i.test(u))
    const seen = new Set(); const out = []
    for (const u of candidates) { if (!seen.has(u)) { seen.add(u); out.push(u) } }
    return out
  })
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const hasPastAuctions = FLAGS.pastAuctions
  const hasLotTargets   = FLAGS.lotUrl || FLAGS.lotFile
  const hasSaleUrl      = FLAGS.saleUrl

  if (!hasPastAuctions && !hasLotTargets && !hasSaleUrl) {
    die([
      'Provide one of:',
      '  --past-auctions          (bulk crawl — recommended)',
      '  --lot-url=<url>          (single lot)',
      '  --lot-file=<path>        (list of lot URLs)',
      '  --sale-url=<url>         (auction sale page)',
      '',
      'Optional: --pages=N (default 10), --limit=N, --dry-run, --debug, --headed',
    ].join('\n'))
  }

  keepAwake()
  if (FLAGS.dryRun) console.log('[dry-run mode — no DB writes]\n')

  const browser = await createBrowser({
    headless: !FLAGS.headed,
    executablePath: FLAGS.chromiumExec || undefined,
  })

  const page = await createPage(browser, {
    storageState: FLAGS.storageState
      ? JSON.parse(fs.readFileSync(FLAGS.storageState, 'utf8'))
      : undefined,
  })

  try {
    if (hasPastAuctions) {
      await crawlPastAuctions(browser, page)
      return
    }

    // Legacy targeted mode
    let lotUrls = loadLotUrls()

    if (hasSaleUrl) {
      const discovered = await withRetry(
        () => discoverLotUrlsFromSalePage(page, FLAGS.saleUrl),
        { retries: 3, delay: 2000, label: 'discover-lots' }
      )
      lotUrls = [...new Set([...lotUrls, ...discovered])]
    }

    if (FLAGS.limit) lotUrls = lotUrls.slice(0, FLAGS.limit)
    console.log(`Processing ${lotUrls.length} lot URLs…`)

    for (let i = 0; i < lotUrls.length; i++) {
      const u   = lotUrls[i]
      const idx = `${i + 1}/${lotUrls.length}`
      try {
        process.stdout.write(`\r[${idx}] ${u.slice(0, 90)}${u.length > 90 ? '…' : ''}   `)
        await withRetry(() => processLotUrl(page, u), { retries: 2, delay: 1500, label: 'process-lot' })
      } catch (e) {
        console.error(`\n[${idx}] failed: ${u}\n  ${e.message}`)
      }
      await sleep(jitter(10_000, 14_000))
    }
    process.stdout.write('\nDone.\n')

  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})

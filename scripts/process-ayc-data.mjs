/**
 * process-ayc-data.mjs
 *
 * Reads two auction data sources and writes src/data/allComparables.js:
 *   1. valuation-tool/ayc_results.csv     — AuctionYourCask.com scrape
 *   2. Projects/CASKDATA.csv              — GWA / other hand-recorded sales
 *
 * Usage: node scripts/process-ayc-data.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = []
    let cur = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { values.push(cur); cur = '' }
      else cur += ch
    }
    values.push(cur)
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  })
}

// Reads a GWA-format CSV, skipping the 2-line title block at the top
function readGWACSV(path, enc = 'utf8') {
  const raw = readFileSync(path, { encoding: enc })
  // Drop BOM
  const text = raw.replace(/^﻿/, '')
  const lines = text.split('\n')
  const headerIdx = lines.findIndex(l => l.startsWith('Auction Date'))
  if (headerIdx === -1) throw new Error(`No header row found in ${path}`)
  return parseCSV(lines.slice(headerIdx).join('\n'))
}

// ── OLA estimates (for AYC lots missing volume data) ─────────────────────────

const OLA_BY_TYPE = [
  { keys: ['sherry butt', 'oloroso butt', 'px butt'],    ola: 490 },
  { keys: ['butt'],                                        ola: 490 },
  { keys: ['puncheon'],                                    ola: 450 },
  { keys: ['sherry hogshead'],                             ola: 225 },
  { keys: ['hogshead'],                                    ola: 225 },
  { keys: ['barrique'],                                    ola: 225 },
  { keys: ['bourbon barrel', 'fresh bourbon', '1st fill bourbon barrel',
            'refill barrel', 'barrel'],                    ola: 190 },
  { keys: ['quarter cask'],                                ola: 50  },
  { keys: ['octave'],                                      ola: 50  },
]

function estimateOLA(caskType) {
  const s = String(caskType).toLowerCase()
  for (const { keys, ola } of OLA_BY_TYPE) {
    if (keys.some(k => s.includes(k))) return ola
  }
  return 225
}

function estimateRLA(ola, age) {
  return Math.round(ola * Math.pow(0.985, Math.max(0, age)))
}

// ── Tier classification (mirrors caskValuation.js TIER_MAP) ─────────────────

const TIER_MAP_PROC = {
  1: ['macallan', 'springbank', 'hazelburn', 'longrow'],
  2: ['bruichladdich', 'port charlotte', 'octomore', 'lochindaal',
      'ardbeg', 'lagavulin', 'laphroaig', 'bowmore', 'caol ila',
      'kilchoman', 'staoisha', 'bunnahabhain', 'ben nevis', 'dalmore',
      'highland park', 'clynelish', 'balvenie', 'glenlivet', 'glenfiddich',
      'tobermory', 'ledaig', 'glenfarclas', 'glenrothes',
      'deanston', 'littlemill', 'mortlach', 'rhinns',
      'port dundas', 'caperdonich'],
  3: ['teaninich', 'aultmore', 'auchroisk', 'longmorn', 'benriach',
      'benrinnes', 'craigellachie', 'glen moray', 'ardmore',
      'speyside distillery', 'glen elgin', 'miltonduff', 'linkwood',
      'tamdhu', 'glenallachie', 'balblair', 'glen garioch', 'blair athol',
      'inchgower', 'dailuaine', 'macduff', 'royal brackla', 'allt mor',
      'croftengea', 'dalmunach', 'glentauchers', 'north british', 'girvan',
      'coleburn'],
  4: ['tullibardine', 'annandale', 'holyrood', 'glasgow distillery',
      'adnams', 'dingle', 'arran', 'ardnamurchan', 'bonnington',
      'teithmill', 'whitlaw', 'cawdor springs', 'heaven hill',
      'fettercairn', 'ailsa bay', 'secret highland', 'secret speyside',
      'secret islay', 'lowland single malt', 'hinch'],
}

function getTierForEntry(distillery) {
  const key = String(distillery).toLowerCase().trim()
  for (const [tier, list] of Object.entries(TIER_MAP_PROC)) {
    if (list.some(d => d === key || key.includes(d) || d.includes(key))) return parseInt(tier)
  }
  return 4
}

// ── Distillery name normalisation (AYC raw names → canonical) ────────────────

const NAME_MAP = [
  ['arbikie highland rye single grain scotch whisky', 'Arbikie'],
  ['arbikie highland rye',                            'Arbikie'],
  ['arbikie spirit drink',                            'Arbikie'],
  ['staoisha bunnahabhain',                           'Staoisha'],
  ['staoisha distilled at bunnahabhain',              'Staoisha'],
  ['great northern distillery triple distilled',      'Great Northern Distillery'],
  ['great northern distillery irish pot still',       'Great Northern Distillery'],
  ['great northern irish pot still',                  'Great Northern Distillery'],
  ['great northern distillery',                       'Great Northern Distillery'],
  ['peallach peated tobermory',                       'Tobermory'],
  ['orkney island single malt',                       'Highland Park'],
  ['orkney single malt',                              'Highland Park'],
  ['bruichladdich rivesaltes',                        'Bruichladdich'],
  ['glensheil glenrothes',                            'Glenrothes'],
  ['whitlaw highland park',                           'Whitlaw'],
  ['annandale unpeated man owords',                   'Annandale'],
  ['north british grain',                             'North British'],
  ['guyana rum diamond port mourant',                 'Port Mourant'],
  ['guyana rum diamond distillery',                   'Diamond Distillery'],
  ['guyana rum port mourant',                         'Port Mourant'],
  ['barbados rum foursquare',                         'Foursquare'],
  ['nicaragua rum compania licorera',                 'Compania Licorera'],
  ['jamaica rum clarendon estate',                    'Clarendon Estate'],
  ['the speyside distillery',                         'Speyside Distillery'],
  ['speyside distillery',                             'Speyside Distillery'],
  ['the speyside',                                    'Speyside Distillery'],
  ['orkney',                                          'Highland Park'],
  ['islay blended malt',                              'Islay Blended Malt'],
  ['single malt islay scotch whisky',                 'Islay Single Malt'],
  ['ruadh maor',                                      'Ruadh Maor'],
  ['secret speyside',                                 'Secret Speyside'],
  ['aber falls',                                      'Aber Falls'],
]

function normaliseName(raw) {
  const key = String(raw).toLowerCase().trim()
  for (const [pattern, canonical] of NAME_MAP) {
    if (key === pattern || key.startsWith(pattern + ' ') || key.startsWith(pattern)) {
      return canonical
    }
  }
  return String(raw).split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function extractYear(dateStr) {
  if (!dateStr) return null
  const m = String(dateStr).match(/(\d{4})/)
  return m ? parseInt(m[1]) : null
}

// ── Source 1: AYC CSV ─────────────────────────────────────────────────────────

const AYC_PATH = resolve(__dirname, '../../valuation-tool/ayc_results.csv')
const aycRaw   = readFileSync(AYC_PATH, 'utf8')
const aycAllRows = parseCSV(aycRaw)

// Deduplicate by lot_id (keep most recently scraped)
const aycSeen = new Map()
for (const row of aycAllRows) {
  const id = row.lot_id
  if (!id) continue
  const prev = aycSeen.get(id)
  if (!prev || row.scraped_at > prev.scraped_at) aycSeen.set(id, row)
}

const aycComparables = []
for (const row of aycSeen.values()) {
  const price = parseFloat(row.sold_price) || 0

  const distillery = normaliseName(row.distillery || '')
  const vintage    = parseInt(row.vintage)
  const caskType   = row.cask_type || 'Hogshead'
  const aucYear    = extractYear(row.auction_date) || 2025

  if (!distillery) continue
  // Allow missing vintage (new-make / futures): treat as distilled in auction year
  const resolvedVintage = (vintage && vintage >= 1960 && vintage <= 2026) ? vintage : aucYear
  const age = Math.max(0, aucYear - resolvedVintage)

  const scrapedRla = parseFloat(row.rla) || parseFloat(row.loa) || parseFloat(row.lpa)
  const scrapedOla = parseFloat(row.ola)
  const ola        = scrapedOla || estimateOLA(caskType)
  const rla        = scrapedRla || estimateRLA(ola, age)
  const lpaEstimated = !scrapedRla && !scrapedOla

  const lpaPer = price > 0 ? Math.round((price / rla) * 10) / 10 : null
  const sold   = price > 0

  aycComparables.push({
    distillery,
    vintage: resolvedVintage,
    age,
    type: caskType,
    tier: getTierForEntry(distillery),
    rla,
    ola,
    lpaEstimated,
    lpaPer,
    total: Math.round(price),
    auctionYear: aucYear,
    lotId: row.lot_id || '',
    lotUrl: row.lot_url || '',
    source: 'AYC',
    sold,
  })
}

// ── Source 2: CASKDATA.csv (GWA + other hand-recorded) ───────────────────────

const GWA_PATH = resolve(__dirname, '../../../CASKDATA.csv')
const gwaRows  = readGWACSV(GWA_PATH, 'latin1')

// Deduplicate by (Auction Date + Lot No.) only when Lot No. is non-empty;
// blank Lot No. rows are each treated as distinct entries
let _gwaIdx = 0
const gwaSeen = new Map()
for (const row of gwaRows) {
  if (!row['Auction Date']?.startsWith('20')) continue
  const lotNo = row['Lot No.']?.trim()
  const k = lotNo ? `${row['Auction Date']}|${lotNo}` : `__blank_${_gwaIdx++}`
  if (!gwaSeen.has(k)) gwaSeen.set(k, row)
}

const gwaComparables = []
for (const row of gwaSeen.values()) {
  const status = row['Sold? (Y/N/RNM)']?.trim().toUpperCase()
  if (!status || status === 'N') continue  // skip entirely unsold; include Y and RNM

  const price = parseFloat(String(row['Hammer Price £'] || '').replace(/[£,]/g, ''))
  const distillery = normaliseName(row['Distillery'] || '')
  if (!distillery) continue

  const caskType   = row['Cask Type'] || 'Hogshead'
  const aucYear    = extractYear(row['Auction Date']) || 2025
  const rawVintage = extractYear(row['Fill Date'])
  // For new-make / futures (no fill date or fill date after auction): use aucYear as vintage, age=0
  const vintage    = rawVintage || aucYear
  const rawAge     = parseInt(row['Age at Sale (yrs)'])
  const age        = isNaN(rawAge) ? Math.max(0, aucYear - vintage) : Math.max(0, rawAge)

  if (!vintage) continue

  // Use recorded LPA if available; otherwise estimate from cask type + angel's share
  const scrapedLpa = parseFloat(row['LPA'])
  const lpaEstimated = !scrapedLpa || scrapedLpa <= 0
  const rla = lpaEstimated
    ? estimateRLA(estimateOLA(caskType), age)
    : Math.round(scrapedLpa * 10) / 10

  const lpaPer = (price && rla) ? Math.round((price / rla) * 10) / 10 : null
  const source = (row['Source'] || 'GWA').trim() || 'GWA'
  const sold   = status === 'Y'  // false = RNM (reserve not met — bid price is still market data)

  gwaComparables.push({
    distillery,
    vintage,
    age,
    type: caskType,
    tier: getTierForEntry(distillery),
    rla,
    ola: null,
    lpaEstimated,
    lpaPer,
    total: price ? Math.round(price) : 0,
    auctionYear: aucYear,
    lotId: row['Lot No.'] || '',
    lotUrl: '',
    source,
    sold,
  })
}

// ── Combine and output ────────────────────────────────────────────────────────

const all = [...gwaComparables, ...aycComparables]
all.sort((a, b) => a.distillery.localeCompare(b.distillery) || a.age - b.age)

const OUT_PATH = resolve(__dirname, '../src/data/allComparables.js')
const js = `// AUTO-GENERATED by scripts/process-ayc-data.mjs — do not edit manually
// Sources: CASKDATA.csv (GWA) + ayc_results.csv (AYC)
// ${gwaComparables.length} GWA  +  ${aycComparables.length} AYC  =  ${all.length} total

export const ALL_COMPARABLES = ${JSON.stringify(all, null, 2)}
`

writeFileSync(OUT_PATH, js)
console.log(`✓ Wrote ${all.length} comparables to ${OUT_PATH}`)
console.log(`  ${gwaComparables.length} GWA  +  ${aycComparables.length} AYC`)

const byDist = {}
for (const c of all) {
  if (!byDist[c.distillery]) byDist[c.distillery] = []
  byDist[c.distillery].push(c)
}
console.log('\nDistilleries with most lots:')
Object.entries(byDist)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 15)
  .forEach(([d, lots]) => {
    const withPrice = lots.filter(l => l.lpaPer != null)
    const range = withPrice.length
      ? `£/RLA ${Math.min(...withPrice.map(l => l.lpaPer))}–${Math.max(...withPrice.map(l => l.lpaPer))}`
      : ''
    console.log(`  ${d}: ${lots.length} lots  ${range}`)
  })

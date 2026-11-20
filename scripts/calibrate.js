/**
 * AYC calibration script.
 *
 * Usage:  pnpm calibrate
 *
 * Reads data/ayc_lots.csv (closed AYC lots with final bids).
 * Calls valueCask() for each priced lot and compares model output to the
 * observed price. Rows with an empty price_gbp are skipped.
 * All prices are "closed_unconfirmed": the highest bid shown, not a
 * confirmed sale. Treat results as indicative, not verified.
 *
 * OLA lots (lpa_basis = OLA) are flagged with * in the Bas column and
 * kept separate in the summary. The model receives the OLA figure; all
 * per-LPA comparisons are therefore on original-fill basis for those rows.
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath }               from 'url'
import { dirname, join }               from 'path'
import {
  valueCask,
  getTier,
  KNOWN_DISTILLERIES,
} from '../src/lib/caskValuation.js'

const __dir  = dirname(fileURLToPath(import.meta.url))
const ROOT   = join(__dir, '..')
const IN     = join(ROOT, 'data', 'ayc_lots.csv')
const OUT    = join(__dir, 'calibration_output.csv')

// ─── Utilities ────────────────────────────────────────────────────────────────

function median(arr) {
  if (!arr.length) return NaN
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const r1    = v  => Math.round(v * 10) / 10
const r2    = v  => Math.round(v * 100) / 100
const sgn   = v  => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
const gbpK  = v  => '£' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v))
const lpaFm = v  => '£' + v.toFixed(1)

function pad(str, n, right = false) {
  const s = String(str ?? '—')
  return right ? s.padStart(n) : s.slice(0, n).padEnd(n)
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').trim().split('\n').filter(Boolean)
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const parts = line.split(',')
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = i < headers.length - 1
        ? (parts[i] ?? '').trim()
        : parts.slice(i).join(',').trim()
    })
    return obj
  })
}

// ─── Cask-type mapping (AYC field → model string) ─────────────────────────────
//
// The model's caskTypeMultiplier() uses substring matching, so we construct a
// composite string that carries all the information it needs.
//
// Explicit overrides for cask types with no model equivalent:
const CT_OVERRIDES = {
  'cognac cask': { mapped: 'Barrique', note: 'Cognac Cask → Barrique (no cognac type in model; closest base vessel)' },
}

function mapCaskType(caskType, fillType) {
  const ct    = (caskType || '').trim()
  const ft    = (fillType  || '').trim().toLowerCase()
  const ctLow = ct.toLowerCase()

  if (CT_OVERRIDES[ctLow]) return CT_OVERRIDES[ctLow].mapped

  const parts = []

  // Fill prefix
  if (ft.includes('first-fill') || ft.includes('1st fill') || ft.includes('first fill')) {
    parts.push('1st Fill')
  } else if (ft.includes('refill') || ft.includes('re-fill')) {
    parts.push('Refill')
  }

  // Wood / flavour modifier
  if      (ft.includes('oloroso'))                                            parts.push('Oloroso')
  else if (ft.includes(' px') || ft.startsWith('px') || ft.includes('pedro')) parts.push('PX')
  else if (ft.includes('sherry'))                                             parts.push('Sherry')
  else if (ft.includes('bourbon'))                                            parts.push('Bourbon')
  else if (ft.includes('rivesaltes') || ft.includes('wine') ||
           ft.includes('pinot')      || ft.includes('port'))                  parts.push('Wine')

  parts.push(ct)
  return parts.join(' ')
}

// ─── Distillery known-check ───────────────────────────────────────────────────

const _knownLower = new Set(KNOWN_DISTILLERIES.map(d => d.toLowerCase()))

function isKnownDistillery(name) {
  const key = name.toLowerCase().trim()
  if (_knownLower.has(key)) return true
  for (const k of _knownLower) {
    if (k === key || k.includes(key) || key.includes(k)) return true
  }
  return false
}

// ─── Summary printer ─────────────────────────────────────────────────────────

function summarise(label, rows) {
  if (!rows.length) { console.log(`  ${label}: no data`); return }
  const absErrs = rows.map(r => Math.abs(r.pctErr))
  const signed  = rows.map(r => r.pctErr)
  const covered = rows.filter(r => r.inRange).length
  const covPct  = Math.round(covered / rows.length * 100)
  console.log(
    `  ${pad(label, 22)}` +
    `  n=${String(rows.length).padEnd(3)}` +
    `  med|err|=${pad(median(absErrs).toFixed(1) + '%', 8)}` +
    `  bias=${pad(sgn(median(signed)), 9)}` +
    `  in-range=${covered}/${rows.length} (${covPct}%)`
  )
}

// ─── Parse and filter ─────────────────────────────────────────────────────────

const allRows   = parseCSV(readFileSync(IN, 'utf8'))
const pricedRows = allRows.filter(r => r.price_gbp !== '' && !isNaN(parseFloat(r.price_gbp)))

console.log(`\nAYC CALIBRATION  —  ${pricedRows.length} priced lots (${allRows.length - pricedRows.length} skipped, no price)\n`)

// Warnings first (before the table)
for (const row of pricedRows) {
  const dist = row.distillery.trim()
  if (!isKnownDistillery(dist)) {
    console.log(`  UNMAPPED: "${dist}" — not in KNOWN_DISTILLERIES; using Tier ${getTier(dist)} default`)
  }
  const override = CT_OVERRIDES[row.cask_type.trim().toLowerCase()]
  if (override) {
    console.log(`  CASK APPROX: ${override.note}`)
  }
}
console.log()

// ─── Table header ─────────────────────────────────────────────────────────────

const H = [
  pad('Distillery', 16), pad('Yr', 5), pad('Bas', 4),
  pad('LPA', 7), pad('Mdl LPA', 7),
  pad('p20/L', 7), pad('mid/L', 7), pad('p80/L', 7),
  pad('Low£', 7), pad('Mid£', 7), pad('Hi£', 7),
  pad('Price£', 8), pad('Pr/LPA', 7),
  pad('Err%', 8), pad('InRng', 6),
  pad('T', 2), pad('Base£', 6), pad('AgeMx', 6), pad('CskMx', 6),
  pad('CopFac', 7), pad('BC%', 4),
]
const SEP = '─'.repeat(H.join(' ').length)
console.log(H.join(' '))
console.log(SEP)

// ─── Per-lot rows ─────────────────────────────────────────────────────────────

const results = []

for (const row of pricedRows) {
  const distillery = row.distillery.trim()
  const fillYear   = parseInt(row.fill_year)
  const lpa        = parseFloat(row.lpa)
  const lpaBasis   = row.lpa_basis.trim()
  const isOLA      = lpaBasis === 'OLA'
  const priceGbp   = parseFloat(row.price_gbp)
  const estLow     = row.estimate_low !== '' ? parseFloat(row.estimate_low) : null
  const estHigh    = row.estimate_high !== '' ? parseFloat(row.estimate_high) : null
  const mappedType = mapCaskType(row.cask_type, row.fill_type)
  const isApprox   = CT_OVERRIDES[row.cask_type.trim().toLowerCase()] != null

  const r = valueCask({ distillery, fillYear, caskType: mappedType, lpa })

  const pricePerLpa = priceGbp / lpa
  const pctErr      = (r.achievableLpa - pricePerLpa) / pricePerLpa * 100
  const inRange     = pricePerLpa >= r.p20Lpa && pricePerLpa <= r.p80Lpa

  // Tier base: BASE_LPA[tier] = fundamentalLpa / ageMult / caskMult
  const tierBase = (r.ageMult > 0 && r.caskMult > 0)
    ? r.fundamentalLpa / r.ageMult / r.caskMult
    : null

  const basLabel = isOLA ? lpaBasis + '*' : lpaBasis

  console.log([
    pad(distillery, 16),
    pad(fillYear, 5),
    pad(basLabel, 4),
    pad(lpa.toFixed(1), 7),
    pad(r.lpa, 7),
    pad(lpaFm(r.p20Lpa), 7),
    pad(lpaFm(r.achievableLpa), 7),
    pad(lpaFm(r.p80Lpa), 7),
    pad(gbpK(r.totalP20), 7),
    pad(gbpK(r.total), 7),
    pad(gbpK(r.totalP80), 7),
    pad(gbpK(priceGbp), 8),
    pad(lpaFm(pricePerLpa), 7),
    pad(sgn(pctErr), 8),
    pad(inRange ? 'YES' : 'no', 6),
    pad(r.tier, 2),
    pad(tierBase != null ? tierBase.toFixed(0) : '—', 6),
    pad(r.ageMult.toFixed(2), 6),
    pad(r.caskMult.toFixed(2), 6),
    pad(r.copulaFactor.toFixed(2), 7),
    pad(r.bcPremiumPct + '%', 4),
  ].join(' '))

  results.push({
    distillery,
    fill_year:        fillYear,
    lpa_basis:        lpaBasis,
    ola_flag:         isOLA ? 'OLA' : '',
    input_lpa:        lpa,
    model_lpa:        r.lpa,
    mapped_cask_type: mappedType,
    cask_approx:      isApprox ? CT_OVERRIDES[row.cask_type.trim().toLowerCase()].note.split('→')[0].trim() : '',
    model_p20_lpa:    r.p20Lpa,
    model_mid_lpa:    r.achievableLpa,
    model_p80_lpa:    r.p80Lpa,
    model_p20_total:  r.totalP20,
    model_mid_total:  r.total,
    model_p80_total:  r.totalP80,
    price_gbp:        priceGbp,
    price_per_lpa:    r1(pricePerLpa),
    pct_error_mid:    r1(pctErr),
    in_range:         inRange ? 'YES' : 'no',
    tier:             r.tier,
    tier_base:        tierBase != null ? r1(tierBase) : '',
    age_mult:         r.ageMult,
    cask_mult:        r.caskMult,
    copula_factor:    r.copulaFactor,
    bc_pct:           r.bcPremiumPct,
    fundamental_lpa:  r.fundamentalLpa,
    anchor_lpa:       r.anchorLpa ?? '',
    anchor_n:         r.anchorN,
    data_weight_pct:  r.dataWeight,
    estimate_low:     estLow ?? '',
    estimate_high:    estHigh ?? '',
    price_to_est_low: (estLow && estLow > 0) ? r2(priceGbp / estLow) : '',
    // internal fields for summary
    pctErr,
    inRange,
    isOLA,
  })
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const rlaRows  = results.filter(r => !r.isOLA)
const olaRows  = results.filter(r => r.isOLA)
const withEst  = results.filter(r => r.estimate_low !== '')

console.log('\n' + '─'.repeat(60))
console.log('SUMMARY')
console.log('  (* OLA rows: price/LPA is on original-fill basis)')
console.log('─'.repeat(60))

summarise('All lots',           results)
summarise('RLA only',           rlaRows)
summarise('OLA only (*)',       olaRows)
summarise('With estimate_low',  withEst)

if (withEst.length) {
  const ratios = withEst.map(r => r.price_to_est_low).filter(v => v !== '')
  if (ratios.length) {
    console.log(
      `\n  Median price / estimate_low: ${median(ratios.map(Number)).toFixed(2)}` +
      `  (n=${ratios.length}; >1 = bid exceeded low estimate)`
    )
  }
}

console.log()

// ─── Write output CSV ─────────────────────────────────────────────────────────

const csvCols = [
  'distillery', 'fill_year', 'lpa_basis', 'ola_flag', 'input_lpa', 'model_lpa',
  'mapped_cask_type', 'cask_approx',
  'model_p20_lpa', 'model_mid_lpa', 'model_p80_lpa',
  'model_p20_total', 'model_mid_total', 'model_p80_total',
  'price_gbp', 'price_per_lpa', 'pct_error_mid', 'in_range',
  'tier', 'tier_base', 'age_mult', 'cask_mult', 'copula_factor', 'bc_pct',
  'fundamental_lpa', 'anchor_lpa', 'anchor_n', 'data_weight_pct',
  'estimate_low', 'estimate_high', 'price_to_est_low',
]

const csvLines = [
  csvCols.join(','),
  ...results.map(r => csvCols.map(c => r[c] ?? '').join(',')),
]

writeFileSync(OUT, csvLines.join('\n') + '\n', 'utf8')
console.log(`Wrote ${results.length} rows → scripts/calibration_output.csv\n`)

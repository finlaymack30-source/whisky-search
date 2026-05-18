/**
 * Bottle Valuation Engine
 *
 * Two modes:
 *  1. DB lookup — surfaces real Whiskybase secondary-market prices from the
 *     whiskies table (5k+ bottles scraped via whiskybase-prices.js).
 *  2. Mathematical model — estimates when no DB match is found.
 *     RRP = estimated retail price at current age/size.
 *     Secondary = what it typically trades for on secondary market (May 2026).
 *     Recovery  = secondary market price in a normalised (pre-2024) market.
 *
 * Bottle market context: far more liquid and resilient than the cask market.
 * Reserve failure rates don't apply; bottle secondary premiums are compressed
 * from 2022 peaks but haven't collapsed the way cask values have.
 */

import { getTier } from './caskValuation'

// ─────────────────────────────────────────────────────────────
// Bottle model constants
// ─────────────────────────────────────────────────────────────

// Estimated RRP (£) for a 10yr, 700ml standard official bottling by tier
// Calibrated from May 2026 retail data
const BASE_RRP = { 1: 90, 2: 48, 3: 32, 4: 20 }

// Secondary market multiple vs RRP — current May 2026 conditions
// Bottle premiums compressed from 2022 peak but not collapsed
const SECONDARY_MULT = { 1: 1.65, 2: 1.10, 3: 0.92, 4: 0.82 }

// What that multiple was in a normalised (pre-crash) market
const RECOVERY_MULT = { 1: 2.80, 2: 1.65, 3: 1.20, 4: 0.98 }

// ─────────────────────────────────────────────────────────────
// Age multiplier — gentler curve than casks (retail pricing less non-linear)
// ─────────────────────────────────────────────────────────────

export function bottleAgeMultiplier(age) {
  if (!age || age < 1) return 0.85 // NAS
  if (age < 5)  return 0.65
  if (age < 8)  return 0.82
  if (age < 10) return 0.93
  if (age < 12) return 1.00
  if (age < 15) return 1.28
  if (age < 18) return 1.72
  if (age < 21) return 2.35
  if (age < 25) return 3.60
  if (age < 30) return 5.50
  if (age < 35) return 8.50
  return 13.0
}

// ─────────────────────────────────────────────────────────────
// Main estimate function (mathematical model fallback)
// ─────────────────────────────────────────────────────────────

export function estimateBottleValue({ distillery, age, sizeMl = 700 }) {
  const tier = getTier(distillery)
  const ageMult = bottleAgeMultiplier(age)
  const sizeFactor = sizeMl / 700

  const rrp       = Math.round(BASE_RRP[tier] * ageMult * sizeFactor)
  const secondary = Math.round(rrp * SECONDARY_MULT[tier])
  const recovery  = Math.round(rrp * RECOVERY_MULT[tier])
  const premiumPct = Math.round((SECONDARY_MULT[tier] - 1) * 100)

  const uncertainty = tier <= 2 ? 0.28 : 0.45
  const p20 = Math.round(secondary * (1 - uncertainty * 0.80))
  const p80 = Math.round(secondary * (1 + uncertainty * 1.20))

  const TIER_LABELS      = { 1: 'Elite', 2: 'Premium', 3: 'Quality', 4: 'Commodity' }
  const BOTTLE_LIQUIDITY = { 1: 'Moderate', 2: 'Good', 3: 'High', 4: 'Very High' }

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    liquidityLabel: BOTTLE_LIQUIDITY[tier],
    rrp, secondary, recovery,
    premiumPct, p20, p80,
    confidence: tier <= 2 ? 'Moderate' : 'Low',
    uncertainty: Math.round(uncertainty * 100),
    age: age || null,
    sizeMl,
  }
}

// ─────────────────────────────────────────────────────────────
// Distillery extraction — for comparable-bottle queries
// Matches the known-distillery list against the bottle title.
// Returns the canonical distillery name (e.g. "Macallan") or null.
// ─────────────────────────────────────────────────────────────

export function extractDistilleryFromTitle(title, knownDistilleries) {
  if (!title) return null
  const lower = title.toLowerCase()
  let best = null, bestLen = 0
  for (const d of knownDistilleries) {
    const key = d.toLowerCase()
    if (lower.includes(key) && key.length > bestLen) {
      best = d
      bestLen = key.length
    }
  }
  return best
}

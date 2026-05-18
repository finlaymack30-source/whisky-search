/**
 * Whisky Cask Valuation Engine
 *
 * Mathematical approach:
 *   1. Base £/LPA by distillery tier (calibrated from 2024–2026 sold lots)
 *   2. Age multiplier (non-linear; accelerates past 20yr)
 *   3. Cask type adjustment
 *   4. Bivariate Gaussian copula (age × reputation) — captures superlinear
 *      premium when both factors are high; dampened by current market stress
 *   5. Keynesian beauty contest premium — sentiment premium above liquid value,
 *      reflexively compressed in stressed markets
 *   6. Recovery scenario — what these casks could achieve if 2023 clearance
 *      rates returned; exposes the beauty contest premium numerically
 */

// ─────────────────────────────────────────────────────────────
// Distillery classification
// ─────────────────────────────────────────────────────────────

const TIER_MAP = {
  // Tier 1 — beauty contest elite; significant reflexive premium
  1: [
    'macallan', 'springbank', 'hazelburn', 'longrow',
  ],

  // Tier 2 — premium collectible; moderate reflexive premium
  2: [
    'bruichladdich', 'port charlotte', 'octomore', 'lochindaal',
    'ardbeg', 'lagavulin', 'laphroaig', 'bowmore', 'caol ila',
    'kilchoman', 'staoisha', 'bunnahabhain', 'ben nevis', 'dalmore',
    'highland park', 'clynelish', 'balvenie', 'glenlivet', 'glenfiddich',
    'tobermory', 'ledaig', 'glenfarclas', 'glenrothes',
    'deanston', 'littlemill', 'mortlach', 'rhinns',
    'port dundas', 'caperdonich',
  ],

  // Tier 3 — quality standard; limited sentiment premium
  3: [
    'teaninich', 'aultmore', 'auchroisk', 'longmorn', 'benriach',
    'benrinnes', 'craigellachie',
    'glen moray', 'ardmore', 'speyside distillery', 'glen elgin',
    'miltonduff', 'linkwood', 'tamdhu', 'glenallachie', 'balblair',
    'glen garioch', 'blair athol', 'inchgower', 'dailuaine', 'macduff',
    'royal brackla', 'allt mor', 'croftengea', 'dalmunach', 'glentauchers',
    'north british', 'girvan', 'aultmore', 'coleburn',
  ],

  // Tier 4 — commodity; price driven almost entirely by liquid content
  4: [
    'tullibardine', 'annandale', 'holyrood', 'glasgow distillery',
    'adnams', 'dingle', 'arran', 'ardnamurchan', 'bonnington',
    'teithmill', 'whitlaw', 'cawdor springs', 'heaven hill',
    'fettercairn', 'ailsa bay', 'auchroisk', 'benriach',
    'secret highland', 'secret speyside', 'secret islay',
    'lowland single malt', 'islay 2026 vintage', 'hinch',
  ],
}

// Beauty contest scores (Keynesian, 0–1)
// Calibrated from observed £/LPA premiums over tier baseline in functioning markets
const BEAUTY_SCORES = {
  'macallan': 0.98, 'springbank': 0.95, 'hazelburn': 0.92, 'longrow': 0.90,
  'ardbeg': 0.88, 'port charlotte': 0.85, 'bruichladdich': 0.82,
  'lagavulin': 0.84, 'laphroaig': 0.80, 'bowmore': 0.75,
  'balvenie': 0.78, 'glenfiddich': 0.72, 'glenlivet': 0.65,
  'highland park': 0.79, 'caol ila': 0.74, 'clynelish': 0.73,
  'ben nevis': 0.70, 'dalmore': 0.74, 'tobermory': 0.60, 'ledaig': 0.62,
  'glenfarclas': 0.68, 'glenrothes': 0.62, 'benrinnes': 0.55,
  'craigellachie': 0.60, 'teaninich': 0.46, 'mortlach': 0.68,
  'staoisha': 0.65, 'bunnahabhain': 0.62, 'speyside distillery': 0.52,
  'caperdonich': 0.58, 'littlemill': 0.60, 'deanston': 0.52,
}

// Base £/LPA at 10yr baseline — calibrated from actual sold lots (current 2026 market)
// Tier 1: anchored on WH Mar 2026 (Macallan 1989 HH £100k, est 150 LPA → £667/LPA at 37yr)
// Tier 2: anchored on GWA 2024 Bruichladdich 2011 Rhinns HH £17,250 / 104.9 LPA = £165 at 13yr
// Tier 3: anchored on GWA 2025 Benrinnes 14yr £43/LPA, Teaninich 17yr £60/LPA
// Tier 4: anchored on GWA RNM bids at ~50% achievability assumption
const BASE_LPA = { 1: 100, 2: 42, 3: 27, 4: 8 }

// Recovery multiplier: ratio of 2023 achievable to current 2026 achievable
// Tier 3 casks suffered most (structural demand destruction)
const RECOVERY_MULT = { 1: 1.8, 2: 2.6, 3: 3.2, 4: 4.0 }

// ─────────────────────────────────────────────────────────────
// Age multiplier — non-linear; accelerates past 20yr
// Calibrated to match observed £/LPA data across age brackets
// ─────────────────────────────────────────────────────────────

export function ageMultiplier(age) {
  if (age < 1)  return 0.30
  if (age < 3)  return 0.42
  if (age < 5)  return 0.60
  if (age < 8)  return 0.80
  if (age < 10) return 0.93
  if (age < 12) return 1.00
  if (age < 15) return 1.22
  if (age < 18) return 1.52
  if (age < 20) return 1.90
  if (age < 22) return 2.40
  if (age < 25) return 3.00
  if (age < 28) return 4.20
  if (age < 32) return 6.20
  if (age < 35) return 9.00
  return 13.0
}

// ─────────────────────────────────────────────────────────────
// Cask type parsing → composite multiplier
// ─────────────────────────────────────────────────────────────

export function caskTypeMultiplier(caskType) {
  const s = String(caskType).toLowerCase()
  let m = 1.0

  // Vessel size (per LPA: smaller = more wood contact = premium)
  if (s.includes('butt'))        m *= 0.88
  else if (s.includes('puncheon')) m *= 0.91
  else if (s.includes('octave'))   m *= 1.32
  else if (s.includes('quarter'))  m *= 1.22
  else if (s.includes('barrique')) m *= 1.06
  else if (s.includes('barrel'))   m *= 1.08
  // hogshead = baseline 1.0

  // Fill type
  if (s.includes('1st fill') || s.includes('first fill') || s.includes('fresh')) m *= 1.10
  else if (s.includes('refill') || s.includes('re-fill')) m *= 0.91

  // Wood/finish (additive premiums; stacked only once)
  if (s.includes('oloroso') || s.includes('px sherry'))  m *= 1.18
  else if (s.includes('sherry'))                          m *= 1.14
  else if (s.includes('pinot') || s.includes('mouton'))  m *= 1.13
  else if (s.includes('port'))                            m *= 1.10
  else if (s.includes('ruby port'))                       m *= 1.12
  else if (s.includes('wine') && !s.includes('bourbon')) m *= 1.07
  else if (s.includes('virgin oak'))                      m *= 1.05

  return Math.max(0.70, Math.min(1.65, m))
}

// ─────────────────────────────────────────────────────────────
// Normal distribution helpers (for copula)
// ─────────────────────────────────────────────────────────────

function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const p = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const cdf = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x) * p
  return x >= 0 ? cdf : 1 - cdf
}

function probit(p) {
  // Acklam rational approximation — max error 1.15e-9
  const a = [-3.969683028665376e+01,  2.209460984245205e+02, -2.759285104469687e+02,
              1.383577518672690e+02, -3.066479806614716e+01,  2.506628277459239e+00]
  const b = [-5.447609879822406e+01,  1.615858368580409e+02, -1.556989798598866e+02,
              6.680131188771972e+01, -1.328068155288572e+01]
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00,  4.374664141464968e+00,  2.938163982698783e+00]
  const d = [ 7.784695709041462e-03,  3.224671290700398e-01,  2.445134137142996e+00,
              3.754408661907416e+00]
  const p_lo = 0.02425, p_hi = 1 - p_lo
  if (p < p_lo) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
  }
  if (p <= p_hi) {
    const q = p - 0.5, r = q*q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
  }
  const q = Math.sqrt(-2 * Math.log(1-p))
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
}

// ─────────────────────────────────────────────────────────────
// Bivariate Gaussian copula — age × reputation dependence
//
// Captures the superlinear premium when age AND distillery reputation
// are both high. In independent models, the effects multiply; in the
// Gaussian copula with ρ > 0, joint tail probability is amplified.
//
// Copula density ratio: c(u,v|ρ) = φ₂(Φ⁻¹(u),Φ⁻¹(v);ρ) / [φ(Φ⁻¹(u))φ(Φ⁻¹(v))]
// simplifies to: exp[(2ρz₁z₂ - ρ²(z₁²+z₂²)) / 2(1-ρ²)] / √(1-ρ²)
// ─────────────────────────────────────────────────────────────

function ageCDF(age) {
  // Log-normal CDF for observed cask age distribution (median ~14yr, σ≈0.6)
  return normalCDF((Math.log(Math.max(age, 0.5)) - Math.log(14)) / 0.60)
}

function tierCDF(tier) {
  return [0.95, 0.72, 0.42, 0.15][tier - 1]
}

// ρ = 0.72: strong positive correlation (old casks from famous distilleries
// compound each other's value — empirically visible in the Springbank/Macallan data)
const RHO = 0.72

export function gaussianCopulaFactor(age, tier) {
  const u = ageCDF(age)
  const v = tierCDF(tier)
  const z1 = probit(u)
  const z2 = probit(v)
  const rho2 = RHO ** 2
  // Bivariate Gaussian copula density ratio (> 1 when both factors are high)
  const raw = Math.exp((2 * RHO * z1 * z2 - rho2 * (z1 ** 2 + z2 ** 2)) / (2 * (1 - rho2))) / Math.sqrt(1 - rho2)
  // Current market stress compresses the amplification to 32% of bull-market strength
  const marketStressDampener = 0.32
  return 1 + (raw - 1) * marketStressDampener
}

// ─────────────────────────────────────────────────────────────
// Keynesian beauty contest premium
//
// Models the reflexive, self-fulfilling premium above fundamental value.
// "It is not a case of choosing those [faces] which, to the best of one's
// judgment, are really the prettiest, nor even those which average opinion
// genuinely thinks the prettiest. We have reached the third degree where we
// devote our intelligences to anticipating what average opinion expects the
// average opinion to be." — Keynes, General Theory, Ch. 12
//
// In stressed markets, the reflexive loop collapses: if buyers expect others
// to stop paying premiums, no-one pays premiums → self-fulfilling correction.
// ─────────────────────────────────────────────────────────────

// Current GWA market stress: 97.9% failure rate (Jan–Apr 2026)
const MARKET_STRESS = 0.979

// Tier-specific premium retention in stressed markets
// Tier 1 distilleries retain more of their premium (genuine underlying demand)
const STRESS_RETENTION = { 1: 0.52, 2: 0.34, 3: 0.20, 4: 0.10 }

// Seller expectation decay: monthly rate at which sellers accept reality
// Tier 1 owners are wealthy and patient; Tier 4 sellers capitulate fastest
const MONTHLY_DECAY = { 1: 0.008, 2: 0.015, 3: 0.020, 4: 0.030 }
const MONTHS_SINCE_PEAK = 28 // Jan 2024 (market peak) → May 2026

export function beautyContestPremium(distillery, tier) {
  const score = BEAUTY_SCORES[distillery?.toLowerCase()] ??
    (tier === 1 ? 0.92 : tier === 2 ? 0.70 : tier === 3 ? 0.45 : 0.26)
  const retention = STRESS_RETENTION[tier]
  // Premium compression: stress collapses reflexive premium toward fundamental
  const compression = 1 - MARKET_STRESS * (1 - retention)
  return score * 0.85 * compression  // raw max premium is 85% of beauty score
}

// ─────────────────────────────────────────────────────────────
// Distillery lookup
// ─────────────────────────────────────────────────────────────

export function getTier(distillery) {
  const key = String(distillery).toLowerCase().trim()
  for (const [tier, list] of Object.entries(TIER_MAP)) {
    if (list.some(d => d === key || key.includes(d) || d.includes(key))) return parseInt(tier)
  }
  return 4
}

export function getBeautyScore(distillery, tier) {
  const key = String(distillery).toLowerCase().trim()
  return BEAUTY_SCORES[key] ?? (tier === 1 ? 0.92 : tier === 2 ? 0.70 : tier === 3 ? 0.45 : 0.26)
}

// ─────────────────────────────────────────────────────────────
// Main valuation function
// ─────────────────────────────────────────────────────────────

export function valueCask({ distillery, fillYear, caskType = 'Hogshead', lpa = null }) {
  const age = Math.max(0, 2026 - parseInt(fillYear))
  const tier = getTier(distillery)
  const beautyScore = getBeautyScore(distillery, tier)

  // ── 1. Fundamental £/LPA ──────────────────────────────────
  // Liquid content value: base rate × age × cask type
  const baseLpa     = BASE_LPA[tier]
  const ageMult     = ageMultiplier(age)
  const caskMult    = caskTypeMultiplier(caskType)
  const fundamentalLpa = baseLpa * ageMult * caskMult

  // ── 2. Copula z-scores (computed once, used for both current + peak) ──
  const u = ageCDF(age)
  const v = tierCDF(tier)
  const z1 = probit(u)
  const z2 = probit(v)
  const rho2 = RHO ** 2
  const rawCopula = Math.exp(
    (2 * RHO * z1 * z2 - rho2 * (z1**2 + z2**2)) / (2 * (1 - rho2))
  ) / Math.sqrt(1 - rho2)

  // ── 3. Current achievable £/LPA ───────────────────────────
  const copulaFactor = 1 + (rawCopula - 1) * 0.32   // 32% of bull-market amplification
  const bcPrem = beautyContestPremium(distillery, tier)
  const achievableLpa = fundamentalLpa * copulaFactor * (1 + bcPrem)

  // ── 4. Recovery scenario ──────────────────────────────────
  const recoveryLpa = achievableLpa * RECOVERY_MULT[tier]

  // ── 5. Seller expectation (sticky 2023 peak anchor, decaying monthly) ──
  // Sellers anchor to Jan 2024 peak (≈ recovery scenario price) and discount
  // at a tier-specific rate as they come to terms with the crashed market.
  const decayRate = MONTHLY_DECAY[tier]
  const sellerExpLpa = recoveryLpa * Math.pow(1 - decayRate, MONTHS_SINCE_PEAK)
  const gapPct = sellerExpLpa > achievableLpa
    ? Math.round((sellerExpLpa - achievableLpa) / sellerExpLpa * 100)
    : 0
  // Months until seller expectation decays to current buyer willingness
  const capitulationMonths = sellerExpLpa > achievableLpa
    ? Math.ceil(Math.log(achievableLpa / sellerExpLpa) / Math.log(1 - decayRate))
    : 0

  // ── 6. Confidence interval ───────────────────────────────
  const hasDirectData = Object.keys(BEAUTY_SCORES).includes(
    String(distillery).toLowerCase().trim()
  )
  const baseUncertainty = hasDirectData ? 0.32 : 0.52
  const ageUncertainty  = age > 30 ? 0.18 : age < 5 ? 0.14 : 0
  const uncertainty     = baseUncertainty + ageUncertainty

  const p20Lpa = achievableLpa * (1 - uncertainty * 0.80)
  const p80Lpa = achievableLpa * (1 + uncertainty * 1.25)

  // ── 7. Total values (if LPA provided) ────────────────────
  const round = (v, nearest = 100) => Math.round(v / nearest) * nearest
  const total    = lpa ? round(achievableLpa * lpa) : null
  const totalP20 = lpa ? round(p20Lpa * lpa)        : null
  const totalP80 = lpa ? round(p80Lpa * lpa)         : null
  const totalRecovery = lpa ? round(recoveryLpa * lpa) : null

  // ── 8. Qualitative labels ─────────────────────────────────
  const TIER_LABELS = { 1: 'Elite', 2: 'Premium', 3: 'Quality', 4: 'Commodity' }
  const LIQUIDITY   = { 1: 'Limited', 2: 'Very Low', 3: 'Thin', 4: 'Near Zero' }

  return {
    // Core numbers
    achievableLpa: Math.round(achievableLpa * 10) / 10,
    p20Lpa:        Math.round(p20Lpa * 10) / 10,
    p80Lpa:        Math.round(p80Lpa * 10) / 10,
    recoveryLpa:   Math.round(recoveryLpa * 10) / 10,
    fundamentalLpa: Math.round(fundamentalLpa * 10) / 10,

    // Total value
    total, totalP20, totalP80, totalRecovery,

    // Seller expectation vs buyer willingness
    sellerExpLpa:        Math.round(sellerExpLpa * 10) / 10,
    gapPct,
    capitulationMonths,
    decayRate,

    // Model components (for display)
    age,
    tier,
    tierLabel:       TIER_LABELS[tier],
    beautyScore,
    bcPremiumPct:    Math.round(bcPrem * 100),
    copulaFactor:    Math.round(copulaFactor * 100) / 100,
    liquidityLabel:  LIQUIDITY[tier],
    ageMult:         Math.round(ageMult * 100) / 100,
    caskMult:        Math.round(caskMult * 100) / 100,
    recoveryMult:    RECOVERY_MULT[tier],

    // Meta
    confidence:   hasDirectData ? 'Moderate' : 'Low',
    uncertainty:  Math.round(uncertainty * 100),
  }
}

// ─────────────────────────────────────────────────────────────
// Comparable sales (from actual dataset)
// ─────────────────────────────────────────────────────────────

const COMPARABLES = [
  { distillery: 'Springbank',          tier: 1, age: 27, type: 'Fresh Sherry HH',   lpaPer: 1342, total: 87750,  source: 'GWA', year: 2023 },
  { distillery: 'Macallan',            tier: 1, age: 34, type: 'Refill Butt',        lpaPer: null, total: 915500, source: 'WH',  year: 2022 },
  { distillery: 'Macallan',            tier: 1, age: 37, type: 'Hogshead',           lpaPer: null, total: 100000, source: 'WH',  year: 2026 },
  { distillery: 'Port Charlotte',      tier: 2, age: 20, type: 'Refill Sherry HH',   lpaPer: 207,  total: 29250,  source: 'GWA', year: 2024 },
  { distillery: 'Bruichladdich',       tier: 2, age: 13, type: 'Rhinns HH',          lpaPer: 165,  total: 17250,  source: 'GWA', year: 2024 },
  { distillery: 'Bruichladdich',       tier: 2, age: 20, type: 'Refill Sherry HH',   lpaPer: 116,  total: 17500,  source: 'GWA', year: 2024 },
  { distillery: 'Ben Nevis',           tier: 2, age: 26, type: 'Refill HH',          lpaPer: 207,  total: 34750,  source: 'GWA', year: 2022 },
  { distillery: 'Dalmore',             tier: 2, age: 18, type: 'Barrel',             lpaPer: 382,  total: 32000,  source: 'GWA', year: 2023 },
  { distillery: 'Caol Ila',            tier: 2, age: 12, type: 'Hogshead',           lpaPer: 65,   total: 8600,   source: 'GWA', year: 2020 },
  { distillery: 'Speyside Distillery', tier: 3, age: 29, type: 'Butt',               lpaPer: 93,   total: 20250,  source: 'GWA', year: 2024 },
  { distillery: 'Speyside Distillery', tier: 3, age: 30, type: '1st Fill Pinot Noir',lpaPer: 179,  total: 7500,   source: 'GWA', year: 2026 },
  { distillery: 'Teaninich',           tier: 3, age: 17, type: 'Refill Bourbon HH',  lpaPer: 60,   total: 5000,   source: 'GWA', year: 2025 },
  { distillery: 'Benrinnes',           tier: 3, age: 14, type: 'Refill Bourbon HH',  lpaPer: 43,   total: 4500,   source: 'GWA', year: 2025 },
  { distillery: 'Glen Moray',          tier: 3, age: 5,  type: 'Barrel',             lpaPer: 31,   total: 3150,   source: 'GWA', year: 2020 },
]

export function findComparables(distillery, tier, age) {
  const key = String(distillery).toLowerCase()
  const exact = COMPARABLES.filter(c => c.distillery.toLowerCase() === key)
  if (exact.length >= 2) return exact.slice(0, 3)

  const nearby = COMPARABLES
    .filter(c => c.tier === tier && Math.abs(c.age - age) <= 10)
    .sort((a, b) => Math.abs(a.age - age) - Math.abs(b.age - age))
    .slice(0, 3 - exact.length)

  return [...exact, ...nearby].slice(0, 3)
}

// All known distilleries for the autocomplete list
export const KNOWN_DISTILLERIES = [
  'Macallan', 'Springbank', 'Hazelburn', 'Longrow',
  'Bruichladdich', 'Port Charlotte', 'Octomore', 'Lochindaal',
  'Ardbeg', 'Lagavulin', 'Laphroaig', 'Bowmore', 'Caol Ila',
  'Kilchoman', 'Bunnahabhain', 'Staoisha', 'Ben Nevis', 'Dalmore',
  'Highland Park', 'Clynelish', 'Balvenie', 'Glenlivet', 'Glenfiddich',
  'Tobermory', 'Ledaig', 'Glenfarclas', 'Glenrothes', 'Benrinnes',
  'Craigellachie', 'Deanston', 'Littlemill', 'Mortlach', 'Rhinns',
  'Teaninich', 'Aultmore', 'Auchroisk', 'Longmorn', 'Benriach',
  'Glen Moray', 'Ardmore', 'Speyside Distillery', 'Glen Elgin',
  'Miltonduff', 'Linkwood', 'Tamdhu', 'Glenallachie', 'Balblair',
  'Glen Garioch', 'Blair Athol', 'Inchgower', 'Dailuaine', 'Macduff',
  'Royal Brackla', 'Dalmunach', 'Glentauchers', 'North British',
  'Girvan', 'Coleburn', 'Croftengea', 'Tullibardine', 'Annandale',
  'Holyrood', 'Glasgow Distillery', 'Adnams', 'Dingle', 'Arran',
  'Ardnamurchan', 'Teithmill', 'Fettercairn', 'Heaven Hill',
]

import { ALL_COMPARABLES } from '../data/allComparables.js'

// ─────────────────────────────────────────────────────────────
// Distillery classification
// ─────────────────────────────────────────────────────────────

const TIER_MAP = {
  1: ['macallan', 'springbank', 'hazelburn', 'longrow'],
  2: [
    'bruichladdich', 'port charlotte', 'octomore', 'lochindaal',
    'ardbeg', 'lagavulin', 'laphroaig', 'bowmore', 'caol ila',
    'kilchoman', 'staoisha', 'bunnahabhain', 'ben nevis', 'dalmore',
    'highland park', 'clynelish', 'balvenie', 'glenlivet', 'glenfiddich',
    'tobermory', 'ledaig', 'glenfarclas', 'glenrothes',
    'deanston', 'littlemill', 'mortlach', 'rhinns',
    'port dundas', 'caperdonich',
  ],
  3: [
    'teaninich', 'aultmore', 'auchroisk', 'longmorn', 'benriach',
    'benrinnes', 'craigellachie', 'glen moray', 'ardmore',
    'speyside distillery', 'glen elgin', 'miltonduff', 'linkwood',
    'tamdhu', 'glenallachie', 'balblair', 'glen garioch', 'blair athol',
    'inchgower', 'dailuaine', 'macduff', 'royal brackla', 'allt mor',
    'croftengea', 'dalmunach', 'glentauchers', 'north british', 'girvan',
    'coleburn',
  ],
  4: [
    'tullibardine', 'annandale', 'holyrood', 'glasgow distillery',
    'adnams', 'dingle', 'arran', 'ardnamurchan', 'bonnington',
    'teithmill', 'whitlaw', 'cawdor springs', 'heaven hill',
    'fettercairn', 'ailsa bay', 'secret highland', 'secret speyside',
    'secret islay', 'lowland single malt', 'hinch',
  ],
}

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

// Base £/LPA at 10yr baseline — recalibrated May 2026 from median age-normalised
// sold lots (recorded LPA, 2023+, age 5–30).  T4 corrected from £8 → £19 after
// discovering the £8 figure used a 50%-achievability discount on RNM bids; confirmed
// sold data shows median realised price ≈ £19.8 normalised.
const BASE_LPA = { 1: 100, 2: 42, 3: 24, 4: 19 }

// Recovery multiplier: ratio of 2023-peak achievable to current 2026 achievable
const RECOVERY_MULT = { 1: 1.8, 2: 2.6, 3: 3.2, 4: 4.0 }

// Current GWA market stress and tier retention
const MARKET_STRESS    = 0.979
const STRESS_RETENTION = { 1: 0.52, 2: 0.34, 3: 0.20, 4: 0.10 }
const MONTHLY_DECAY    = { 1: 0.008, 2: 0.015, 3: 0.020, 4: 0.030 }
const MONTHS_SINCE_PEAK = 34

// ─────────────────────────────────────────────────────────────
// Normal distribution helpers (kept for ageCDF marginal)
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
// Student-t distribution (replacing Gaussian for copula)
//
// The Gaussian copula has λ_U = 0 (zero upper tail dependence), meaning
// joint extreme realisations are underweighted — the exact failure mode
// of CDO models in 2008. For whisky, the joint tail (old + elite) is the
// most commercially critical cell. The Student-t copula with ν < ∞ has:
//   λ_U = 2·t_{ν+1}(−√((ν+1)(1−ρ)/(1+ρ))) > 0
// For ν=4, ρ=0.72: λ_U ≈ 0.40 — substantial upper tail dependence.
// ─────────────────────────────────────────────────────────────

function lgamma(z) {
  // Lanczos approximation, g=7, n=9 — error < 1e-15 for Re(z) > 0.5
  const p = [
    0.99999999999980993,  676.5203681218851, -1259.1392167224028,
     771.32342877765313, -176.61502916214059,   12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z)
  z -= 1
  let a = p[0]
  for (let i = 1; i < 9; i++) a += p[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
}

function betaCF(a, b, x) {
  // Continued-fraction evaluation of the regularised incomplete beta (Lentz's method)
  const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30
  const qab = a + b, qap = a + 1, qam = a - 1
  let c = 1, d = 1 - qab * x / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d; let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d; h *= d * c
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d; const del = d * c; h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

function betaI(a, b, x) {
  // Regularised incomplete beta I_x(a,b)
  if (x <= 0) return 0
  if (x >= 1) return 1
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b)
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta)
  return x < (a + 1) / (a + b + 2)
    ? bt * betaCF(a, b, x) / a
    : 1 - bt * betaCF(b, a, 1 - x) / b
}

function tCDF(x, nu) {
  // P(T_ν ≤ x) via regularised incomplete beta
  // P(T_ν ≤ x) = I_{ν/(ν+x²)}(ν/2, 1/2) / 2   for x ≤ 0
  //            = 1 − I_{ν/(ν+x²)}(ν/2, 1/2) / 2  for x > 0
  if (x === 0) return 0.5
  const z = nu / (nu + x * x)
  const ib = betaI(nu / 2, 0.5, z) / 2
  return x > 0 ? 1 - ib : ib
}

function tPDF(x, nu) {
  // f_ν(x) = Γ((ν+1)/2) / (Γ(ν/2)·√(νπ)) · (1+x²/ν)^{−(ν+1)/2}
  return Math.exp(
    lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * Math.PI)
    - (nu + 1) / 2 * Math.log(1 + x * x / nu)
  )
}

function tQuantile(p, nu) {
  // Inverse t-CDF via Newton's method with Cornish-Fisher initial guess
  if (p <= 0) return -1e15
  if (p >= 1) return  1e15
  if (p === 0.5) return 0
  const z = probit(p)
  let x = z * (1 + (z * z + 1) / (4 * nu))   // Cornish-Fisher correction
  for (let i = 0; i < 12; i++) {
    const fx = tCDF(x, nu) - p
    if (Math.abs(fx) < 1e-12) break
    const step = fx / tPDF(x, nu)
    x -= step
    if (Math.abs(step) < 1e-10) break
  }
  return x
}

// ─────────────────────────────────────────────────────────────
// Student-t copula density ratio
//
// c_{ρ,ν}(u,v) = f₂(x,y;ρ,ν) / [f₁(x;ν)·f₁(y;ν)]
//              where x = t_ν⁻¹(u), y = t_ν⁻¹(v)
//
// log c = lgamma((ν+2)/2) + lgamma(ν/2) − 2·lgamma((ν+1)/2)
//       − ½·log(1−ρ²)
//       − (ν+2)/2·log(1 + Q/ν)
//       + (ν+1)/2·[log(1+x²/ν) + log(1+y²/ν)]
// where Q = (x²−2ρxy+y²)/(1−ρ²)
// ─────────────────────────────────────────────────────────────

function tCopulaDensityRatio(u, v, rho, nu) {
  const x = tQuantile(u, nu), y = tQuantile(v, nu)
  const rho2 = rho * rho
  const Q = (x * x - 2 * rho * x * y + y * y) / (1 - rho2)
  return Math.exp(
    lgamma((nu + 2) / 2) + lgamma(nu / 2) - 2 * lgamma((nu + 1) / 2)
    - 0.5 * Math.log(1 - rho2)
    - (nu + 2) / 2 * Math.log(1 + Q / nu)
    + (nu + 1) / 2 * (Math.log(1 + x * x / nu) + Math.log(1 + y * y / nu))
  )
}

// ─────────────────────────────────────────────────────────────
// Age multiplier — structural (piecewise linear) version
//
// Kept as reference for the recovery scenario description and
// as a fallback if the OLS fit fails. The structural curve was
// calibrated to pre-crash market conditions; it overstates the
// current market's age sensitivity by 40–60% at 25–30yr.
// ─────────────────────────────────────────────────────────────

const AGE_BREAKS = [
  [0, 0.30], [1, 0.42], [3, 0.60], [5, 0.80], [8, 0.93],
  [10, 1.00], [12, 1.22], [15, 1.52], [18, 1.90], [20, 2.40],
  [22, 3.00], [25, 4.20], [28, 6.20], [32, 9.00], [35, 13.0],
]

export function ageMultiplierStructural(age) {
  if (age <= 0) return 0.30
  if (age >= 35) return 13.0
  for (let i = 0; i < AGE_BREAKS.length - 1; i++) {
    const [a0, v0] = AGE_BREAKS[i], [a1, v1] = AGE_BREAKS[i + 1]
    if (age >= a0 && age < a1) return v0 + (v1 - v0) * (age - a0) / (a1 - a0)
  }
  return 13.0
}

// ─────────────────────────────────────────────────────────────
// Cask type multiplier
// ─────────────────────────────────────────────────────────────

export function caskTypeMultiplier(caskType) {
  const s = String(caskType).toLowerCase()
  let m = 1.0
  if (s.includes('butt'))          m *= 0.88
  else if (s.includes('puncheon')) m *= 0.91
  else if (s.includes('octave'))   m *= 1.32
  else if (s.includes('quarter'))  m *= 1.22
  else if (s.includes('barrique')) m *= 1.06
  else if (s.includes('barrel'))   m *= 1.08
  if (s.includes('1st fill') || s.includes('first fill') || s.includes('fresh')) m *= 1.10
  else if (s.includes('refill') || s.includes('re-fill')) m *= 0.91
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
// OLS-fitted age multiplier
//
// Fits log(lpaPer / BASE_LPA[tier] / caskMult) = β₀ + β₁·log(age) + β₂·log²(age)
// on sold lots 2022+ with recorded LPA. The quadratic in log(age) is
// flexible (captures the accelerating premium) while remaining regular.
// Normalised so ageMultiplier(10) = 1.0.
//
// Separation from the structural curve: the structural (piecewise) curve
// describes the *long-run fundamental* age premium (used as a reference for
// the recovery scenario). The OLS curve describes the *current market's*
// willingness to pay for age. These can differ — and in 2026 they do:
// the current market applies roughly age^1.9 vs the structural age^3.5+
// at 25yr. The formula path uses the OLS curve; the recovery scenario
// multiplier encodes the ratio.
// ─────────────────────────────────────────────────────────────

function _solve3x3(A, b) {
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < 3; col++) {
    let maxRow = col
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    const piv = M[col][col]
    if (Math.abs(piv) < 1e-14) return null
    for (let row = 0; row < 3; row++) {
      if (row === col) continue
      const f = M[row][col] / piv
      for (let k = col; k <= 3; k++) M[row][k] -= f * M[col][k]
    }
  }
  return [0, 1, 2].map(i => M[i][3] / M[i][i])
}

function _fitOLSAge() {
  const data = ALL_COMPARABLES.filter(c =>
    c.sold && c.lpaPer > 0 && !c.lpaEstimated &&
    c.age >= 2 && c.age <= 35 && c.auctionYear >= 2022
  )
  if (data.length < 15) return null

  const XtX = [[0,0,0],[0,0,0],[0,0,0]], Xty = [0,0,0]
  for (const c of data) {
    const tier = c.tier ?? 4
    const base = BASE_LPA[tier] * caskTypeMultiplier(c.type)
    if (base <= 0) continue
    const y  = Math.log(c.lpaPer / base)
    const la = Math.log(Math.max(c.age, 1))
    const x  = [1, la, la * la]
    for (let r = 0; r < 3; r++) {
      Xty[r] += x[r] * y
      for (let cc = 0; cc < 3; cc++) XtX[r][cc] += x[r] * x[cc]
    }
  }
  const beta = _solve3x3(XtX, Xty)
  if (!beta) return null

  // Normalise so fitted value = 1.0 at age = 10
  const la10  = Math.log(10)
  const at10  = beta[0] + beta[1] * la10 + beta[2] * la10 * la10
  return [beta[0] - at10, beta[1], beta[2]]   // shifted intercept
}

export const AGE_OLS_COEF = _fitOLSAge()   // null if fit fails

export function ageMultiplier(age) {
  if (!AGE_OLS_COEF) return ageMultiplierStructural(age)
  const la = Math.log(Math.max(age, 0.5))
  return Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1] * la + AGE_OLS_COEF[2] * la * la)
}

// ─────────────────────────────────────────────────────────────
// Copula marginal CDFs
// ─────────────────────────────────────────────────────────────

function ageCDF(age) {
  // Log-normal CDF: median 14yr, σ = 0.60 (fitted to dataset distribution)
  return normalCDF((Math.log(Math.max(age, 0.5)) - Math.log(14)) / 0.60)
}

function tierCDF(tier) {
  // Quantiles of tier in the full distillery quality distribution
  // (approx: T1 ≈ top 5%, T2 ≈ top 28%, T3 ≈ top 58%, T4 = bottom 42%)
  return [0.95, 0.72, 0.42, 0.15][tier - 1]
}

// ─────────────────────────────────────────────────────────────
// MLE estimation of ρ
//
// Maximises the t-copula log-likelihood over the observed (age, tier) pairs
// in the sold comparables dataset:
//   ρ̂ = argmax Σᵢ log c_{ρ,ν}(F̂_age(aᵢ), F̂_tier(tᵢ))
//
// Note: this estimates the dependence in the JOINT DISTRIBUTION OF (age, tier)
// among auction lots — capturing how often old casks appear from elite
// distilleries more than chance would predict. It is not the dependence in
// the price-formation process directly (which would require residual analysis
// after removing other price drivers). Both estimates are theoretically
// meaningful; this one is tractable from the available data.
// ─────────────────────────────────────────────────────────────

export const COPULA_NU = 4  // fixed; gives λ_U ≈ 0.40 at ρ=0.7 — empirically appropriate

// Pre-compute t-quantile pairs once (tQuantile is expensive; these don't depend on ρ)
const _mlePoints = ALL_COMPARABLES
  .filter(c => c.sold && c.lpaPer > 0 && !c.lpaEstimated && c.age >= 1)
  .map(c => {
    const tier = c.tier ?? 4
    return {
      x: tQuantile(ageCDF(c.age),   COPULA_NU),
      y: tQuantile(tierCDF(tier), COPULA_NU),
    }
  })

function _copulaLL(rho) {
  if (Math.abs(rho) >= 0.9999) return -Infinity
  const rho2 = rho * rho
  const halfLogDet = -0.5 * Math.log(1 - rho2)
  const nuPlus2Over2 = (COPULA_NU + 2) / 2
  const nuPlus1Over2 = (COPULA_NU + 1) / 2
  let ll = _mlePoints.length * halfLogDet
  for (const { x, y } of _mlePoints) {
    const Q  = (x * x - 2 * rho * x * y + y * y) / (1 - rho2)
    ll -= nuPlus2Over2 * Math.log(1 + Q / COPULA_NU)
    ll += nuPlus1Over2 * (Math.log(1 + x * x / COPULA_NU) + Math.log(1 + y * y / COPULA_NU))
  }
  return ll
}

function _goldenMax(f, lo, hi, tol = 1e-6) {
  const phi = (Math.sqrt(5) + 1) / 2
  let a = lo, b = hi
  let c = b - (b - a) / phi, d = a + (b - a) / phi
  while (Math.abs(b - a) > tol) {
    if (f(c) > f(d)) { b = d } else { a = c }
    c = b - (b - a) / phi; d = a + (b - a) / phi
  }
  return (a + b) / 2
}

export const COPULA_RHO = _goldenMax(_copulaLL, 0.01, 0.99)

// Upper tail dependence: λ_U = 2·t_{ν+1}(-√((ν+1)(1−ρ)/(1+ρ)))
// Evaluated at the MLE ρ; requires t-CDF on ν+1 = 5 d.f.
export const COPULA_LAMBDA_U = (() => {
  const x = -Math.sqrt((COPULA_NU + 1) * (1 - COPULA_RHO) / (1 + COPULA_RHO))
  return Math.round(2 * tCDF(x, COPULA_NU + 1) * 100) / 100
})()

// ─────────────────────────────────────────────────────────────
// Beauty contest premium
// ─────────────────────────────────────────────────────────────

export function beautyContestPremium(distillery, tier) {
  const score = BEAUTY_SCORES[distillery?.toLowerCase()] ??
    (tier === 1 ? 0.92 : tier === 2 ? 0.70 : tier === 3 ? 0.45 : 0.26)
  const retention = STRESS_RETENTION[tier]
  const compression = 1 - MARKET_STRESS * (1 - retention)
  return score * 0.85 * compression
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

// Kept as named export (used in CaskValuator display); now uses t-copula +
// tier-conditional dampener (STRESS_RETENTION) instead of the global 0.32 scalar.
export function gaussianCopulaFactor(age, tier) {
  const raw = tCopulaDensityRatio(ageCDF(age), tierCDF(tier), COPULA_RHO, COPULA_NU)
  return 1 + (raw - 1) * STRESS_RETENTION[tier]
}

// ─────────────────────────────────────────────────────────────
// LPA estimation (angel's share)
// ─────────────────────────────────────────────────────────────

const OLA_BY_TYPE = [
  { keys: ['sherry butt', 'oloroso butt', 'px butt'], ola: 490 },
  { keys: ['butt'],                                    ola: 490 },
  { keys: ['puncheon'],                                ola: 450 },
  { keys: ['sherry hogshead'],                         ola: 225 },
  { keys: ['hogshead', 'barrique'],                    ola: 225 },
  { keys: ['barrel'],                                  ola: 190 },
  { keys: ['quarter cask'],                            ola: 50  },
  { keys: ['octave'],                                  ola: 50  },
]

export function estimateLPA(caskType, fillYear, currentYear = 2026) {
  const s = String(caskType).toLowerCase()
  let ola = 225
  for (const { keys, ola: val } of OLA_BY_TYPE) {
    if (keys.some(k => s.includes(k))) { ola = val; break }
  }
  const age = Math.max(0, currentYear - parseInt(fillYear))
  const rla = Math.round(ola * Math.pow(0.985, age))
  return { ola, rla, estimated: true }
}

// ─────────────────────────────────────────────────────────────
// Cask category (for affinity scoring)
// ─────────────────────────────────────────────────────────────

function caskCategory(caskType) {
  const s = String(caskType).toLowerCase()
  if (s.includes('sherry') || s.includes('oloroso') || s.includes('px')) return 'sherry'
  if (s.includes('port') || s.includes('wine') || s.includes('pinot') || s.includes('mouton')) return 'wine'
  if (s.includes('bourbon') || s.includes('barrel') || s.includes('fresh')) return 'bourbon'
  return 'other'
}

// ─────────────────────────────────────────────────────────────
// Main valuation function
// ─────────────────────────────────────────────────────────────

export function valueCask({ distillery, fillYear, caskType = 'Hogshead', lpa = null }) {
  const age = Math.max(0, 2026 - parseInt(fillYear))

  let lpaEstimated = false
  if (!lpa) {
    const est = estimateLPA(caskType, fillYear)
    lpa = est.rla
    lpaEstimated = true
  }
  const tier        = getTier(distillery)
  const beautyScore = getBeautyScore(distillery, tier)

  // ── 1. Fundamental £/LPA ──────────────────────────────────
  const baseLpa        = BASE_LPA[tier]
  const ageMult        = ageMultiplier(age)       // OLS-fitted current-market curve
  const caskMult       = caskTypeMultiplier(caskType)
  const fundamentalLpa = baseLpa * ageMult * caskMult

  // ── 2. Student-t copula (age × reputation joint tail) ─────
  const rawCopula  = tCopulaDensityRatio(ageCDF(age), tierCDF(tier), COPULA_RHO, COPULA_NU)
  // Tier-conditional dampener: the copula amplification is retained in
  // proportion to STRESS_RETENTION[tier], replacing the previous global 0.32.
  // Justification: the copula factor represents the same joint-tail speculative
  // premium as the beauty contest; both should compress identically under stress.
  const copulaFactor = 1 + (rawCopula - 1) * STRESS_RETENTION[tier]
  const bcPrem       = beautyContestPremium(distillery, tier)
  const formulaLpa   = fundamentalLpa * copulaFactor * (1 + bcPrem)

  // ── 3. Data anchor blend ──────────────────────────────────
  const { anchorLpa, anchorN, dataWeight, anchorSpread } = computeDataAnchor(distillery, tier, age, caskType)
  const achievableLpa = (anchorLpa != null && dataWeight > 0)
    ? formulaLpa * (1 - dataWeight) + anchorLpa * dataWeight
    : formulaLpa

  // ── 4. Recovery scenario ──────────────────────────────────
  const recoveryLpa = achievableLpa * RECOVERY_MULT[tier]

  // ── 5. Seller expectation ─────────────────────────────────
  const decayRate = MONTHLY_DECAY[tier]
  const sellerExpLpa = recoveryLpa * Math.pow(1 - decayRate, MONTHS_SINCE_PEAK)
  const gapPct = sellerExpLpa > achievableLpa
    ? Math.round((sellerExpLpa - achievableLpa) / sellerExpLpa * 100)
    : 0
  const capitulationMonths = sellerExpLpa > achievableLpa
    ? Math.ceil(Math.log(achievableLpa / sellerExpLpa) / Math.log(1 - decayRate))
    : 0

  // ── 6. Log-normal confidence intervals ────────────────────
  // If log(P) ~ N(μ_L, σ_L²) then E[P] = exp(μ_L + σ_L²/2) = achievableLpa
  // and CoV = √(exp(σ_L²)−1), so σ_L = √(log(1+CoV²)).
  // P_q = exp(μ_L + Φ⁻¹(q)·σ_L); Φ⁻¹(0.20) = −0.842, Φ⁻¹(0.80) = +0.842.
  //
  // The uncertainty parameter is treated as the CoV of the price distribution.
  // Data-driven: CoV from actual spread of age/cask-normalised comparables
  // (min 5 required). Formula fallback: tier/age-based structural estimate.
  const hasDirectData = Object.keys(BEAUTY_SCORES).includes(
    String(distillery).toLowerCase().trim()
  )
  const formulaUncertainty = (hasDirectData ? 0.32 : 0.52)
    + (age > 30 ? 0.18 : age < 5 ? 0.14 : 0)
  const coV = (anchorN >= 5 && anchorSpread > 0)
    ? Math.max(0.18, Math.min(0.65, anchorSpread))
    : formulaUncertainty

  const sigmaL = Math.sqrt(Math.log(1 + coV * coV))
  const muL    = Math.log(Math.max(achievableLpa, 0.01)) - sigmaL * sigmaL / 2
  const p20Lpa = Math.exp(muL - 0.842 * sigmaL)
  const p80Lpa = Math.exp(muL + 0.842 * sigmaL)

  // ── 7. Totals ─────────────────────────────────────────────
  const round = (v, nearest = 100) => Math.round(v / nearest) * nearest
  const total         = round(achievableLpa * lpa)
  const totalP20      = round(p20Lpa * lpa)
  const totalP80      = round(p80Lpa * lpa)
  const totalRecovery = round(recoveryLpa * lpa)

  const TIER_LABELS = { 1: 'Elite', 2: 'Premium', 3: 'Quality', 4: 'Commodity' }
  const LIQUIDITY   = { 1: 'Limited', 2: 'Very Low', 3: 'Thin', 4: 'Near Zero' }

  return {
    achievableLpa:  Math.round(achievableLpa * 10) / 10,
    p20Lpa:         Math.round(p20Lpa * 10) / 10,
    p80Lpa:         Math.round(p80Lpa * 10) / 10,
    recoveryLpa:    Math.round(recoveryLpa * 10) / 10,
    fundamentalLpa: Math.round(fundamentalLpa * 10) / 10,
    total, totalP20, totalP80, totalRecovery,
    sellerExpLpa:       Math.round(sellerExpLpa * 10) / 10,
    gapPct, capitulationMonths, decayRate,
    age, tier,
    tierLabel:      TIER_LABELS[tier],
    beautyScore,
    bcPremiumPct:   Math.round(bcPrem * 100),
    copulaFactor:   Math.round(copulaFactor * 100) / 100,
    liquidityLabel: LIQUIDITY[tier],
    ageMult:        Math.round(ageMult * 100) / 100,
    caskMult:       Math.round(caskMult * 100) / 100,
    recoveryMult:   RECOVERY_MULT[tier],
    anchorLpa:      anchorLpa != null ? Math.round(anchorLpa * 10) / 10 : null,
    anchorN,
    dataWeight:     Math.round(dataWeight * 100),
    confidence:     hasDirectData ? 'Moderate' : 'Low',
    uncertainty:    Math.round(coV * 100),
    lpa,
    lpaEstimated,
  }
}

// ─────────────────────────────────────────────────────────────
// findComparables
// ─────────────────────────────────────────────────────────────

export function findComparables(distillery, tier, age, caskType = 'Hogshead') {
  const key       = String(distillery).toLowerCase().trim()
  const targetCat = caskCategory(caskType)

  const scored = ALL_COMPARABLES
    .filter(c => c.lpaPer != null && c.total > 0)
    .map(c => {
      const cTier = c.tier ?? getTier(c.distillery)
      let score = 0
      if (c.distillery.toLowerCase().trim() === key)     score += 40
      else if (c.distillery.toLowerCase().includes(key) ||
               key.includes(c.distillery.toLowerCase())) score += 20
      if (cTier === tier)                                 score += 20
      if (caskCategory(c.type) === targetCat)            score += 8
      score -= Math.min(20, Math.abs((c.age ?? 0) - age) * 2)
      score -= Math.max(0, (2026 - (c.auctionYear ?? 2026))) * 2
      if (!c.sold)        score -= 8
      if (c.lpaEstimated) score -= 10
      return { ...c, tier: cTier, _score: score }
    })
    .filter(c => c._score > 0)
    .sort((a, b) => b._score - a._score)

  const seen = new Set(), results = []
  for (const c of scored) {
    const dk = `${c.distillery}|${c.age}|${c.source}`
    if (!seen.has(dk)) { seen.add(dk); results.push(c) }
    if (results.length >= 4) break
  }
  return results
}

// ─────────────────────────────────────────────────────────────
// computeDataAnchor
// ─────────────────────────────────────────────────────────────

function computeDataAnchor(distillery, tier, age, caskType) {
  const key          = String(distillery).toLowerCase().trim()
  const targetCat    = caskCategory(caskType)
  const targetAgeMult  = ageMultiplier(Math.max(1, age))
  const targetCaskMult = caskTypeMultiplier(caskType)

  const scored = ALL_COMPARABLES
    .filter(c => c.sold && c.lpaPer != null && c.lpaPer > 0 && !c.lpaEstimated)
    .map(c => {
      const cTier = c.tier ?? getTier(c.distillery)
      let score = 0
      if (c.distillery.toLowerCase().trim() === key)     score += 40
      else if (c.distillery.toLowerCase().includes(key) ||
               key.includes(c.distillery.toLowerCase())) score += 20
      if (cTier === tier)                                 score += 20
      if (caskCategory(c.type) === targetCat)            score += 8
      score -= Math.min(20, Math.abs((c.age ?? 0) - age) * 2)
      score -= Math.max(0, (2026 - (c.auctionYear ?? 2026))) * 2
      return { ...c, _score: score }
    })
    .filter(c => c._score >= 10)
    .sort((a, b) => b._score - a._score)
    .slice(0, 12)

  if (scored.length === 0) return { anchorLpa: null, anchorN: 0, dataWeight: 0, anchorSpread: 0 }

  const normalised = scored.map(c => {
    const compAgeMult  = ageMultiplier(Math.max(1, c.age ?? 1))
    const compCaskMult = caskTypeMultiplier(c.type)
    const ageRatio  = Math.min(5, Math.max(0.2, targetAgeMult / compAgeMult))
    const caskRatio = compCaskMult > 0 ? targetCaskMult / compCaskMult : 1
    return { score: c._score, v: c.lpaPer * ageRatio * caskRatio }
  })

  let clean = normalised
  if (normalised.length >= 5) {
    const vals = normalised.map(x => x.v).sort((a, b) => a - b)
    const q1 = vals[Math.floor(vals.length * 0.25)]
    const q3 = vals[Math.floor(vals.length * 0.75)]
    const iqr = q3 - q1
    const filtered = normalised.filter(x => x.v >= q1 - 1.5*iqr && x.v <= q3 + 1.5*iqr)
    if (filtered.length >= 2) clean = filtered
  }

  const totalWeight = clean.reduce((s, x) => s + x.score, 0)
  const anchorLpa   = clean.reduce((s, x) => s + x.v * x.score, 0) / totalWeight
  const mean        = clean.reduce((s, x) => s + x.v, 0) / clean.length
  const variance    = clean.reduce((s, x) => s + (x.v - mean) ** 2, 0) / clean.length
  const anchorSpread = mean > 0 ? Math.sqrt(variance) / mean : 0

  const n          = clean.length
  const dataWeight = n >= 6 ? 0.65 : n >= 3 ? 0.45 : 0.25

  return { anchorLpa, anchorN: n, dataWeight, anchorSpread }
}

// ─────────────────────────────────────────────────────────────
// Model validation — 5-fold CV (formula) + LOO-CV (anchor)
//
// Addresses the holdout-sample critique: BASE_LPA is re-estimated from
// training folds only, giving genuine out-of-sample formula error.
// LOO-CV for the anchor excludes each lot when computing its own anchor.
//
// Limitation: model architecture (ageMultiplier curve, copula structure,
// blend weights) is fixed across folds. A full Bayesian or GP treatment
// would quantify uncertainty in these structural choices. The reported
// metrics bound the formula + anchor contribution only.
// ─────────────────────────────────────────────────────────────

export const MODEL_VALIDATION = (function () {
  const eligible = ALL_COMPARABLES.filter(c =>
    c.sold && c.lpaPer > 0 && !c.lpaEstimated && c.age >= 1 && c.age <= 35
  )
  if (eligible.length < 20) return null

  // Deterministic shuffle (LCG, seed = 42)
  const shuffled = [...eligible]
  let seed = 42
  const lcg = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(lcg() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // ── 5-fold CV for formula ────────────────────────────────
  const K = 5, foldSize = Math.floor(shuffled.length / K)
  const formErr = []

  for (let k = 0; k < K; k++) {
    const ts = k * foldSize, te = k === K - 1 ? shuffled.length : ts + foldSize
    const test  = shuffled.slice(ts, te)
    const train = [...shuffled.slice(0, ts), ...shuffled.slice(te)]

    const foldBase = {}
    for (let t = 1; t <= 4; t++) {
      const rows = train.filter(c => (c.tier ?? 4) === t && c.age >= 5 && c.age <= 30)
      if (rows.length < 3) { foldBase[t] = BASE_LPA[t]; continue }
      const vals = rows.map(c => c.lpaPer / ageMultiplier(Math.max(1, c.age))).sort((a, b) => a - b)
      foldBase[t] = vals[Math.floor(vals.length / 2)]
    }

    for (const c of test) {
      const tier   = c.tier ?? 4
      const raw    = tCopulaDensityRatio(ageCDF(c.age), tierCDF(tier), COPULA_RHO, COPULA_NU)
      const cf     = 1 + (raw - 1) * STRESS_RETENTION[tier]
      const bc     = beautyContestPremium(c.distillery, tier)
      const pred   = foldBase[tier] * ageMultiplier(c.age) * caskTypeMultiplier(c.type) * cf * (1 + bc)
      formErr.push(c.lpaPer - pred)
    }
  }

  const fMAE    = formErr.reduce((s, e) => s + Math.abs(e), 0) / formErr.length
  const fRMSE   = Math.sqrt(formErr.reduce((s, e) => s + e * e, 0) / formErr.length)
  const fBias   = formErr.reduce((s, e) => s + e, 0) / formErr.length
  const sortedAbs = formErr.map(Math.abs).sort((a, b) => a - b)
  const fMedAE  = sortedAbs[Math.floor(sortedAbs.length / 2)]

  // ── LOO-CV for anchor ────────────────────────────────────
  const anchorErr = []
  for (const lo of eligible) {
    const key       = String(lo.distillery).toLowerCase().trim()
    const tier      = lo.tier ?? 4
    const targetAM  = ageMultiplier(Math.max(1, lo.age))
    const targetCM  = caskTypeMultiplier(lo.type)
    const targetCat = caskCategory(lo.type)

    const cands = eligible
      .filter(c => c !== lo)
      .map(c => {
        const cTier = c.tier ?? 4
        let sc = 0
        if (c.distillery.toLowerCase().trim() === key)       sc += 40
        else if (c.distillery.toLowerCase().includes(key) ||
                 key.includes(c.distillery.toLowerCase()))   sc += 20
        if (cTier === tier)                                  sc += 20
        if (caskCategory(c.type) === targetCat)             sc += 8
        sc -= Math.min(20, Math.abs((c.age ?? 0) - lo.age) * 2)
        sc -= Math.max(0, (2026 - (c.auctionYear ?? 2026))) * 2
        return { ...c, _score: sc }
      })
      .filter(c => c._score >= 10)
      .sort((a, b) => b._score - a._score)
      .slice(0, 12)

    if (cands.length === 0) continue

    const norm = cands.map(c => {
      const ar = Math.min(5, Math.max(0.2, targetAM / ageMultiplier(Math.max(1, c.age ?? 1))))
      const cr = caskTypeMultiplier(c.type) > 0 ? targetCM / caskTypeMultiplier(c.type) : 1
      return { score: c._score, v: c.lpaPer * ar * cr }
    })

    let clean = norm
    if (norm.length >= 5) {
      const sv = norm.map(x => x.v).sort((a, b) => a - b)
      const q1 = sv[Math.floor(sv.length * 0.25)], q3 = sv[Math.floor(sv.length * 0.75)]
      const iqr = q3 - q1
      const f = norm.filter(x => x.v >= q1 - 1.5 * iqr && x.v <= q3 + 1.5 * iqr)
      if (f.length >= 2) clean = f
    }

    const tw     = clean.reduce((s, x) => s + x.score, 0)
    const anchor = clean.reduce((s, x) => s + x.v * x.score, 0) / tw
    anchorErr.push(lo.lpaPer - anchor)
  }

  const aMAE  = anchorErr.reduce((s, e) => s + Math.abs(e), 0) / anchorErr.length
  const aRMSE = Math.sqrt(anchorErr.reduce((s, e) => s + e * e, 0) / anchorErr.length)
  const aBias = anchorErr.reduce((s, e) => s + e, 0) / anchorErr.length
  const asMedAE = anchorErr.map(Math.abs).sort((a, b) => a - b)
  const aMedAE  = asMedAE[Math.floor(asMedAE.length / 2)]

  return {
    n: eligible.length,
    calibrationDate: '2026-11-20',
    formula: {
      mae:   Math.round(fMAE * 10) / 10,
      rmse:  Math.round(fRMSE * 10) / 10,
      medAE: Math.round(fMedAE * 10) / 10,
      bias:  Math.round(fBias * 10) / 10,
    },
    anchor: {
      mae:   Math.round(aMAE * 10) / 10,
      rmse:  Math.round(aRMSE * 10) / 10,
      medAE: Math.round(aMedAE * 10) / 10,
      bias:  Math.round(aBias * 10) / 10,
      n:     anchorErr.length,
    },
  }
})()

// ─────────────────────────────────────────────────────────────
// Known distilleries (autocomplete)
// ─────────────────────────────────────────────────────────────

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

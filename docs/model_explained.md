# The Bottle Keep — Cask Valuation Model

*All equations, constants and claims are read directly from `src/lib/caskValuation.js`.*
*Every constant is annotated as calibrated, assumed, or unsourced.*

---

## 1. Overview

The pipeline in the order the code applies it (`valueCask`, line 496):

```
achievableLpa =
  blend(
    fundamentalLpa × copulaFactor × (1 + bcPremium),   ← formula path
    anchorLpa                                            ← data path
  )
```

Where:

```
fundamentalLpa = BASE_LPA[tier] × ageMult(age) × caskMult(caskType)
copulaFactor   = 1 + (tCopulaDensity(u_age, u_tier, ρ, ν) − 1) × STRESS_RETENTION[tier]
bcPremium      = beautyScore × 0.85 × (1 − MARKET_STRESS × (1 − STRESS_RETENTION[tier]))
```

Then recovery and interval:

```
recoveryLpa    = achievableLpa × RECOVERY_MULT[tier]
sellerExpLpa   = recoveryLpa × (1 − MONTHLY_DECAY[tier])^MONTHS_SINCE_PEAK
p20Lpa, p80Lpa = log-normal CI on achievableLpa
```

No Monte Carlo. Every step is analytic.

---

## 2. Inputs and units

| Input | Type | Required | Notes |
|---|---|---|---|
| `distillery` | string | yes | matched case-insensitively against `TIER_MAP` |
| `fillYear` | integer (year) | yes | age = 2026 − fillYear |
| `caskType` | string | no | default `'Hogshead'`; matched by substring |
| `lpa` | number (litres of pure alcohol) | **now required** | LPA validation added in `CaskValuator.jsx` |

`lpa` was formerly optional with a cask-type lookup fallback (`DEFAULT_LPA`, line 44); the UI now blocks submission without it. The model still accepts `null` and falls back internally (line 500).

---

## 3. Ask-side value

### Tier (line 7)

Distillery names are lowercased and matched by exact string or substring against four tier lists. Any distillery not found defaults to Tier 4.

| Tier | Label | Members (examples) | `BASE_LPA` £/LPA |
|---|---|---|---|
| 1 | Elite | Macallan, Springbank | 100 |
| 2 | Premium | Ardbeg, Bruichladdich, Ben Nevis | 42 |
| 3 | Quality | Craigellachie, Linkwood, Macduff | 24 |
| 4 | Commodity | Fettercairn, unlisted | 19 |

`BASE_LPA` (line 53) is calibrated from median age-normalised sold GWA lots 2023+. The comment notes Tier 4 was corrected from £8 to £19 after removing a 50%-achievability discount from RNM bids.

### Age multiplier — OLS log-quadratic (lines 303–338)

Fitted at model load on comparables where `sold=true`, `lpaPer > 0`, `auctionYear ≥ 2022`, `age 2–35`. As of the Nov 2026 calibration, n=287 price-bearing sold lots are eligible; the actual OLS pool may be smaller after age filters.

```
log(ageMult) = β₀ + β₁·log(age) + β₂·log(age)²
```

Normalised so `ageMult(10) = 1.0`. Current fitted coefficients (line 332):

```
β₀ = −0.4254   β₁ = −0.5991   β₂ = +0.3404
```

*Plain English: at 10 years the multiplier is 1× by construction. The quadratic shape means the multiplier dips to its minimum around age 2–3, rises through the teen years, and accelerates sharply at 20+. At 26 years it is 3.44×.*

The parabola is wide enough that β₁ < 0 and β₂ > 0 together still produce a minimum near age 2.4 (solve β₁ + 2β₂·ln(age) = 0). This is data-driven and plausible (young casks have poor liquidity), though it was not an explicit design choice.

The structural piecewise curve (`ageMultiplierStructural`, line 232) is kept only as a reference for the recovery scenario description; it does **not** enter `achievableLpa`.

### Cask-type multiplier (lines 246–265)

Applied as multiplicative factors (all **unsourced**):

| Feature | Match rule | Factor |
|---|---|---|
| Butt | `includes('butt')` | 0.88 |
| Puncheon | `includes('puncheon')` | 0.91 |
| Octave | `includes('octave')` | 1.32 |
| Quarter cask | `includes('quarter')` | 1.22 |
| Barrique | `includes('barrique')` | 1.06 |
| Barrel | `includes('barrel')` | 1.08 |
| Hogshead / default | none of above | 1.00 |
| 1st fill | `includes('1st fill')` | × 1.10 |
| Refill | `includes('refill')` | × 0.91 |
| Oloroso or PX sherry | | × 1.18 |
| Sherry (other) | | × 1.14 |
| Pinot / Mouton | | × 1.13 |
| Port | | × 1.10 |
| Wine cask | | × 1.07 |
| Virgin oak | | × 1.05 |

Final value clamped to [0.70, 1.65] (line 264).

### fundamentalLpa

```
fundamentalLpa = BASE_LPA[tier] × ageMult(age) × caskMult(caskType)
```
(line 512–513)

---

## 4. Beauty-contest premium

Formula (lines 422–428):

```
compression = 1 − MARKET_STRESS × (1 − STRESS_RETENTION[tier])
bcPremium   = beautyScore × 0.85 × compression
```

`beautyScore` comes from a hardcoded lookup (lines 36–47). Distilleries not in the table use tier-default scores: Tier 1 = 0.92, Tier 2 = 0.70, Tier 3 = 0.45, Tier 4 = 0.26. These defaults and all individual scores are **unsourced**.

The `0.85` scalar is **unsourced** — no comment explains its origin.

`STRESS_RETENTION` (line 60) is **unsourced**: {1: 0.52, 2: 0.34, 3: 0.20, 4: 0.10}.

The premium is added to `formulaLpa` before the data anchor blend:

```
formulaLpa = fundamentalLpa × copulaFactor × (1 + bcPremium)
```
(line 522)

---

## 5. Copula

The copula links **age** and **distillery tier** — not price to anything else. It is used to detect whether old casks from elite distilleries occur together more often than chance, and to amplify valuations when they do.

**Type:** Student-t copula with ν = 4 (fixed, line 370) and ρ estimated by MLE.

**ρ:** 0.291 (MLE from `_goldenMax`, line 409 — computed at module load from sold comparables). *The user's stated belief of 0.72 does not match the code. The actual MLE result is 0.291, giving upper tail dependence λ_U = 0.16 (line 414).*

**Marginal CDFs:**

- Age: log-normal, `ageCDF(age) = Φ((ln(age) − ln(14)) / 0.60)` (line 345). Median 14yr, σ = 0.60. **Unsourced**.
- Tier: fixed quantiles (line 350) — Tier 1 = 0.95, Tier 2 = 0.72, Tier 3 = 0.42, Tier 4 = 0.15. **Unsourced**.

**Output:** Fully analytic — the copula density ratio `c(u, v)` is evaluated in closed form via regularised incomplete beta functions. No Monte Carlo draws.

**How it enters the model:**

```
rawCopula    = tCopulaDensityRatio(ageCDF(age), tierCDF(tier), ρ=0.291, ν=4)
copulaFactor = 1 + (rawCopula − 1) × STRESS_RETENTION[tier]
```

(lines 515–520). The stress-retention dampener means the copula's deviation from 1 is kept only in proportion to STRESS_RETENTION[tier] (10–52% by tier). For a Tier 3 distillery at age 26, `rawCopula ≈ 0.90` and `copulaFactor ≈ 0.97`.

---

## 6. Bid-ask gap

The gap between what a seller expects and what a buyer will pay (lines 534–541):

```
sellerExpLpa      = recoveryLpa × (1 − MONTHLY_DECAY[tier])^MONTHS_SINCE_PEAK
gapPct            = round((sellerExpLpa − achievableLpa) / sellerExpLpa × 100)
capitulationMonths = ceil(log(achievableLpa / sellerExpLpa) / log(1 − MONTHLY_DECAY[tier]))
```

`MONTHLY_DECAY` (line 61, **unsourced**): {1: 0.008, 2: 0.015, 3: 0.020, 4: 0.030}.

`MONTHS_SINCE_PEAK = 34` (line 62) = Jan 2024 → Nov 2026. Hardcoded; must be updated manually.

The gap at Jan 2024 (t=0) equalled `1 − 1/RECOVERY_MULT[tier]`. After 34 months of seller-side decay it narrows to roughly 27–38% across tiers. *The user's stated belief of "30–36%" is broadly correct for mid-range tiers at the current date.*

---

## 7. MARKET_STRESS

```
MARKET_STRESS = 0.979
```
(line 59)

0.979 = 1 − 0.021. The GWA 2026 clearance rate is stated elsewhere in the codebase as 2.1%, so MARKET_STRESS appears to equal one minus the clearance rate. The code comment says "Current GWA market stress" but provides no derivation. **Partially calibrated** (linked to clearance rate), but the formula `1 − clearance_rate` is not documented as intentional.

It enters only through `compression` in `beautyContestPremium`:

```
compression = 1 − 0.979 × (1 − STRESS_RETENTION[tier])
```

Effect by tier at current values:

| Tier | STRESS_RETENTION | compression | BC premium retained |
|---|---|---|---|
| 1 | 0.52 | 0.530 | 53% |
| 2 | 0.34 | 0.354 | 35% |
| 3 | 0.20 | 0.217 | 22% |
| 4 | 0.10 | 0.119 | 12% |

MARKET_STRESS affects **only** the beauty-contest premium — not BASE_LPA, not ageMult, not the interval width.

---

## 8. Confidence interval

Log-normal interval centred on `achievableLpa` (lines 544–563).

The CoV (coefficient of variation) drives the width:

```python
# Data path (anchorN ≥ 5)
coV = clamp(anchorSpread, 0.18, 0.65)

# Formula fallback (anchorN < 5)
coV = (0.32 if distillery in BEAUTY_SCORES else 0.52) + age_adjustment
     where age_adjustment = +0.18 if age > 30, +0.14 if age < 5, else 0
```

Then (lines 560–563):

```
sigmaL = √(ln(1 + coV²))
muL    = ln(achievableLpa) − sigmaL² / 2
p20    = exp(muL − 0.842 × sigmaL)
p80    = exp(muL + 0.842 × sigmaL)
```

*The interval is symmetric in log terms (±0.842 σ_L), not in £ terms. p80/p20 ≈ 1.77 at CoV = 35%. The user's belief of "±32%" refers to the formula-fallback CoV for known distilleries, not to the interval being symmetric in percentage.*

The 0.32 and 0.52 CoV fallbacks are **unsourced**. When anchor data is available (anchorN ≥ 5), coV is data-driven from the spread of normalised comparables.

---

## 9. Recovery scenario and seller expectation

```
recoveryLpa    = achievableLpa × RECOVERY_MULT[tier]
sellerExpLpa   = recoveryLpa × (1 − MONTHLY_DECAY[tier])^34
```

(lines 531–535)

`RECOVERY_MULT` (line 56, **unsourced**): {1: 1.8, 2: 2.6, 3: 3.2, 4: 4.0}. Interpreted as the ratio of a hypothetical full-market-recovery price to the current achievable price. No calibration comment.

The recovery scenario is displayed to the user as context ("what this cask would fetch if the market returned to 2023 clearance rates") but does **not** affect `achievableLpa` or the interval.

---

## 10. Worked example

**Macduff 2000, Refill Barrel, 180 LPA.** All numbers from running `valueCask()`.

| Step | Formula | Result |
|---|---|---|
| Tier | TIER_MAP lookup: 'macduff' → Tier 3 | Tier 3 "Quality" |
| Age | 2026 − 2000 | 26 yr |
| BASE_LPA | BASE_LPA[3] | £24/LPA |
| ageMult | exp(−0.4254 + (−0.5991)×ln26 + 0.3404×ln26²) | **3.44** |
| caskMult | barrel(1.08) × refill(0.91) | **0.98** |
| fundamentalLpa | 24 × 3.44 × 0.98 | **£81.2/LPA** |
| beautyScore | Tier 3 default (Macduff not in BEAUTY_SCORES) | 0.45 |
| compression | 1 − 0.979 × (1−0.20) | 0.217 |
| bcPremium | 0.45 × 0.85 × 0.217 | 0.083 (8%) |
| ageCDF(26) | Φ((ln26−ln14)/0.60) | 0.724 |
| tierCDF(3) | 0.42 (fixed table) | 0.42 |
| rawCopula | tCopulaDensity(0.724, 0.42, ρ=0.291, ν=4) | ≈ 0.90 |
| copulaFactor | 1 + (0.90−1) × 0.20 | **0.97** |
| formulaLpa | 81.2 × 0.97 × 1.08 | **£85.1/LPA** |
| anchorLpa | Weighted avg of 8 comparables | £81.8/LPA |
| dataWeight | n=8 ≥ 6 → 65% | 65% |
| achievableLpa | 85.1×0.35 + 81.8×0.65 | **£83.2/LPA** |
| total | 83.2 × 180 (rounded to £100) | **£15,000** |
| CoV | anchorSpread from 8 comparables | 35% |
| sigmaL | √(ln(1+0.35²)) | 0.340 |
| p20Lpa | exp(muL − 0.842×0.340) | **£58.9/LPA** |
| p80Lpa | exp(muL + 0.842×0.340) | **£104.5/LPA** |
| totalP20 / totalP80 | | £10,600 / £18,800 |
| recoveryLpa | 83.2 × 3.2 | **£266.1/LPA** |
| sellerExpLpa | 266.1 × (1−0.02)^34 | **£133.9/LPA** |
| gapPct | (133.9−83.2)/133.9 | **38%** |
| capitulationMonths | | **24 mo** |

---

## 11. Calibration

`scripts/calibrate.js` reads `data/ayc_lots.csv` (21 AYC lots; 20 with prices), calls `valueCask()` for each, and computes:

```
pctErr    = (achievableLpa − pricePerLpa) / pricePerLpa × 100
inRange   = pricePerLpa ∈ [p20Lpa, p80Lpa]
med|err|  = median of |pctErr|
bias      = median of pctErr   (positive = model overvalues)
```

**Latest results** (`scripts/calibration_output.csv`, n=20):

| Group | n | Median \|err\| | Bias | In-range |
|---|---|---|---|---|
| All lots | 20 | 33.9% | +20.6% | 12/20 (60%) |
| RLA only | 17 | 42.0% | +29.2% | 9/17 (53%) |
| OLA only | 3 | 17.4% | −5.8% | 3/3 (100%) |
| With estimate_low | 13 | 42.0% | +38.5% | 6/13 (46%) |

Median price / auction-house estimate_low: **0.68** — observed bids were 32% below the auction house's own floor estimate.

Internal model validation (5-fold CV on 268 eligible comparables, `MODEL_VALIDATION`, line 712):

| Component | MAE £/LPA | MedAE £/LPA | Bias £/LPA |
|---|---|---|---|
| Formula path (5-fold CV) | 36.5 | 14.7 | +6.7 |
| Anchor path (LOO-CV) | 35.6 | 12.2 | +14.9 |

---

## Issues found

### a) Double-counting

**Verdict: unclear, but likely not double-counting in the strict sense.**

MARKET_STRESS (0.979) only compresses the beauty-contest *premium* — it does not reduce BASE_LPA or ageMult. BASE_LPA was recalibrated in May 2026 from actual sold prices (line 49 comment), so it already reflects the depressed market. MARKET_STRESS then further reduces the incremental premium for brand reputation. These operate on different components (base vs. premium) so are not applying the same discount twice.

However: RECOVERY_MULT (the ratio of "full recovery" to "current achievable") is unsourced and may implicitly assume a level of market recovery already embedded in BASE_LPA. If BASE_LPA was calibrated on 2026 data and RECOVERY_MULT assumes sellers anchor to 2023 peaks, the gap between them may exaggerate how much recovery is possible. This is a **coherence risk**, not a classic double-count.

The new AYC evidence (0.68 price-to-low-estimate ratio, +20% median model bias) suggests the model **under-corrects** for market stress, not over-corrects.

### b) LPA elasticity

**The model is strictly linear in LPA — total value doubles when LPA doubles; £/LPA is identical for all sizes.**

Verified by running 100 LPA vs 200 LPA for Macduff 2000 Refill Barrel: both return `achievableLpa = £83.2/LPA`. The AYC log-log slope of ≈ 0.02 (n=20) empirically confirms near-zero elasticity, so the linear assumption is consistent with the available data. No quantity discount or premium is modelled.

### c) Copula effect

**The copula changes the output by approximately 1% on achievableLpa — effectively decorative at current parameter values.**

For Macduff 2000 Refill Barrel:
- `copulaFactor` with ρ = 0.291: 0.974 → `formulaLpa = £85.1/LPA`
- `copulaFactor` with ρ = 0 (independence): 1.000 → `formulaLpa = £87.7/LPA`
- Difference on `formulaLpa`: −3.0%
- Difference on `achievableLpa` (after 65% anchor dilution): **−1.1%**

The muted effect has two causes: (1) the MLE ρ = 0.291 is low (the user's stated belief of 0.72 is inconsistent with the data — the code produces 0.291, with upper tail dependence λ_U = 0.16 not ~0.40); (2) `STRESS_RETENTION[3] = 0.20` further dampens the copula deviation before it reaches the price. For elite tiers with high STRESS_RETENTION the effect would be larger but still small given ρ = 0.29.

### d) Interval derivation

**Not derived from data at the formula-fallback level; partially data-driven when anchor comparables exist.**

The fallback CoVs (0.32 for known distilleries, 0.52 for unknown) are **unsourced constants**. When `anchorN ≥ 5` the CoV comes from `anchorSpread` — the actual spread of comparable-normalised prices — which is data-driven.

Coverage on the AYC 20-lot dataset: **12/20 = 60%**. The nominal coverage target for a p20–p80 interval is 60%, so the in-range rate is consistent with the design intent. However, for RLA-only lots it drops to **53%** (9/17), and among lots with an auction-house estimate it drops to **46%** (6/13). The model overvalues systematically (bias = +29% on RLA), which shifts the interval upward and reduces lower-tail coverage.

### e) Unsourced constants and dead code

**Unsourced constants (no calibration comment in code):**
- All 32 individual `BEAUTY_SCORES` entries (lines 36–47)
- All tier-default beauty scores (0.92, 0.70, 0.45, 0.26) in `getBeautyScore` (line 443)
- The `0.85` scalar in `beautyContestPremium` (line 427)
- `RECOVERY_MULT` {1.8, 2.6, 3.2, 4.0} (line 56)
- `STRESS_RETENTION` {0.52, 0.34, 0.20, 0.10} (line 60)
- `MONTHLY_DECAY` {0.008, 0.015, 0.020, 0.030} (line 61)
- `ageCDF` parameters: median 14yr, σ=0.60 (line 345)
- `tierCDF` quantiles: 0.95, 0.72, 0.42, 0.15 (line 350)
- Interval CoV fallbacks: 0.32 and 0.52 (lines 554–555)

**Dead code / silent defaults:**
- `DEFAULT_LPA` (lines 44–56): a lookup of estimated LPA by cask type. Still present and referenced internally in `valueCask` for `lpa = null` inputs (line 500), but the UI now requires LPA so this path is never reached via the UI. Not dead in the library but invisible to users.
- `ageMultiplierStructural` (line 232): exported but not used in the valuation path. Called only in comments and by external consumers.
- `estimateLPA` (line 469): exported and used for the `null`-LPA fallback. Reachable only if the API is called without LPA.

**Hidden inputs (inputs not shown to the user):**
- `MONTHS_SINCE_PEAK = 34` (line 62): hardcoded. Affects `sellerExpLpa` and hence `gapPct` and `capitulationMonths`. Must be manually updated with each calendar month. The user sees the effect in the chart label ("Nov 2026") but cannot change it.
- `ALL_COMPARABLES`: the blend weight, anchor price, and CoV all depend on the full comparables dataset. The user has no visibility into which comparables are used or how fresh they are.
- `COPULA_RHO`: re-estimated at module load from `ALL_COMPARABLES`. Value (0.291) is not shown anywhere in the UI.

### f) Output dependence on hidden inputs

Yes. `achievableLpa` depends on `anchorLpa` and `dataWeight`, which are computed from `ALL_COMPARABLES` at runtime. The user sees the confidence label ("Low", "Moderate") and the range, but not the anchor price, the number of anchor comparables, or the data weight. The range can change materially between builds as new comparables are added.

---

## Five most important findings (by impact)

1. **+29% positive bias on RLA lots** — The model overvalues relative to observed AYC bids. The median actual bid is 32% below even the auction house's floor estimate. If the model is used to inform selling decisions, users will be systematically disappointed.

2. **ρ = 0.291, not 0.72** — The copula correlation is much lower than stated, λ_U = 0.16 (not ~0.40). Combined with the STRESS_RETENTION dampener, the copula adjusts achievableLpa by ≈ 1% — it does not meaningfully differentiate old-elite-cask premiums.

3. **Twelve unsourced constants** — RECOVERY_MULT, STRESS_RETENTION, MONTHLY_DECAY, all beauty scores, the ageCDF parameters, the 0.85 BC scalar, and the interval CoV fallbacks have no documented calibration origin. If any of them are wrong, there is no basis in the code to detect or fix them.

4. **LPA is linear; bulk discount not modelled** — A 500-LPA sherry butt is priced as exactly 2.5× a 200-LPA hogshead at the same distillery. This may be defensible, but it means the model cannot capture any size premium or discount that the actual market applies.

5. **MONTHS_SINCE_PEAK is hardcoded at 34** — If not updated monthly, `sellerExpLpa`, `gapPct`, and the convergence chart silently drift. By Nov 2027 the gap will be understated by roughly 10–15 percentage points (one full year of monthly decay), making the model appear more bullish about seller capitulation than the data warrants.

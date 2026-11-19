import { useEffect } from 'react'
import { COPULA_RHO, COPULA_NU, COPULA_LAMBDA_U, AGE_OLS_COEF, MODEL_VALIDATION } from '../lib/caskValuation'

const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

const C = {
  bg:        '#FAFAF7',
  white:     '#FFFFFF',
  dark:      '#1A1A18',
  stone:     '#B8A882',
  muted:     '#9A9080',
  ink:       '#4A4540',
  border:    '#E8E4DC',
  borderMid: '#D8D2C8',
}

// ─── layout helpers ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: SERIF, fontSize: 22, fontWeight: 400,
        color: C.dark, margin: '0 0 16px', letterSpacing: '-0.01em',
      }}>{title}</h2>
      {children}
    </section>
  )
}

function Sub({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        fontFamily: SANS, fontSize: 13, fontWeight: 500,
        color: C.ink, margin: '0 0 8px', letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>{title}</h3>
      {children}
    </div>
  )
}

function P({ children, style }) {
  return (
    <p style={{
      fontFamily: SANS, fontSize: 14, fontWeight: 300,
      color: C.ink, lineHeight: 1.8, margin: '0 0 12px',
      ...style,
    }}>{children}</p>
  )
}

function Formula({ children }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 13, color: C.dark,
      background: '#F4F0E8', border: `1px solid ${C.borderMid}`,
      borderRadius: 4, padding: '12px 16px',
      margin: '10px 0 16px', lineHeight: 1.7,
      overflowX: 'auto', whiteSpace: 'pre',
    }}>{children}</div>
  )
}

function Note({ children }) {
  return (
    <div style={{
      fontFamily: SANS, fontSize: 12, fontWeight: 300, color: C.muted,
      borderLeft: `2px solid ${C.borderMid}`, paddingLeft: 12,
      margin: '8px 0 16px', lineHeight: 1.7,
    }}>{children}</div>
  )
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '40px 0' }} />
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MethodologyModal({ onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const rho     = COPULA_RHO.toFixed(4)
  const nu      = COPULA_NU
  const lambdaU = COPULA_LAMBDA_U.toFixed(2)
  const beta = AGE_OLS_COEF
    ? AGE_OLS_COEF.map(b => b.toFixed(4))
    : ['n/a', 'n/a', 'n/a']
  const mv   = MODEL_VALIDATION

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(26,26,24,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg, borderRadius: 8,
          border: `1px solid ${C.borderMid}`,
          width: '100%', maxWidth: 760,
          padding: '48px 56px',
          position: 'relative',
        }}
      >
        {/* close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 24,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: MONO, fontSize: 18, color: C.muted,
            lineHeight: 1, padding: 4,
          }}
          aria-label="Close"
        >×</button>

        {/* header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: SERIF, fontSize: 32, fontWeight: 400,
            color: C.dark, margin: '0 0 10px', letterSpacing: '-0.02em',
          }}>Valuation Methodology</h1>
          <p style={{
            fontFamily: SANS, fontSize: 13, fontWeight: 300,
            color: C.muted, margin: 0, lineHeight: 1.6,
          }}>
            A structured decomposition of cask value into measurable, theoretically
            grounded components. Each stage is calibrated from {' '}
            <strong style={{ fontWeight: 500 }}>676 observed auction sales</strong>
            {' '}(446 GWA + 230 AYC, 2017–2026).
          </p>
        </div>

        <Divider />

        {/* ── 0. Overview ─────────────────────────────────────────────────── */}
        <Section title="Model Overview">
          <P>
            The achievable £/LPA (litres of pure alcohol) is estimated in three stages that
            are then composed multiplicatively:
          </P>
          <Formula>{
`achievableLpa = BASE_LPA[tier]
              × ageMultiplier(age)
              × caskTypeMultiplier(caskType)
              × copulaFactor(age, tier)
              × (1 + beautyContestPremium(distillery, tier))`
          }</Formula>
          <P>
            This formula output is then blended with a direct data anchor derived from
            comparable sold lots, weighted by the quality and quantity of available
            comparables. The total cask value is <span style={{ fontFamily: MONO }}>achievableLpa × LPA</span>.
          </P>
          <P>
            The sections below justify each term from first principles and describe
            how each parameter was estimated.
          </P>
        </Section>

        <Divider />

        {/* ── 1. Tier classification ───────────────────────────────────────── */}
        <Section title="I. Distillery Tier Classification">
          <P>
            Distilleries are grouped into four tiers based on observable market
            behaviour across three dimensions: (1) the price-to-content ratio
            (£/LPA) relative to the fundamental liquid value; (2) the magnitude
            and persistence of the sentiment premium over fundamental value; and
            (3) demand resilience in stressed market conditions (2025–26 GWA data).
          </P>

          <Sub title="Tier definitions">
            <P>
              <strong style={{ fontWeight: 500 }}>Tier 1 — Beauty Contest Elite</strong>
              {' '}(Macallan, Springbank, Hazelburn, Longrow). Strong reflexive premium;
              buyers are buying what they expect other buyers to want. Price is substantially
              decoupled from liquid content. Prices retain the largest fraction of their
              bull-market premium in stressed conditions.
            </P>
            <P>
              <strong style={{ fontWeight: 500 }}>Tier 2 — Premium Collectible</strong>
              {' '}(Bruichladdich, Ardbeg, Lagavulin, Ben Nevis, Highland Park, etc.).
              Meaningful sentiment premium; flavour reputation and collector recognition
              support above-fundamental pricing. Moderate resilience.
            </P>
            <P>
              <strong style={{ fontWeight: 500 }}>Tier 3 — Quality Standard</strong>
              {' '}(Teaninich, Benrinnes, Craigellachie, Glen Moray, etc.). Limited
              sentiment premium. Price is primarily driven by age and liquid quality.
            </P>
            <P>
              <strong style={{ fontWeight: 500 }}>Tier 4 — Commodity</strong>
              {' '}(Tullibardine, Annandale, Holyrood, Adnams, etc.). Price closely
              tracks liquid content value. Near-zero beauty contest component.
            </P>
          </Sub>

          <Note>
            The tier determines BASE_LPA, the copula marginal V, and the beauty
            contest stress-retention factor. Misclassification of a distillery into
            the wrong tier is the largest single source of formula error; the data
            anchor partially corrects for this when comparable sales exist.
          </Note>
        </Section>

        <Divider />

        {/* ── 2. BASE_LPA ─────────────────────────────────────────────────── */}
        <Section title="II. Base £/LPA Rate">
          <P>
            BASE_LPA represents the expected £/LPA for a 10-year-old hogshead of
            average fill character, before age, cask type, and premium effects are
            applied. It is estimated from the median of age-normalised sold lots in
            the comparables dataset:
          </P>
          <Formula>{
`BASE_LPA[tier] = median { lpaPer_i / ageMultiplier(age_i) }
                 for all i where: sold = true,
                                  lpaEstimated = false,
                                  auctionYear ≥ 2023,
                                  age ∈ [5, 30]`
          }</Formula>
          <P>
            Dividing each observed £/LPA by <span style={{ fontFamily: MONO }}>ageMultiplier(age)</span> maps
            it back to the 10-year baseline, making observations at different ages
            comparable. The median is used rather than the mean to resist distortion
            from the ~5–8% of auction results that are statistical outliers (identified
            by the Tukey 1.5 × IQR fence applied per tier).
          </P>

          <Sub title="Calibrated values (May 2026)">
            <Formula>{
`Tier 1 (n = 1):  BASE_LPA = £100   (Macallan; consistent with WH Mar 2026 anchor)
Tier 2 (n = 19): BASE_LPA = £42    (median £42.8; data IQR £31.6–£61.1)
Tier 3 (n = 27): BASE_LPA = £24    (median £23.6; data IQR £16.1–£32.4)
Tier 4 (n = 62): BASE_LPA = £19    (median £19.8; data IQR £17.4–£25.4)`
            }</Formula>
            <Note>
              The previous Tier 4 value of £8 was derived from a 50%-achievability
              discount on RNM bids. Confirmed sold lots show a 2.4× higher realised
              price; the estimate has been corrected upward. Tier 3 was 12% too high
              (£27 → £24).
            </Note>
          </Sub>
        </Section>

        <Divider />

        {/* ── 3. Age multiplier ───────────────────────────────────────────── */}
        <Section title="III. Age Multiplier">
          <P>
            The age multiplier is an OLS-fitted quadratic function of log(age),
            estimated from current-market data (2022+ sold lots with recorded LPA).
            It captures three effects of maturation: flavour development (non-linear
            chemical transformation over time), angel's share (≈ 1.5%/yr evaporative
            loss concentrates the remaining spirit), and rarity (supply of old casks
            is inherently shrinking).
          </P>

          <Sub title="Functional form">
            <P>
              The response variable is the residual log-price after removing the
              tier base rate and cask type effect:
            </P>
            <Formula>{
`log(lpaPer / BASE_LPA[tier] / caskMult) = β₀ + β₁·log(age) + β₂·log²(age) + ε

ageMultiplier(a) = exp(β₀ + β₁·log(a) + β₂·log²(a))

Normalised: ageMultiplier(10) = 1.0  (intercept shifted so fitted value at 10yr = 0 in log space)`
            }</Formula>
            <P>
              The quadratic in log(age) is the minimal parametric form that can
              capture both the accelerating premium at mid-ages and the decelerating
              curve at extremes, while avoiding the 14-parameter overfitting of a
              piecewise linear breakpoint curve.
            </P>
          </Sub>

          <Sub title={`OLS coefficients (fitted ${mv.calibrationDate})`}>
            <Formula>{
`β₀ = ${beta[0]}  (normalised intercept)
β₁ = ${beta[1]}  (linear log-age sensitivity)
β₂ = ${beta[2]}  (curvature)

Implied multipliers:
  age =  3yr:  ×${AGE_OLS_COEF ? Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1]*Math.log(3)   + AGE_OLS_COEF[2]*Math.log(3)**2).toFixed(2)   : 'n/a'}
  age =  5yr:  ×${AGE_OLS_COEF ? Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1]*Math.log(5)   + AGE_OLS_COEF[2]*Math.log(5)**2).toFixed(2)   : 'n/a'}
  age =  8yr:  ×${AGE_OLS_COEF ? Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1]*Math.log(8)   + AGE_OLS_COEF[2]*Math.log(8)**2).toFixed(2)   : 'n/a'}
  age = 10yr:  ×1.00  (normalisation point)
  age = 15yr:  ×${AGE_OLS_COEF ? Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1]*Math.log(15)  + AGE_OLS_COEF[2]*Math.log(15)**2).toFixed(2)  : 'n/a'}
  age = 20yr:  ×${AGE_OLS_COEF ? Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1]*Math.log(20)  + AGE_OLS_COEF[2]*Math.log(20)**2).toFixed(2)  : 'n/a'}
  age = 25yr:  ×${AGE_OLS_COEF ? Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1]*Math.log(25)  + AGE_OLS_COEF[2]*Math.log(25)**2).toFixed(2)  : 'n/a'}
  age = 30yr:  ×${AGE_OLS_COEF ? Math.exp(AGE_OLS_COEF[0] + AGE_OLS_COEF[1]*Math.log(30)  + AGE_OLS_COEF[2]*Math.log(30)**2).toFixed(2)  : 'n/a'}`
            }</Formula>
          </Sub>

          <Sub title="Two-curve design: current vs. structural">
            <P>
              The OLS curve is fitted to <em>current market</em> data (2022+).
              The current market applies roughly age^1.9 sensitivity; the structural
              curve (retained as a separate reference) describes age^3.5+ at the
              25yr point, consistent with 2021–23 peak market behaviour.
            </P>
            <P>
              The formula path uses the OLS curve, giving achievable prices
              calibrated to today's market. The recovery scenario uses the structural
              curve, reflecting the assumption that aged premiums re-expand to pre-crash
              levels if market conditions normalise. These two curves encode an explicit
              normative assumption — recovery is possible but not guaranteed — which
              is declared rather than hidden.
            </P>
          </Sub>
        </Section>

        <Divider />

        {/* ── 4. Cask type multiplier ─────────────────────────────────────── */}
        <Section title="IV. Cask Type Multiplier">
          <P>
            The cask type multiplier is decomposed into three independent
            multiplicative components, each capturing a distinct physical or
            chemical effect:
          </P>
          <Formula>{
`caskTypeMultiplier(type) = m_size × m_fill × m_wood
                           ∈ [0.70, 1.65]  (bounded to prevent pathological stacking)`
          }</Formula>

          <Sub title="Vessel size (m_size)">
            <P>
              The surface-area-to-volume ratio of the vessel determines the rate of
              wood-spirit interaction per litre. Smaller casks mature faster and more
              intensely per LPA, commanding a premium. The LPA discount for large
              vessels reflects this: a butt (490L) matures more slowly per litre
              than an octave (50L).
            </P>
            <Formula>{
`Vessel type    Volume   m_size
Octave         ~50L     1.32
Quarter Cask   ~50L     1.22
Barrique       ~225L    1.06
Bourbon Barrel ~190L    1.08
Hogshead       ~225L    1.00  (baseline)
Puncheon       ~450L    0.91
Butt / HHD     ~490L    0.88`
            }</Formula>
          </Sub>

          <Sub title="Fill type (m_fill)">
            <P>
              First-fill casks contain fresh, unextracted wood compounds (vanillin,
              tannins, lactones). Refill casks have been depleted by a prior filling
              and impart less character per year. This translates to observable price
              differentials in the auction record.
            </P>
            <Formula>{
`1st fill / fresh:  m_fill = 1.10
Refill / re-fill:  m_fill = 0.91
Otherwise:         m_fill = 1.00`
            }</Formula>
          </Sub>

          <Sub title="Wood character (m_wood)">
            <P>
              The cask's prior contents determine the secondary flavour contribution
              to the maturing spirit. Oloroso and PX sherry casks impart the strongest
              secondary character (intense dried fruit, oxidative richness) and command
              the largest premium. Port and wine finishes command a moderate premium.
            </P>
            <Formula>{
`Oloroso / PX sherry:        m_wood = 1.18
Standard sherry:             m_wood = 1.14
Pinot Noir / Mouton:         m_wood = 1.13
Port:                        m_wood = 1.10
Ruby Port:                   m_wood = 1.12
Wine (non-bourbon):          m_wood = 1.07
Virgin Oak:                  m_wood = 1.05
Bourbon / ex-bourbon / rye:  m_wood = 1.00  (baseline)`
            }</Formula>
          </Sub>
        </Section>

        <Divider />

        {/* ── 5. Student-t copula ─────────────────────────────────────────── */}
        <Section title="V. Student-t Copula (Age × Reputation)">
          <P>
            The standard multiplicative model assumes age and distillery reputation
            contribute independently to value. Empirical observation contradicts this:
            a 35-year-old Macallan does not merely trade at (T1 premium) × (35yr premium);
            the joint realisation of extreme age <em>and</em> elite reputation produces a
            superlinear amplification — what the market calls the "trophy premium."
            This tail dependence is modelled with a bivariate Student-t copula.
          </P>

          <Sub title="Why not the Gaussian copula">
            <P>
              The Gaussian copula has upper tail dependence λ_U = 0 for all ρ {'<'} 1.
              No matter how high ρ, extreme joint events are treated as asymptotically
              independent. This is the structural flaw that caused the systematic
              underestimation of correlated default in 2008 CDO pricing. In whisky
              cask markets the analogous failure is underestimating how violently
              high-tier, aged lots spike in bull markets — the precise premium we
              are trying to quantify.
            </P>
          </Sub>

          <Sub title="Student-t copula">
            <P>
              The bivariate Student-t copula C_{'{'}ρ,ν{'}'} has upper tail dependence:
            </P>
            <Formula>{
`λ_U = 2 · t_{ν+1}(-√((ν+1)(1−ρ)/(1+ρ)))   > 0  for all ρ > −1, ν < ∞

At ρ = ${rho}, ν = ${nu}:  λ_U = ${lambdaU}
(vs λ_U = 0 for Gaussian copula at any ρ)`
            }</Formula>
            <P>
              The copula density ratio — the factor by which joint dependence amplifies
              or discounts the independent-marginals product — is:
            </P>
            <Formula>{
`c_{ρ,ν}(u,v) = f₂(x, y; ρ, ν) / [f₁(x; ν) · f₁(y; ν)]

where  x = t_ν⁻¹(u),  y = t_ν⁻¹(v)
       f₂ = bivariate t PDF,  f₁ = univariate t PDF

In closed form:
c_{ρ,ν}(u,v) = exp[
  lgamma((ν+2)/2) + lgamma(ν/2) − 2·lgamma((ν+1)/2)
  − ½·log(1−ρ²)
  − (ν+2)/2·log(1 + (x²−2ρxy+y²)/((1−ρ²)ν))
  + (ν+1)/2·(log(1+x²/ν) + log(1+y²/ν))
]`
            }</Formula>
            <P>
              The t-quantile x = t_ν⁻¹(u) is computed via Newton's method using
              a Cornish–Fisher expansion as the initial guess, with the regularised
              incomplete beta function for the CDF (Lentz continued-fraction
              algorithm; Lanczos approximation for lgamma with g = 7, n = 9 terms,
              max error {'<'} 10⁻¹⁵).
            </P>
          </Sub>

          <Sub title={`Marginal distributions`}>
            <P>
              Each factor is mapped to a uniform marginal U(0,1) through its
              empirical CDF, then to a t_ν quantile:
            </P>
            <Formula>{
`Age marginal:   U_age  = Φ((log(max(a, 0.5)) − log 14) / 0.60)
Tier marginal:  U_tier ∈ {0.95, 0.72, 0.42, 0.15} for tiers {1, 2, 3, 4}

x = t_ν⁻¹(U_age),  y = t_ν⁻¹(U_tier)`
            }</Formula>
            <P>
              The age marginal is a log-normal CDF (median 14yr, σ = 0.60) fitted to
              the distribution of cask ages in the dataset. The tier marginals are
              assigned to reflect approximate quantiles of the full distillery quality
              distribution: roughly 5% of distilleries qualify as elite (T1).
            </P>
          </Sub>

          <Sub title={`Parameter estimation: ρ̂ = ${rho} (MLE)`}>
            <P>
              The correlation parameter ρ is estimated by maximum likelihood on
              all sold comparables with recorded LPA. The MLE problem:
            </P>
            <Formula>{
`ρ̂ = argmax_{ρ ∈ (0,1)} Σᵢ log c_{ρ,ν}(F̂_age(aᵢ), F̂_tier(tᵢ))

Solved via golden-section search on precomputed {(xᵢ, yᵢ)} pairs
(t-quantiles evaluated once at module load; expensive Newton iteration
is O(n) not O(n × iterations)).

Estimated ρ = ${rho}  (calibrated ${mv.calibrationDate})`
            }</Formula>
            <Note>
              ρ = {rho} is lower than the 0.72 previously asserted from visual calibration.
              However, with ν = {nu}, the Student-t copula still produces meaningful tail
              amplification through λ_U {'>'} 0 — a property the Gaussian copula lacks
              regardless of ρ. The MLE estimate reflects the actual observed co-movement
              of age and tier effects in the auction data, rather than a judgment call.
            </Note>
          </Sub>

          <Sub title="Tier-conditional market stress dampener">
            <P>
              In the current market (97.9% reserve failure rate, Jan–Apr 2026),
              joint tail realisations are compressed. The copula factor is dampened
              in proportion to each tier's stress-retention parameter:
            </P>
            <Formula>{
`copulaFactor = 1 + (rawCopula − 1) × STRESS_RETENTION[tier]

STRESS_RETENTION = {T1: 0.52, T2: 0.34, T3: 0.20, T4: 0.10}

Justification: the copula represents the same joint-tail speculative premium as
the beauty contest; both should compress under stress in proportion to the tier's
demand floor. Using a single global dampener (previously 0.32) was inconsistent
with the tier-differentiated STRESS_RETENTION already used for the beauty contest.`
            }</Formula>
          </Sub>
        </Section>

        <Divider />

        {/* ── 6. Beauty contest ───────────────────────────────────────────── */}
        <Section title="VI. Keynesian Beauty Contest Premium">
          <P>
            In Chapter 12 of the <em>General Theory</em> (1936), Keynes observed
            that professional investment is not a matter of choosing the best
            assets but of anticipating what the average investor will think the
            average investor will think is best — a third-order reflexive game.
            In whisky cask markets, this manifests as a premium above the fundamental
            liquid value that is self-fulfilling in bull markets and self-negating in
            bear markets.
          </P>

          <Sub title="Beauty score">
            <P>
              Each named distillery is assigned a beauty score b ∈ [0, 1]
              reflecting its role as a reflexive speculation target, calibrated from
              observed £/LPA premiums over tier baseline in functioning markets
              (e.g., Macallan: 0.98, Springbank: 0.95, Bruichladdich: 0.82).
              Unknown distilleries receive a tier-average score.
            </P>
          </Sub>

          <Sub title="Stressed market premium">
            <P>
              The Minsky instability hypothesis describes the current phase: the
              speculative excess (2021–23) is unwinding as buyers refuse to pay
              reflexive premiums they expect others to abandon. The retained premium is:
            </P>
            <Formula>{
`bcPremium = b × 0.85 × (1 − MARKET_STRESS × (1 − STRESS_RETENTION[tier]))

MARKET_STRESS    = 0.979  (GWA reserve failure rate, Jan–Apr 2026)
STRESS_RETENTION = {T1: 0.52, T2: 0.34, T3: 0.20, T4: 0.10}

Example — Macallan (b = 0.98, T1):
  bcPremium = 0.98 × 0.85 × (1 − 0.979 × 0.48) = 0.98 × 0.85 × 0.530 = 0.441`
            }</Formula>
            <P>
              The STRESS_RETENTION values reflect the observation that Tier 1 buyers
              are long-horizon wealth holders with less urgency to liquidate; their
              demand floor is higher and more persistent. Tier 4 buyers are more
              price-sensitive; premium retention collapses to ≈ 2% of beauty score.
            </P>
          </Sub>
        </Section>

        <Divider />

        {/* ── 7. Seller expectation model ─────────────────────────────────── */}
        <Section title="VII. Seller Expectation and Market Gap">
          <P>
            Sellers anchor to their acquisition price or the peak market price
            (Jan 2024 ≈ the recovery scenario price) and adjust downward too slowly
            as market evidence accumulates — the "anchoring and insufficient
            adjustment" heuristic documented by Tversky and Kahneman (1974).
            The model quantifies the resulting bid-ask gap and the expected time
            to capitulation.
          </P>
          <Formula>{
`sellerExpLpa(t) = recoveryLpa × (1 − δ[tier])^t

where t = months since market peak (Jan 2024 = 0)
      δ = MONTHLY_DECAY = {T1: 0.008, T2: 0.015, T3: 0.020, T4: 0.030}

Capitulation months:  t* = log(achievableLpa / sellerExpLpa) / log(1 − δ)`
          }</Formula>
          <P>
            The monthly decay rates reflect the holding-power differential by tier:
            Tier 1 owners are typically high-net-worth individuals with no liquidity
            pressure (implied half-life ≈ 87 months); Tier 4 sellers are often
            smaller investors or distilleries with working-capital incentives
            (implied half-life ≈ 23 months).
          </P>
        </Section>

        <Divider />

        {/* ── 8. Recovery scenario ────────────────────────────────────────── */}
        <Section title="VIII. Recovery Scenario">
          <P>
            The recovery scenario estimates the achievable price if market
            conditions returned to the 2023 peak (GWA clearance rates ≈ 60–70%).
            It applies a tier-specific recovery multiplier to the current achievable:
          </P>
          <Formula>{
`recoveryLpa = achievableLpa × RECOVERY_MULT[tier]
RECOVERY_MULT = {T1: 1.8, T2: 2.6, T3: 3.2, T4: 4.0}`
          }</Formula>
          <P>
            Tier 4 casks suffered the largest relative collapse because their demand
            was primarily speculative (investors buying commodity casks expecting
            appreciation). Tier 1 casks retained a genuine demand floor; their
            recovery multiple is smaller because the gap between current and peak
            is narrower.
          </P>
        </Section>

        <Divider />

        {/* ── 9. Data anchor ──────────────────────────────────────────────── */}
        <Section title="IX. Data Anchor from Comparable Sales">
          <P>
            The formula above is a structural model: it produces consistent outputs
            from theory and calibrated parameters but cannot capture distillery-
            specific idiosyncrasies. The data anchor supplements the formula with
            a direct statistical estimate from the closest comparable sold lots.
          </P>

          <Sub title="Comparable scoring">
            <P>
              Each lot in the 676-comparable dataset is scored for relevance to the
              target cask:
            </P>
            <Formula>{
`score = +40  exact distillery match
       + 20  partial name match (one contains the other)
       + 20  same tier
       +  8  same cask category (sherry / wine / bourbon / other)
       −  2  per year |age_comp − age_target| (capped at −20)
       −  2  per year before 2024 (recency penalty)
       −  8  reserve not met (RNM — bid floor, not confirmed sale)
       − 10  LPA was estimated, not recorded

Only lots with score ≥ 10 are used as anchor candidates.`
            }</Formula>
          </Sub>

          <Sub title="Age and cask-type normalisation">
            <P>
              Each candidate's observed £/LPA is normalised to the target age and
              cask type using the model's own multiplier functions:
            </P>
            <Formula>{
`v̂ = lpaPer × ageRatio × caskRatio

ageRatio  = clip(ageMultiplier(age_target) / ageMultiplier(age_comp), 0.20, 5.0)
caskRatio = caskTypeMultiplier(caskType_target) / caskTypeMultiplier(caskType_comp)`
            }</Formula>
          </Sub>

          <Sub title="Outlier removal (Tukey fence)">
            <P>
              When 5 or more candidates are available, statistical outliers are
              removed using Tukey's 1.5 × IQR fence applied to the normalised
              values {'{'}v̂{'}'}: observations outside [Q1 − 1.5·IQR, Q3 + 1.5·IQR]
              are excluded. If filtering would leave fewer than 2 candidates, the
              full set is retained.
            </P>
          </Sub>

          <Sub title="Score-weighted anchor and blend weights">
            <P>
              The anchor estimate is the score-weighted mean of the cleaned
              normalised values:
            </P>
            <Formula>{
`anchorLpa = Σ(v̂ᵢ · scoreᵢ) / Σ(scoreᵢ)   for i in clean candidate set

Formula–anchor blend:
achievableLpa = F × (1 − w) + A × w

n = 1–2:  w = 0.25  (few comps; formula dominates)
n = 3–5:  w = 0.45  (balanced)
n ≥ 6:    w = 0.65  (data dominates)`
            }</Formula>
            <Note>
              The blend weights are pragmatic thresholds. A formally optimal Bayesian
              blend would compute w from the ratio of prior variance (formula prediction
              error) to observation variance (comparable spread), and would provide
              posterior predictive intervals rather than a point estimate. The required
              framework — a hierarchical Bayesian model or Gaussian Process over
              (distillery, age, cask type) — is deferred. The current weights are
              consistent with the 5-fold CV results (formula MAE ≈ anchor LOO-CV MAE),
              which suggest neither path dominates, and blending at moderate weight is
              approximately rational.
            </Note>
          </Sub>
        </Section>

        <Divider />

        {/* ── 10. Confidence intervals ────────────────────────────────────── */}
        <Section title="X. Confidence Intervals (Log-Normal)">
          <P>
            Cask auction prices are strictly positive and right-skewed. Under the
            assumption that log(price) is approximately normally distributed — a
            standard and empirically defensible prior for auction outcomes — the
            correct interval derivation is analytical rather than ad hoc.
          </P>

          <Sub title="Log-normal parameterisation">
            <P>
              If P ~ LogNormal(μ_L, σ_L²), then E[P] = exp(μ_L + σ_L²/2) and
              CoV² = exp(σ_L²) − 1. Given the model's point estimate (E[P] = achievableLpa)
              and uncertainty (CoV), the log-normal parameters are:
            </P>
            <Formula>{
`σ_L = √(log(1 + CoV²))
μ_L = log(achievableLpa) − σ_L² / 2

Quantiles:
  P_q = exp(μ_L + Φ⁻¹(q) · σ_L)

P20 = exp(μ_L − 0.842 · σ_L)   [Φ⁻¹(0.20) = −0.842]
P80 = exp(μ_L + 0.842 · σ_L)   [Φ⁻¹(0.80) = +0.842]`
            }</Formula>
            <P>
              This derivation is exact rather than approximate: the previous formulation
              P20 = achievableLpa × (1 − u × 0.80) / P80 = achievableLpa × (1 + u × 1.25)
              implied a specific asymmetry not derived from any distributional assumption.
              The log-normal form correctly produces a wider upper tail and narrower lower
              bound (prices cannot go negative) without adding any free parameters.
            </P>
          </Sub>

          <Sub title="Uncertainty (CoV) estimation">
            <P>
              When 5 or more clean comparables are available, CoV is derived empirically:
            </P>
            <Formula>{
`CoV = std({ v̂ᵢ }) / mean({ v̂ᵢ })
u   = clip(CoV × 1.5, 0.18, 0.65)

The ×1.5 scaling converts a 1σ CoV to approximately a P20–P80 half-width.`
            }</Formula>
            <P>
              When comparables are insufficient, uncertainty reverts to a structural estimate:
            </P>
            <Formula>{
`u = baseUncertainty + ageUncertainty

baseUncertainty  = 0.32  (distillery in named calibration set)
                 = 0.52  (distillery not directly calibrated)
ageUncertainty   = 0.18  (age > 30yr — sparse data, model extrapolation)
                 = 0.14  (age < 5yr — new-make pricing highly uncertain)
                 = 0.00  (otherwise)`
            }</Formula>
          </Sub>
        </Section>

        <Divider />

        {/* ── 11. Cross-validation ────────────────────────────────────────── */}
        <Section title="XI. Model Validation (Cross-Validation)">
          <P>
            BASE_LPA is calibrated from the same dataset used to run the model.
            To obtain genuinely out-of-sample error estimates, the model is evaluated
            with two separate cross-validation procedures.
          </P>

          <Sub title="5-fold CV for formula error">
            <P>
              The eligible lot set (sold, recorded LPA, age 2–35, auctionYear ≥ 2022)
              is shuffled with a deterministic LCG (seed = 42) and split into 5 folds.
              For each fold, BASE_LPA is <em>re-estimated from the training folds
              only</em>, and the formula (with re-estimated BASE_LPA) is evaluated on
              the held-out fold. This avoids the circularity of calibrating and
              evaluating on the same data.
            </P>
            <Formula>{
`Formula 5-fold CV results (${mv.calibrationDate}):
  n = ${mv.n} eligible lots
  MAE  = £${mv.formula.mae}/LPA
  RMSE = £${mv.formula.rmse}/LPA
  MedAE = £${mv.formula.medAE}/LPA
  Bias = £${mv.formula.bias}/LPA  (positive = model overestimates)`
            }</Formula>
          </Sub>

          <Sub title="Leave-one-out CV for anchor error">
            <P>
              The anchor estimate for each lot is computed with that lot excluded
              from the comparables pool (LOO-CV). This measures the anchor's
              out-of-sample accuracy independently of the formula.
            </P>
            <Formula>{
`Anchor LOO-CV results (${mv.calibrationDate}):
  n = ${mv.anchor.n} lots with at least one LOO comparable
  MAE  = £${mv.anchor.mae}/LPA
  RMSE = £${mv.anchor.rmse}/LPA
  MedAE = £${mv.anchor.medAE}/LPA
  Bias = £${mv.anchor.bias}/LPA`
            }</Formula>
          </Sub>

          <Note>
            The similar MAE between formula and anchor paths is expected: the anchor
            normalises comparables using the formula's own multipliers, so both
            paths inherit the same functional form error. The CV metrics bound the
            formula + anchor contribution only — they do not capture model
            specification risk (wrong tier assignment, missing distillery-specific
            effects) or market timing risk (regime change between calibration and use).
          </Note>
        </Section>

        <Divider />

        {/* ── 12. Data sources and limitations ─────────────────────────────── */}
        <Section title="XII. Data Sources and Limitations">
          <Sub title="Dataset">
            <P>
              The 676-lot comparables dataset combines two sources:
            </P>
            <Formula>{
`AYC (AuctionYourCask.com):  230 lots, scraped 2025–26
GWA (Grand Whisky Auction): 446 lots, hand-recorded 2017–2026
                            (301 confirmed sold, 145 RNM)`
            }</Formula>
          </Sub>

          <Sub title="Selection bias">
            <P>
              Lots that attract no bids are often not recorded; the dataset is
              biased toward casks that generated at least one bid. This may
              cause the model to overstate achievable prices for truly illiquid
              categories. A Heckman selection model would require a valid exclusion
              restriction (an instrument correlated with listing probability but not
              price), which is not available in the current data. The bias is
              acknowledged but uncorrected; achievable prices should be interpreted
              as "achievable conditional on attracting a bid."
            </P>
          </Sub>

          <Sub title="Model version risk">
            <P>
              The model is recalibrated periodically as new auction data accumulates.
              Between recalibrations, parameter drift — most notably in BASE_LPA,
              COPULA_RHO, and AGE_OLS_COEF — may cause the model to diverge from
              current market conditions. The current calibration date is embedded in
              every validation result:
            </P>
            <Formula>{
`Current calibration: ${mv.calibrationDate}
Tracked parameters:
  COPULA_RHO = ${rho}  (MLE on ${mv.n}+ lots)
  AGE_OLS_COEF = [${beta.join(', ')}]
  BASE_LPA = {T1: £100, T2: £42, T3: £24, T4: £19}`
            }</Formula>
            <P>
              For insurance underwriting or structured finance use, a drift monitoring
              framework is recommended: re-estimate parameters monthly, flag any
              parameter that moves more than 2σ (from its historical distribution)
              between calibrations, and document the model version in any policy or
              term sheet. This implementation does not yet include automated drift
              alerts; parameter snapshots should be saved at each recalibration and
              compared manually.
            </P>
          </Sub>

          <Sub title="Not investment advice">
            <P>
              Auction prices are volatile and idiosyncratic. This model produces
              estimates, not guarantees. Past prices are not indicative of future
              realisations. The P20/P80 range should be interpreted as the envelope
              within which the model estimates achievable price lies, not as a
              prediction interval for the next auction result.
            </P>
          </Sub>
        </Section>

        {/* footer */}
        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 8,
          fontFamily: SANS, fontSize: 11, color: C.muted, fontWeight: 300,
          lineHeight: 1.6,
        }}>
          Model version: {mv.calibrationDate}. ρ = {rho} (MLE, ν = {nu}).
          Formula 5-fold CV MAE: £{mv.formula.mae}/LPA.
          Calibration data: 676 lots, GWA 2017–2026 + AYC 2025–26.
        </div>
      </div>
    </div>
  )
}

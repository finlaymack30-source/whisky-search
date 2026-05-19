import { useState, useRef, useEffect } from 'react'
import { supabase, fetchSubscription } from '../supabase'
import AuthModal from './AuthModal'
import {
  valueCask, findComparables, getTier, getBeautyScore,
  KNOWN_DISTILLERIES, ageMultiplier, caskTypeMultiplier,
  beautyContestPremium, gaussianCopulaFactor,
} from '../lib/caskValuation'

const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

const C = {
  bg: '#FAFAF7',
  white: '#FFFFFF',
  dark: '#1A1A18',
  stone: '#B8A882',
  muted: '#9A9080',
  ink: '#4A4540',
  border: '#E8E4DC',
  borderMid: '#D8D2C8',
  terracotta: '#7A3328',
  terracottaBg: '#F5EEEC',
  terracottaBorder: '#CCA89E',
  green: '#3A6B52',
  greenBg: '#EFF5F1',
  greenBorder: '#B4CEC1',
}

const CASK_TYPES = [
  'Hogshead', '1st Fill Bourbon Hogshead', 'Refill Bourbon Hogshead',
  'Sherry Hogshead', '1st Fill Sherry Hogshead', 'Refill Sherry Hogshead',
  'Butt', 'Sherry Butt', 'Puncheon',
  'Barrel', 'Bourbon Barrel', '1st Fill Bourbon Barrel', 'Refill Barrel',
  'Barrique', '1st Fill French Oak Barrique',
  '1st Fill Port Hogshead', 'Port Cask',
  'Quarter Cask', 'Octave',
  'Oloroso Sherry Hogshead', 'PX Sherry Hogshead',
  '1st Fill Ruby Port Hogshead', 'Mouton Rothschild Hogshead',
  '1st Fill Pinot Noir', 'Wine Hogshead',
  'Virgin Oak Barrel', 'Fresh Bourbon Barrel',
]

// Standard industry LPA by cask type — used when user does not specify
const DEFAULT_LPA = {
  'Hogshead': 200, '1st Fill Bourbon Hogshead': 205, 'Refill Bourbon Hogshead': 195,
  'Sherry Hogshead': 220, '1st Fill Sherry Hogshead': 225, 'Refill Sherry Hogshead': 210,
  'Butt': 450, 'Sherry Butt': 460, 'Puncheon': 430,
  'Barrel': 175, 'Bourbon Barrel': 180, '1st Fill Bourbon Barrel': 185, 'Refill Barrel': 165,
  'Barrique': 190, '1st Fill French Oak Barrique': 195,
  '1st Fill Port Hogshead': 215, 'Port Cask': 205,
  'Quarter Cask': 100, 'Octave': 55,
  'Oloroso Sherry Hogshead': 220, 'PX Sherry Hogshead': 220,
  '1st Fill Ruby Port Hogshead': 215, 'Mouton Rothschild Hogshead': 200,
  '1st Fill Pinot Noir': 195, 'Wine Hogshead': 195,
  'Virgin Oak Barrel': 175, 'Fresh Bourbon Barrel': 185,
}

function fmt(n) {
  if (n == null) return '—'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function fmtLpa(n) {
  if (n == null) return '—'
  return '£' + n.toFixed(1)
}

// ─── Label ────────────────────────────────────────────────────────────────────

function Label({ children, style }) {
  return (
    <div style={{
      fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: C.stone, fontFamily: SANS, fontWeight: 400,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── FactorBar ────────────────────────────────────────────────────────────────

function FactorBar({ label, value, maxValue, color = C.stone, note }) {
  const pct = Math.min(100, (value / maxValue) * 100)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: C.ink, fontFamily: SANS, fontWeight: 300 }}>{label}</span>
        <span style={{ fontSize: 11, color: C.dark, fontFamily: MONO, fontWeight: 400 }}>{note}</span>
      </div>
      <div style={{ height: 2, background: C.border }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ─── BidAskBar ────────────────────────────────────────────────────────────────

function BidAskBar({ buyerLpa, sellerExpLpa, gapPct }) {
  const buyerPct = Math.min(100, Math.round((buyerLpa / sellerExpLpa) * 100))
  const capitulated = gapPct <= 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, gap: 8 }}>
        <div>
          <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.green, fontFamily: SANS, fontWeight: 400, marginBottom: 6 }}>
            Buyer willingness
          </div>
          <div style={{ fontSize: 24, fontWeight: 400, fontFamily: MONO, color: C.green, lineHeight: 1 }}>
            {fmtLpa(buyerLpa)}<span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 300 }}>/LPA</span>
          </div>
        </div>

        <div style={{
          textAlign: 'center', padding: '10px 18px',
          background: capitulated ? C.greenBg : C.bg,
          border: `1px solid ${capitulated ? C.greenBorder : C.border}`,
        }}>
          <div style={{ fontSize: 20, fontWeight: 400, fontFamily: MONO, color: capitulated ? C.green : C.stone, lineHeight: 1 }}>
            {capitulated ? '<1%' : `${gapPct}%`}
          </div>
          <div style={{ fontSize: 8, fontFamily: SANS, fontWeight: 400, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            {capitulated ? 'gap closed' : 'bid–ask gap'}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.stone, fontFamily: SANS, fontWeight: 400, marginBottom: 6 }}>
            Seller expects
          </div>
          <div style={{ fontSize: 24, fontWeight: 400, fontFamily: MONO, color: C.stone, lineHeight: 1 }}>
            {fmtLpa(sellerExpLpa)}<span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 300 }}>/LPA</span>
          </div>
        </div>
      </div>

      <div style={{ height: 6, background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${buyerPct}%`, background: C.green, transition: 'width 0.9s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 8, fontFamily: SANS, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green }}>
          Buyer — <span style={{ fontFamily: MONO }}>{buyerPct}%</span>
        </span>
        <span style={{ fontSize: 8, fontFamily: SANS, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.stone }}>
          Seller — <span style={{ fontFamily: MONO }}>100%</span>
        </span>
      </div>
    </div>
  )
}

// ─── ConvergenceChart ─────────────────────────────────────────────────────────

function ConvergenceChart({ peakLpa, sellerExpLpa, buyerLpa, decayRate, capitulationMonths }) {
  const W = 520, H = 210
  const PL = 54, PR = 18, PT = 22, PB = 36
  const CW = W - PL - PR, CH = H - PT - PB

  const PAST = 28
  const futureDisplay = Math.min(capitulationMonths > 0 ? capitulationMonths + 14 : 38, 52)
  const total = PAST + futureDisplay

  const xOf = m => (m / total) * CW
  const maxY = peakLpa * 1.08
  const yOf = v => CH * (1 - v / maxY)

  const sellerPts = []
  for (let m = 0; m <= total; m++) {
    sellerPts.push({ m, x: xOf(m), y: yOf(peakLpa * Math.pow(1 - decayRate, m)) })
  }
  const pastPts   = sellerPts.filter(p => p.m <= PAST)
  const futurePts = sellerPts.filter(p => p.m >= PAST)
  const toPath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const buyerY = yOf(buyerLpa)
  const nowX   = xOf(PAST)

  const convM = PAST + capitulationMonths
  const convX = (capitulationMonths > 0 && convM <= total) ? xOf(convM) : null

  const gapPts = sellerPts.filter(p => p.y <= buyerY + 0.5)
  const gapArea = gapPts.length > 1 ? [
    ...gapPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${gapPts[gapPts.length - 1].x.toFixed(1)},${buyerY.toFixed(1)}`,
    `L${gapPts[0].x.toFixed(1)},${buyerY.toFixed(1)}`,
    'Z',
  ].join(' ') : null

  const rawStep = maxY / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const tickStep = [1, 2, 2.5, 5, 10].map(x => x * mag).find(c => c >= rawStep) || rawStep
  const yTicks = []
  for (let v = tickStep; v < maxY * 0.98; v += tickStep) yTicks.push(v)

  const fmtY = v => v >= 10000 ? `£${(v / 1000).toFixed(0)}k`
    : v >= 1000 ? `£${(v / 1000).toFixed(1)}k`
    : `£${Math.round(v)}`

  const xDates = [0, 12, 24].map(m => {
    const d = new Date(2024, 0, 1)
    d.setMonth(d.getMonth() + m)
    return { x: xOf(m), label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) }
  })
  xDates.push({ x: nowX, label: 'Now' })
  if (convX) {
    const d = new Date(2026, 4, 1)
    d.setMonth(d.getMonth() + capitulationMonths)
    xDates.push({ x: convX, label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) })
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <g transform={`translate(${PL},${PT})`}>
        {gapArea && <path d={gapArea} fill="rgba(184,168,130,0.07)" />}
        {yTicks.map(v => (
          <line key={v} x1={0} y1={yOf(v)} x2={CW} y2={yOf(v)} stroke={C.border} strokeWidth={1} />
        ))}
        <line x1={0} y1={buyerY} x2={CW} y2={buyerY} stroke={C.green} strokeWidth={1.5} strokeDasharray="5,4" />
        <path d={toPath(pastPts)} fill="none" stroke={C.stone} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={toPath(futurePts)} fill="none" stroke={C.stone} strokeWidth={1.5} strokeDasharray="6,4" strokeLinejoin="round" />
        <line x1={nowX} y1={0} x2={nowX} y2={CH} stroke={C.muted} strokeWidth={1} strokeDasharray="2,4" />
        <text x={nowX + 3} y={9} fill={C.muted} fontSize={7.5} fontFamily={MONO} letterSpacing="0.06em">NOW</text>
        {convX && (
          <>
            <circle cx={convX} cy={buyerY} r={5} fill={C.dark} />
            <circle cx={convX} cy={buyerY} r={2} fill={C.white} />
          </>
        )}
        <text x={CW - 2} y={yOf(sellerExpLpa) - 6} textAnchor="end" fill={C.stone} fontSize={9} fontFamily={MONO}>
          seller {fmtY(sellerExpLpa)}
        </text>
        <text x={CW - 2} y={buyerY + 14} textAnchor="end" fill={C.green} fontSize={9} fontFamily={MONO}>
          buyer {fmtY(buyerLpa)}
        </text>
        <text x={3} y={yOf(peakLpa) - 4} textAnchor="start" fill={C.muted} fontSize={8} fontFamily={MONO}>
          2023 peak {fmtY(peakLpa)}
        </text>
        {yTicks.map(v => (
          <text key={v} x={-5} y={yOf(v) + 3.5} textAnchor="end" fill={C.muted} fontSize={8} fontFamily={MONO}>
            {fmtY(v)}
          </text>
        ))}
        <line x1={0} y1={0} x2={0} y2={CH} stroke={C.border} strokeWidth={1} />
        <line x1={0} y1={CH} x2={CW} y2={CH} stroke={C.border} strokeWidth={1} />
        {xDates.map(({ x, label }) => (
          <g key={label}>
            <line x1={x} y1={CH} x2={x} y2={CH + 3} stroke={C.muted} strokeWidth={1} />
            <text x={x} y={CH + 14} textAnchor="middle" fill={C.muted} fontSize={8} fontFamily={MONO}>{label}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}

// ─── ComparableRow ────────────────────────────────────────────────────────────

function ComparableRow({ comp, isLast }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 90px 56px',
      padding: '13px 20px', alignItems: 'center',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 400, color: C.dark, fontFamily: SANS }}>{comp.distillery}</div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: SANS, fontWeight: 300, marginTop: 2 }}>{comp.age}yr · {comp.type}</div>
      </div>
      <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 400, color: C.dark, textAlign: 'right' }}>
        {comp.lpaPer ? `£${comp.lpaPer}/LPA` : '—'}
      </div>
      <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 400, color: C.dark, textAlign: 'right' }}>
        {fmt(comp.total)}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: 8, fontFamily: MONO, fontWeight: 400, letterSpacing: '0.06em',
          color: comp.source === 'GWA' ? C.dark : C.muted,
          borderBottom: comp.source === 'GWA' ? `1px solid ${C.borderMid}` : 'none',
          paddingBottom: 1,
        }}>
          {comp.source} {comp.year}
        </span>
      </div>
    </div>
  )
}

// ─── Subscription helpers ─────────────────────────────────────────────────────

function sessionStatus(sub) {
  if (!sub) return 'none'
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  if (sub.paid_until && new Date(sub.paid_until) > new Date()) return 'active'
  if (Date.now() - new Date(sub.trial_started_at).getTime() < THIRTY_DAYS) return 'trial'
  return 'expired'
}



// ─── GatedContent ─────────────────────────────────────────────────────────────
// Active/trial sessions: render children fully.
// Locked: show a clipped, fading preview of the content, then an inline card in page flow.

function GatedContent({ subscription, authLoading, onOpenModal, onStartCheckout, isMobile, children }) {
  const status = sessionStatus(subscription)
  // Don't render gate until we know auth state — avoids flash for returning users
  if (authLoading || status === 'active' || status === 'trial') return <>{children}</>

  const isExpired = status === 'expired'
  const CLIP_HEIGHT = isMobile ? 260 : 340

  return (
    <div>
      {/* Clipped preview with gradient fade */}
      <div style={{ position: 'relative', maxHeight: CLIP_HEIGHT, overflow: 'hidden' }}>
        {children}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 200,
          background: `linear-gradient(to bottom, transparent, ${C.bg})`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Inline card */}
      <div style={{
        maxWidth: isMobile ? '100%' : 440,
        margin: isMobile ? '40px 0 0' : '48px auto 0',
        padding: isMobile ? '36px 24px' : '44px 44px',
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
      }}>
        <Label style={{ marginBottom: 14 }}>Full analysis</Label>

        <div style={{
          fontFamily: SERIF, fontSize: 22, fontWeight: 400,
          color: C.dark, marginBottom: 12, lineHeight: 1.2,
        }}>
          {isExpired ? 'Your free trial has ended' : 'Unlock full analysis'}
        </div>

        <div style={{
          fontSize: 13, color: C.muted, fontFamily: SANS, fontWeight: 300,
          lineHeight: 1.7, marginBottom: 32,
        }}>
          {isExpired
            ? <>Subscribe to continue at <span style={{ fontFamily: MONO }}>£49</span>/month.</>
            : <>Free for 30 days, then <span style={{ fontFamily: MONO }}>£49</span>/month. No card required to start.</>}
        </div>

        <button
          onClick={() => isExpired ? onStartCheckout() : onOpenModal('create')}
          style={{
            display: 'block', width: '100%', padding: '10px 16px',
            background: C.dark, color: '#F5F2EC',
            border: 'none', borderRadius: 0, fontSize: 9,
            fontFamily: SANS, fontWeight: 400,
            cursor: 'pointer', letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          {isExpired ? 'Subscribe — £49/month' : 'Create free account — no card required'}
        </button>

        {!isExpired && (
          <button
            onClick={() => onOpenModal('signin')}
            style={{
              display: 'block', width: '100%',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 12, fontFamily: SANS, fontWeight: 300,
              letterSpacing: '0.02em', textAlign: 'center', padding: 0,
            }}
          >
            Already a member? Sign in
          </button>
        )}
      </div>
    </div>
  )
}

// ─── RecentFeed ───────────────────────────────────────────────────────────────

const FEED_POOL = [
  { distillery: 'Springbank',   year: 2008, cask: 'Hogshead'                  },
  { distillery: 'Glenfarclas',  year: 2012, cask: '1st Fill Sherry Hogshead'  },
  { distillery: 'Ardbeg',       year: 2015, cask: 'Bourbon Barrel'            },
  { distillery: 'Dalmore',      year: 2010, cask: 'Sherry Butt'               },
  { distillery: 'Macallan',     year: 2014, cask: 'Hogshead'                  },
  { distillery: 'Glen Scotia',  year: 2007, cask: '1st Fill Bourbon Hogshead' },
  { distillery: 'Bowmore',      year: 2011, cask: 'Hogshead'                  },
  { distillery: 'GlenAllachie', year: 2013, cask: 'Sherry Hogshead'           },
  { distillery: 'Tomatin',      year: 2016, cask: 'Refill Bourbon Hogshead'   },
  { distillery: 'Glengoyne',    year: 2009, cask: 'Sherry Butt'               },
]

function fmtAge(mins) {
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
}

function RecentFeed() {
  const [entries, setEntries] = useState(() => [
    { ...FEED_POOL[0], minsAgo: 4  },
    { ...FEED_POOL[1], minsAgo: 11 },
    { ...FEED_POOL[2], minsAgo: 23 },
    { ...FEED_POOL[3], minsAgo: 47 },
  ])
  const poolIdx = useRef(4)

  useEffect(() => {
    const add = setInterval(() => {
      const item = FEED_POOL[poolIdx.current % FEED_POOL.length]
      poolIdx.current++
      setEntries(prev => [{ ...item, minsAgo: 0 }, ...prev.slice(0, 3)])
    }, 22000)
    return () => clearInterval(add)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => {
      setEntries(prev => prev.map(e => ({ ...e, minsAgo: e.minsAgo + 1 })))
    }, 60000)
    return () => clearInterval(tick)
  }, [])

  return (
    <div style={{ marginTop: 28 }}>
      <style>{`@keyframes tbk-pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.stone, fontFamily: SANS, fontWeight: 400, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'tbk-pulse 2.2s ease-in-out infinite', flexShrink: 0 }} />
        Recently valued
      </div>
      {entries.map((e, i) => (
        <div key={`${e.distillery}-${e.year}-${i}`} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '9px 0', borderBottom: `1px solid ${C.border}`,
          opacity: 1 - i * 0.18,
        }}>
          <span style={{ fontSize: 12, color: C.ink, fontFamily: SANS, fontWeight: 300 }}>
            {e.distillery}
            <span style={{ color: C.muted }}> · {e.year} · {e.cask}</span>
          </span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: MONO, flexShrink: 0, marginLeft: 16 }}>
            {fmtAge(e.minsAgo)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── CaskValuator ─────────────────────────────────────────────────────────────

export default function CaskValuator({ isMobile, onResult }) {
  const [distillery, setDistillery] = useState('')
  const [fillYear, setFillYear]     = useState('')
  const [caskType, setCaskType]     = useState('Hogshead')
  const [lpa, setLpa]               = useState('')
  const [result, setResult]         = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg]     = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [authLoading, setAuthLoading]   = useState(true)
  const [modal, setModal]               = useState(null)
  const distRef   = useRef(null)
  const suggRef   = useRef(null)
  const resultsRef = useRef(null)

  // Query DB for saved valuation inputs, recalculate, populate state, scroll to results
  async function restorePendingFromDB(user) {
    const { data } = await supabase
      .from('pending_valuations')
      .select('*')
      .eq('email', user.email)
      .single()
    if (!data) return
    await supabase.from('pending_valuations').delete().eq('email', user.email)
    const dist   = data.distillery || ''
    const yr     = data.fill_year
    const cType  = data.cask_type || 'Hogshead'
    const lpaVal = data.lpa != null ? String(data.lpa) : ''
    setDistillery(dist)
    setFillYear(String(yr || ''))
    setCaskType(cType)
    setLpa(lpaVal)
    if (dist && yr) {
      const r = valueCask({ distillery: dist, fillYear: yr, caskType: cType, lpa: lpaVal ? parseFloat(lpaVal) : (DEFAULT_LPA[cType] ?? 200) })
      setResult({ ...r, comparables: findComparables(dist, r.tier, r.age) })
      onResult?.()
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }

  function openModal(mode) {
    setModal(mode)
  }

  // Check session on mount, keep in sync across tabs.
  // Restore pending valuation on INITIAL_SESSION (already signed in) and SIGNED_IN (just confirmed).
  useEffect(() => {
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const sub = await fetchSubscription(session.user.id)
          setSubscription(sub)
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            restorePendingFromDB(session.user)
          }
        } else {
          setSubscription(null)
        }
        if (event === 'INITIAL_SESSION') setAuthLoading(false)
      }
    )
    return () => authListener.unsubscribe()
  }, [])

  // After Stripe Checkout redirect, re-fetch subscription once webhook has processed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return
    window.history.replaceState({}, '', window.location.pathname)
    const refetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      setSubscription(await fetchSubscription(session.user.id))
    }
    setTimeout(refetch, 2000)
    setTimeout(refetch, 5000)
  }, [])

  async function handleStripeCheckout() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { openModal('create'); return }
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error('Stripe checkout error:', err)
    }
  }

  useEffect(() => {
    function handler(e) {
      if (distRef.current && !distRef.current.contains(e.target) &&
          suggRef.current && !suggRef.current.contains(e.target)) {
        setShowSugg(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function onDistilleryChange(val) {
    setDistillery(val)
    if (val.length < 2) { setSuggestions([]); setShowSugg(false); return }
    const q = val.toLowerCase()
    const matches = KNOWN_DISTILLERIES.filter(d => d.toLowerCase().includes(q)).slice(0, 8)
    setSuggestions(matches)
    setShowSugg(matches.length > 0)
  }

  function onSelectSuggestion(d) {
    setDistillery(d)
    setSuggestions([])
    setShowSugg(false)
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!distillery || !fillYear) return
    const yr = parseInt(fillYear)
    if (isNaN(yr) || yr < 1960 || yr > 2026) return
    const r = valueCask({ distillery, fillYear: yr, caskType, lpa: lpa ? parseFloat(lpa) : (DEFAULT_LPA[caskType] ?? 200) })
    const comps = findComparables(distillery, r.tier, r.age)
    setResult({ ...r, comparables: comps })
    onResult?.()
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    border: `1px solid ${C.borderMid}`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, fontWeight: 300,
    color: C.dark, background: C.white, outline: 'none',
    letterSpacing: '0.01em',
  }

  const labelStyle = {
    display: 'block', fontSize: 8, letterSpacing: '0.2em',
    textTransform: 'uppercase', color: C.stone,
    fontFamily: SANS, fontWeight: 400, marginBottom: 8,
  }

  const sectionCard = {
    padding: '28px 28px',
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 0,
  }

  return (
    <div>
      <style>{`.tbk-field::placeholder { color: rgba(74,69,64,0.45); }`}</style>
      {/* ── Form ── */}
      <form onSubmit={onSubmit}>
        {/* Row 1: Distillery — full width */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Distillery</label>
          <div ref={distRef} style={{ position: 'relative' }}>
            <input
              type="text" value={distillery}
              onChange={e => onDistilleryChange(e.target.value)}
              onFocus={() => distillery.length >= 2 && setShowSugg(suggestions.length > 0)}
              placeholder="e.g. Springbank"
              style={{ ...inputStyle, padding: '15px 16px', fontSize: 15 }}
              className="tbk-field"
              autoComplete="off"
            />
            {showSugg && suggestions.length > 0 && (
              <div ref={suggRef} style={{
                position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
                background: C.white, border: `1px solid ${C.borderMid}`,
                zIndex: 100, maxHeight: 240, overflowY: 'auto',
              }}>
                {suggestions.map(d => (
                  <div
                    key={d}
                    onMouseDown={() => onSelectSuggestion(d)}
                    style={{
                      padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                      color: C.dark, fontFamily: SANS, fontWeight: 300,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Fill Year, Cask Type, LPA */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '28fr 44fr 28fr',
          gap: 14, marginBottom: 12,
        }}>
          <div>
            <label style={labelStyle}>Fill Year</label>
            <input type="number" min="1960" max="2026" value={fillYear} onChange={e => setFillYear(e.target.value)} placeholder="e.g. 2008" style={inputStyle} className="tbk-field" />
          </div>

          <div>
            <label style={labelStyle}>Cask Type</label>
            <select value={caskType} onChange={e => setCaskType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              LPA <span style={{ textTransform: 'none', fontSize: 8, letterSpacing: 0, color: C.muted }}>(optional)</span>
            </label>
            <input type="number" min="0" step="0.1" value={lpa} onChange={e => setLpa(e.target.value)} placeholder="e.g. 150" style={inputStyle} className="tbk-field" />
          </div>
        </div>

        <button type="submit" style={{
          display: 'block', width: '100%', padding: '14px',
          background: C.dark, color: '#F5F2EC',
          border: 'none', borderRadius: 0,
          fontSize: 10, fontFamily: SANS, fontWeight: 400,
          cursor: 'pointer', letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          Estimate value
        </button>
      </form>

      {!result && <RecentFeed />}

      {/* ── Results ── */}
      {result && (
        <div ref={resultsRef}>
          {/* Value display — always visible */}
          <div style={{
            paddingTop: 52, paddingBottom: 48,
            borderTop: `1px solid ${C.border}`,
            borderBottom: `1px solid ${C.border}`,
            marginTop: 52, marginBottom: 48,
          }}>
            <Label style={{ marginBottom: 32 }}>
              Estimated achievable — current market, May 2026
            </Label>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : result.total != null ? '1fr 1fr' : '1fr',
              gap: isMobile ? 36 : 56, marginBottom: 32,
            }}>
              {/* Per LPA */}
              <div>
                <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.stone, fontFamily: SANS, fontWeight: 400, marginBottom: 14 }}>
                  Per LPA
                </div>
                <div style={{
                  fontFamily: MONO, fontWeight: 400,
                  fontSize: isMobile ? 32 : 48,
                  color: C.dark, lineHeight: 1,
                  letterSpacing: '-0.02em', marginBottom: 14,
                }}>
                  {fmtLpa(result.p20Lpa)}
                  <span style={{ fontWeight: 300, opacity: 0.3, fontSize: '55%', letterSpacing: 0 }}> – </span>
                  {fmtLpa(result.p80Lpa)}
                </div>
                <div style={{ fontSize: 12, color: C.muted, fontFamily: SANS, fontWeight: 300 }}>
                  Midpoint <span style={{ fontFamily: MONO }}>{fmtLpa(result.achievableLpa)}</span>/LPA
                </div>
              </div>

              {/* Total */}
              {result.total != null && (
                <div>
                  <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.stone, fontFamily: SANS, fontWeight: 400, marginBottom: 14 }}>
                    Total value
                  </div>
                  <div style={{
                    fontFamily: MONO, fontWeight: 400,
                    fontSize: isMobile ? 32 : 48,
                    color: C.dark, lineHeight: 1,
                    letterSpacing: '-0.02em', marginBottom: 14,
                  }}>
                    {fmt(result.totalP20)}
                    <span style={{ fontWeight: 300, opacity: 0.3, fontSize: '55%', letterSpacing: 0 }}> – </span>
                    {fmt(result.totalP80)}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: SANS, fontWeight: 300 }}>
                    Midpoint <span style={{ fontFamily: MONO }}>{fmt(result.total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recovery */}
            <div style={{
              paddingTop: 20, borderTop: `1px solid ${C.border}`,
              display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'baseline',
            }}>
              <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.stone, fontFamily: SANS, fontWeight: 400, flexShrink: 0 }}>
                Recovery scenario
              </span>
              <span style={{ fontSize: 13, color: C.ink, fontFamily: SANS, fontWeight: 300, lineHeight: 1.5 }}>
                At 2023 clearance rates:{' '}
                <span style={{ fontFamily: MONO }}>{fmtLpa(result.recoveryLpa)}/LPA</span>
                {result.totalRecovery ? <> (<span style={{ fontFamily: MONO }}>{fmt(result.totalRecovery)}</span> total)</> : ''}
                {' '}— <span style={{ fontFamily: MONO }}>{result.recoveryMult}×</span> current achievable
              </span>
            </div>
          </div>

          {/* Gated content */}
          <GatedContent subscription={subscription} authLoading={authLoading} onOpenModal={openModal} onStartCheckout={handleStripeCheckout} isMobile={isMobile}>

            {/* Market Position */}
            <div style={{ ...sectionCard, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
                <Label>Market position — bid–ask spread</Label>
                <div style={{ fontSize: 11, fontFamily: SANS, fontWeight: 300, color: result.capitulationMonths > 0 ? C.muted : C.green }}>
                  {result.capitulationMonths > 0
                    ? <><span style={{ fontFamily: MONO }}>~{result.capitulationMonths}</span> months to capitulation</>
                    : 'Sellers at market'}
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <BidAskBar buyerLpa={result.achievableLpa} sellerExpLpa={result.sellerExpLpa} gapPct={result.gapPct} />
              </div>

              <div style={{ marginBottom: 14, fontSize: 11, color: C.muted, fontFamily: SANS, fontWeight: 300 }}>
                Seller–buyer convergence
              </div>
              <ConvergenceChart
                peakLpa={result.recoveryLpa}
                sellerExpLpa={result.sellerExpLpa}
                buyerLpa={result.achievableLpa}
                decayRate={result.decayRate}
                capitulationMonths={result.capitulationMonths}
              />
              <div style={{ marginTop: 14, fontSize: 11, color: C.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.65 }}>
                Seller expectation anchored to Jan 2024 peak, decaying at{' '}
                <span style={{ fontFamily: MONO }}>{(result.decayRate * 100).toFixed(1)}%</span>/month
                (Tier {result.tier} — {result.tierLabel} sellers are{' '}
                {result.tier === 1 ? 'highly patient' : result.tier === 2 ? 'moderately patient' : 'motivated to sell'}).
                Convergence assumes static buyer willingness.
              </div>
            </div>

            {/* Two-column */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Valuation factors */}
              <div style={sectionCard}>
                <Label style={{ marginBottom: 20 }}>Valuation factors</Label>
                <FactorBar
                  label="Fundamental (liquid × age × cask)"
                  value={result.fundamentalLpa}
                  maxValue={Math.max(result.p80Lpa, result.fundamentalLpa) * 1.1}
                  color={C.green}
                  note={`${fmtLpa(result.fundamentalLpa)}/LPA`}
                />
                <FactorBar
                  label="Copula amplification (ρ = 0.72, age×rep)"
                  value={(result.copulaFactor - 1) * result.fundamentalLpa}
                  maxValue={Math.max(result.p80Lpa, result.fundamentalLpa) * 1.1}
                  color={C.stone}
                  note={`×${result.copulaFactor}`}
                />
                <FactorBar
                  label={`Beauty contest premium (compressed ${Math.round((1 - result.bcPremiumPct / 85) * 100)}%)`}
                  value={result.bcPremiumPct / 100 * result.fundamentalLpa}
                  maxValue={Math.max(result.p80Lpa, result.fundamentalLpa) * 1.1}
                  color="#7B5EA7"
                  note={`+${result.bcPremiumPct}%`}
                />
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.65 }}>
                    <span style={{ color: C.dark, fontWeight: 400 }}>Beauty contest score:</span>{' '}
                    <span style={{ fontFamily: MONO }}>{Math.round(result.beautyScore * 100)}</span> / 100.{' '}
                    In a functioning market, {result.distillery || distillery} commands a{' '}
                    <span style={{ fontFamily: MONO }}>{Math.round(result.beautyScore * 85)}%</span> reflexive premium.
                    Current market stress compresses this to{' '}
                    <span style={{ fontFamily: MONO }}>{result.bcPremiumPct}%</span>.
                  </div>
                </div>
              </div>

              {/* Cask profile */}
              <div style={sectionCard}>
                <Label style={{ marginBottom: 20 }}>Cask profile</Label>
                {[
                  { label: 'Distillery',          value: distillery,                              mono: false },
                  { label: 'Distillery tier',     value: `Tier ${result.tier} — ${result.tierLabel}`, mono: false },
                  { label: 'Age',                 value: `${result.age} years`,                  mono: true  },
                  { label: 'Cask type',           value: caskType,                               mono: false },
                  { label: 'Age multiplier',      value: `${result.ageMult}×`,                   mono: true  },
                  { label: 'Cask type multiplier',value: `${result.caskMult}×`,                  mono: true  },
                  { label: 'Liquidity',           value: result.liquidityLabel,                  mono: false },
                  { label: 'Confidence',          value: result.confidence,                      mono: false },
                  { label: 'Estimate range (±)',  value: `${result.uncertainty}%`,               mono: true  },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '8px 0', borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontSize: 12, color: C.muted, fontFamily: SANS, fontWeight: 300 }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: C.dark, fontFamily: row.mono ? MONO : SANS, fontWeight: 400 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparables */}
            {result.comparables && result.comparables.length > 0 && (
              <div style={{ ...sectionCard, padding: 0, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 0', marginBottom: 10 }}>
                  <Label>Comparable sales</Label>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 90px 90px 56px',
                  padding: '10px 20px', background: C.bg,
                  borderBottom: `1px solid ${C.border}`,
                  borderTop: `1px solid ${C.border}`,
                }}>
                  {['Distillery / Details', '£/LPA', 'Total', 'Source'].map(h => (
                    <div key={h} style={{
                      fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
                      color: C.stone, fontFamily: SANS, fontWeight: 400,
                      textAlign: h !== 'Distillery / Details' ? 'right' : 'left',
                    }}>{h}</div>
                  ))}
                </div>
                {result.comparables.map((c, i) => (
                  <ComparableRow key={i} comp={c} isLast={i === result.comparables.length - 1} />
                ))}
              </div>
            )}

            {/* Methodology */}
            <div style={{ padding: '20px 0', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: SANS, fontWeight: 300, lineHeight: 1.75 }}>
                <span style={{ color: C.ink, fontWeight: 400 }}>Methodology:</span>{' '}
                Fundamental value is derived from base £/LPA rates calibrated from{' '}
                {result.comparables?.length > 0 ? 'recent sold data' : 'tier and region benchmarks'}, scaled
                by age and cask type. A bivariate Gaussian copula (ρ = 0.72) captures the
                superlinear premium when age and distillery reputation are jointly high.
                The Keynesian beauty contest component models reflexive sentiment premium,
                compressed from its bull-market maximum by the current 97.9% reserve failure rate.
                Not investment advice. Confidence: {result.confidence}. Range ±<span style={{ fontFamily: MONO }}>{result.uncertainty}%</span>.
              </div>
            </div>

          </GatedContent>
        </div>
      )}

      {/* ── Modals ── */}
      {(modal === 'create' || modal === 'signin') && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={sub => { setSubscription(sub); setModal(null) }}
          onSwitchMode={m => setModal(m)}
          pendingValuation={modal === 'create' ? { distillery, fillYear, caskType, lpa } : null}
        />
      )}
    </div>
  )
}

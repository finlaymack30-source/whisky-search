import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

const C = {
  bg: '#FAFAF7',
  dark: '#1A1A18',
  stone: '#B8A882',
  muted: '#9A9080',
  ink: '#4A4540',
  border: '#E8E4DC',
}

const TITLE       = 'What is LPA? Whisky Cask Measurement Explained | The Bottle Keep'
const DESCRIPTION = 'LPA (Litres of Pure Alcohol) is the standard unit used to price and trade whisky casks. Learn how it is calculated, where to find it on your documents, and how it is used in cask valuation.'

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontFamily: SERIF, fontSize: 20, fontWeight: 400,
        color: C.dark, marginBottom: 14, letterSpacing: '-0.01em',
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function P({ children, style }) {
  return (
    <p style={{
      fontSize: 14, color: C.ink, fontFamily: SANS, fontWeight: 300,
      lineHeight: 1.75, marginBottom: 14, ...style,
    }}>
      {children}
    </p>
  )
}

export default function LpaPage() {
  return (
    <Layout>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://www.thebottlekeep.co.uk/what-is-lpa" />
        <link rel="canonical" href="https://www.thebottlekeep.co.uk/what-is-lpa" />
      </Helmet>

      <article style={{ maxWidth: 680, margin: '0 auto', padding: '56px 48px 96px' }}>

        <nav style={{ fontSize: 11, color: C.muted, fontFamily: SANS, fontWeight: 300, marginBottom: 32 }}>
          <Link to="/cask-valuation" style={{ color: C.muted, textDecoration: 'none' }}>Cask Valuation</Link>
          {' › '}
          <span>What is LPA?</span>
        </nav>

        <h1 style={{
          fontFamily: "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif",
          fontSize: 40, fontWeight: 500, lineHeight: 1.08,
          color: C.dark, letterSpacing: '-0.01em',
          marginBottom: 16, hyphens: 'none',
        }}>
          What is LPA?
        </h1>

        <p style={{
          fontSize: 16, color: C.muted, fontFamily: SANS, fontWeight: 300,
          lineHeight: 1.6, marginBottom: 48,
        }}>
          LPA stands for Litres of Pure Alcohol — the standard unit used by distilleries,
          brokers, warehouses and auction houses to measure and price whisky casks.
        </p>

        <Section title="How LPA is calculated">
          <P>
            LPA measures the volume of pure (100% ABV) alcohol in a cask, regardless of
            the actual fill volume. The formula is:
          </P>
          <div style={{
            background: '#F0EDE6', border: `1px solid ${C.border}`,
            padding: '18px 24px', marginBottom: 20, fontFamily: MONO,
            fontSize: 15, color: C.dark, letterSpacing: '0.02em',
          }}>
            LPA = fill volume (litres) × ABV (%) ÷ 100
          </div>
          <P>
            For example: a cask containing 250 litres at 63.5% ABV holds 158.75 LPA.
          </P>
          <P>
            ABV rises slightly during maturation as water evaporates faster than alcohol
            in some warehouse conditions, and falls in others. Your LPA figure changes
            with each re-gauge.
          </P>
        </Section>

        <Section title="Where to find your LPA">
          <P>
            Your current LPA is stated on:
          </P>
          <ul style={{ paddingLeft: 24, marginBottom: 14 }}>
            {[
              'Your warehouse receipt or regauge certificate',
              'Your delivery order (DO)',
              'Your warehouse management statement',
              'A distillery certificate of ownership, if recently issued',
            ].map((item, i) => (
              <li key={i} style={{
                fontSize: 14, color: C.ink, fontFamily: SANS, fontWeight: 300,
                lineHeight: 1.75, marginBottom: 4,
              }}>
                {item}
              </li>
            ))}
          </ul>
          <P>
            If you do not have a recent document, your warehouse can issue a regauge on
            request (there may be a small fee). Brokers typically require an up-to-date
            LPA figure before valuing or listing a cask.
          </P>
        </Section>

        <Section title="Typical LPA ranges by cask type">
          <P>
            LPA varies with cask size and fill level. Approximate typical ranges:
          </P>
          <div style={{ border: `1px solid ${C.border}`, marginBottom: 20, overflow: 'hidden' }}>
            {[
              ['Octave',       '50 – 65 LPA'],
              ['Quarter cask', '90 – 115 LPA'],
              ['Barrel',       '160 – 190 LPA'],
              ['Hogshead',     '185 – 215 LPA'],
              ['Puncheon',     '400 – 450 LPA'],
              ['Butt',         '430 – 480 LPA'],
            ].map(([type, range], i, arr) => (
              <div key={type} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                padding: '10px 16px',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.bg : '#FFFFFF',
              }}>
                <span style={{ fontSize: 13, fontFamily: SANS, fontWeight: 400, color: C.dark }}>{type}</span>
                <span style={{ fontSize: 13, fontFamily: MONO, color: C.muted }}>{range}</span>
              </div>
            ))}
          </div>
          <P style={{ fontSize: 12, color: C.muted }}>
            These are illustrative ranges only. Your actual LPA depends on fill volume,
            current ABV and any losses to evaporation since filling.
          </P>
        </Section>

        <Section title="How LPA is used in cask valuation">
          <P>
            Cask prices are almost always quoted as £ per LPA (£/LPA), which allows
            casks of different sizes to be compared directly. A price of £80/LPA on a
            200 LPA cask gives a headline figure of £16,000; the same £/LPA rate on a
            100 LPA octave gives £8,000.
          </P>
          <P>
            Auction houses, brokers and private sales all use £/LPA. When comparing
            offers or valuations, always check whether a price is quoted per LPA or as
            a total — and whether the LPA figure used is current.
          </P>
        </Section>

        <Section title="Limitations and what this tool does not cover">
          <P>
            The{' '}
            <Link to="/cask-valuation" style={{ color: C.dark, borderBottom: `1px solid ${C.border}` }}>
              cask valuation tool
            </Link>
            {' '}produces an indicative estimate only. It is not a formal appraisal and
            should not be used as the sole basis for buying, selling or insuring a cask.
          </P>
          <ul style={{ paddingLeft: 24, marginBottom: 14 }}>
            {[
              'The estimate is based on auction comparable sales data and carries material uncertainty.',
              'Condition, storage location, documentation quality and provenance can all affect realised price — none of these are captured in the model.',
              'The cask market is illiquid. Auction clearance rates have been low in 2026; a valuation does not imply a buyer exists at that price.',
              'LPA figures change over time as the cask continues to mature and evaporate. Use a current regauge for any formal transaction.',
            ].map((item, i) => (
              <li key={i} style={{
                fontSize: 14, color: C.ink, fontFamily: SANS, fontWeight: 300,
                lineHeight: 1.75, marginBottom: 8,
              }}>
                {item}
              </li>
            ))}
          </ul>
          <P style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
            For a formal appraisal, consult a regulated whisky cask broker.
            {/* TODO: add link to external regulatory body or broker directory once identified */}
          </P>
        </Section>

        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 32, marginTop: 16,
          display: 'flex', justifyContent: 'center',
        }}>
          <Link to="/cask-valuation" style={{
            display: 'inline-block', padding: '12px 28px',
            background: C.dark, color: '#F5F2EC',
            fontFamily: SANS, fontSize: 10, fontWeight: 400,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}>
            Get an indicative cask valuation
          </Link>
        </div>

      </article>
    </Layout>
  )
}

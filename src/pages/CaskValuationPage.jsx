import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'
import CaskValuator from '../components/CaskValuator'

const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"

const C = {
  bg: '#FAFAF7',
  dark: '#1A1A18',
  stone: '#B8A882',
  muted: '#9A9080',
  border: '#E8E4DC',
}

const TITLE        = 'Whisky Cask Valuation Tool — Free Indicative Estimate | The Bottle Keep'
const DESCRIPTION  = 'Free indicative whisky cask valuation built on auction comparable data. Get a data-grounded starting point — calibrated to 2026 clearance rates. Not financial advice; consult a broker for a formal appraisal.'
const DESCRIPTION2 = 'An independent indicative estimate of whisky cask value, using auction comparable sales. Only 2.1% of casks cleared reserve at auction in 2026. This free tool gives you a data-grounded starting point — not a guaranteed price.'
const KEYWORDS     = 'whisky cask valuation, cask auction data, whisky market intelligence, cask clearance rate, whisky investment'

const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Whisky Cask Valuation Tool',
  description: DESCRIPTION,
  url: 'https://www.thebottlekeep.co.uk/cask-valuation',
  isPartOf: {
    '@type': 'WebSite',
    url: 'https://www.thebottlekeep.co.uk',
  },
})

export default function CaskValuationPage() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <Layout>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="keywords" content={KEYWORDS} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION2} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.thebottlekeep.co.uk/cask-valuation" />
        <meta property="og:image" content="https://www.thebottlekeep.co.uk/logo.svg" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION2} />
        <script type="application/ld+json">{JSON_LD}</script>
        <link rel="canonical" href="https://www.thebottlekeep.co.uk/cask-valuation" />
      </Helmet>

      <section style={{ background: C.bg, minHeight: 'calc(100vh - 92px)' }}>
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: isMobile ? '40px 24px 0' : '56px 48px 0',
        }}>
          <h1 style={{
            fontFamily: "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif",
            fontSize: isMobile ? 38 : 48,
            fontWeight: 500, lineHeight: 1.05,
            color: C.dark, letterSpacing: '-0.01em',
            marginBottom: 12, hyphens: 'none',
            textAlign: 'center',
          }}>
            What is my cask worth?
          </h1>
          <p style={{
            fontSize: 15, color: '#6B6B68', fontFamily: SANS, fontWeight: 300,
            lineHeight: 1.5, margin: '0 0 32px', textAlign: 'center',
          }}>
            An independent estimate based on live auction clearance data. Free, 30 seconds, no account needed.
          </p>
          <CaskValuator isMobile={isMobile} />
        </div>
      </section>
    </Layout>
  )
}

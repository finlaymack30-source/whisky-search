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

const TITLE        = 'Whisky Cask Valuation Tool — Free Estimate | The Bottle Keep'
const DESCRIPTION  = 'Free whisky cask valuation tool calibrated to live auction data. See what your cask is worth in the current market — 2.1% clearance rate, 97.9% reserve failure. Instant estimate.'
const DESCRIPTION2 = 'Independent whisky cask valuation tool built on auction data. With a 30% bid–ask gap and only 2.1% of casks clearing at auction in 2026, knowing your cask\'s real market value matters. Free to use.'
const KEYWORDS     = 'whisky cask valuation, cask auction data, whisky market intelligence, cask clearance rate, whisky investment'

const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FinancialProduct',
  name: 'Whisky Cask Valuation Tool',
  description: DESCRIPTION,
  url: 'https://www.thebottlekeep.co.uk/cask-valuation',
  provider: {
    '@type': 'Organization',
    name: 'The Bottle Keep',
    url: 'https://www.thebottlekeep.co.uk',
  },
})

export default function CaskValuationPage() {
  const [isMobile, setIsMobile]             = useState(() => window.innerWidth < 768)
  const [caskHasResult, setCaskHasResult]   = useState(false)

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
      </Helmet>

      <h1 style={{
        position: 'absolute', width: 1, height: 1,
        padding: 0, margin: -1, overflow: 'hidden',
        clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Whisky Cask Valuation Tool — Independent Market Data
      </h1>

      <section style={{ background: C.bg, minHeight: 'calc(100vh - 92px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: isMobile ? '40px 24px 80px' : '56px 48px 100px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: (caskHasResult || isMobile) ? '1fr' : '11fr 9fr',
            gap: (caskHasResult || isMobile) ? 0 : 52,
            alignItems: 'start',
            flex: 1,
          }}>
            <div>
              <h1 style={{
                fontFamily: "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif",
                fontSize: isMobile ? 38 : 48,
                fontWeight: 500, lineHeight: 1.05,
                color: C.dark, letterSpacing: '-0.01em',
                marginBottom: 16, hyphens: 'none',
                whiteSpace: isMobile ? 'normal' : 'nowrap',
              }}>
                What is my cask worth?
              </h1>
              <CaskValuator isMobile={isMobile} onResult={() => setCaskHasResult(true)} />
            </div>

            {!caskHasResult && (
              <div style={{
                paddingLeft: isMobile ? 0 : 56,
                marginTop: isMobile ? 40 : 0,
                borderTop: isMobile ? `1px solid ${C.border}` : 'none',
              }}>
                {[
                  {
                    label: 'Bid–Ask Gap',
                    value: '30%',
                    valueColor: C.dark,
                    descriptor: 'Buyer willingness versus seller expectation, May 2026',
                  },
                  {
                    label: 'Clearance Rate',
                    value: '2.1%',
                    valueColor: C.dark,
                    descriptor: 'Casks finding a buyer at auction, YTD 2026',
                  },
                  {
                    label: 'Market Status',
                    value: 'Critical',
                    valueColor: '#724230',
                    descriptor: 'Deteriorating since Q3 2023',
                  },
                ].map((stat) => (
                  <div key={stat.label} style={{ padding: '20px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{
                      fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
                      fontFamily: SANS, color: C.stone, fontWeight: 400, marginBottom: 10,
                    }}>
                      {stat.label}
                    </div>
                    <div style={{
                      fontFamily: "'DM Mono', 'IBM Plex Mono', monospace",
                      fontSize: 44, fontWeight: 400,
                      color: stat.valueColor, lineHeight: 1,
                      letterSpacing: 0, marginBottom: 6,
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontSize: 11, fontFamily: SANS, fontWeight: 300,
                      color: C.muted, lineHeight: 1.45,
                    }}>
                      {stat.descriptor}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>
    </Layout>
  )
}

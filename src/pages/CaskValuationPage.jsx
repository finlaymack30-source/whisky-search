import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'
import CaskValuator from '../components/CaskValuator'

const SANS  = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"
const MONO  = "'DM Mono', 'IBM Plex Mono', 'Roboto Mono', monospace"
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"

const C = {
  bg: '#FAFAF7',
  dark: '#1A1A18',
  stone: '#B8A882',
  muted: '#9A9080',
  border: '#E8E4DC',
}

const TITLE       = 'Whisky Cask Valuation — The Bottle Keep'
const DESCRIPTION = 'Independent cask valuation model calibrated to live auction data. Understand what your whisky cask is worth in the current market — 97.9% reserve failure rate, 2.1% clearance. Free to try.'

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
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script type="application/ld+json">{JSON_LD}</script>
      </Helmet>

      <section style={{ background: C.bg, minHeight: 'calc(100vh - 60px)' }}>
        <div style={{
          padding: isMobile ? '40px 24px 80px' : '56px 48px 100px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: (caskHasResult || isMobile) ? '1fr' : '11fr 9fr',
            gap: (caskHasResult || isMobile) ? 0 : 52,
            alignItems: 'start',
          }}>
            <div>
              <h1 style={{
                fontFamily: "'Freight Display Pro', 'Freight Display', Canela, Georgia, serif",
                fontSize: isMobile ? 38 : 48,
                fontWeight: 500, lineHeight: 1.05,
                color: C.dark, letterSpacing: '-0.01em',
                marginBottom: 32, hyphens: 'none',
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

          {!caskHasResult && (
            <div style={{
              marginTop: 64,
              borderTop: `1px solid ${C.border}`,
              borderBottom: `1px solid ${C.border}`,
              padding: '26px 0',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: SERIF,
                fontSize: isMobile ? 17 : 20,
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'rgba(74,69,64,0.40)',
                lineHeight: 1.6,
                maxWidth: 600,
                margin: '0 auto',
              }}>
                The cask market has not functioned normally since Q3 2023.<br />
                This year, the average lot listed at auction has failed to sell.
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  )
}

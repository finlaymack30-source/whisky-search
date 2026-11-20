import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const SANS = "'DM Sans', 'Libre Franklin', system-ui, sans-serif"

export default function NotFoundPage() {
  return (
    <Layout>
      <Helmet>
        <title>Page not found | The Bottle Keep</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div style={{
        maxWidth: 480, margin: '0 auto',
        padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A9080', fontFamily: SANS, fontWeight: 400, marginBottom: 20 }}>
          404
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 400, color: '#1A1A18', fontFamily: SANS, marginBottom: 16 }}>
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: '#6B6B68', fontFamily: SANS, fontWeight: 300, lineHeight: 1.6, marginBottom: 32 }}>
          This URL doesn't exist. The page may have moved or been removed.
        </p>
        <Link to="/cask-valuation" style={{
          display: 'inline-block', padding: '12px 28px',
          background: '#1A1A18', color: '#F5F2EC',
          fontFamily: SANS, fontSize: 10, fontWeight: 400,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          textDecoration: 'none',
        }}>
          Go to cask valuation
        </Link>
      </div>
    </Layout>
  )
}

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ReactGA from 'react-ga4'
import CaskValuationPage from './pages/CaskValuationPage'
import MarketReportPage from './pages/MarketReportPage'
import DistilleryIndexPage from './pages/DistilleryIndexPage'

ReactGA.initialize('G-7Y0762LEJV')

function Analytics() {
  const location = useLocation()
  useEffect(() => {
    ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search })
  }, [location])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        <Route path="/" element={<Navigate to="/cask-valuation" replace />} />
        <Route path="/cask-valuation" element={<CaskValuationPage />} />
        <Route path="/market-report"      element={<MarketReportPage />} />
        <Route path="/distillery-index"   element={<DistilleryIndexPage />} />
      </Routes>
    </BrowserRouter>
  )
}

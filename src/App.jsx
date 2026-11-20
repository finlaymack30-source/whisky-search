import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import ReactGA from 'react-ga4'
import CaskValuationPage from './pages/CaskValuationPage'
import LpaPage from './pages/LpaPage'
import NotFoundPage from './pages/NotFoundPage'

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
        <Route path="/cask-valuation" element={<CaskValuationPage />} />
        <Route path="/what-is-lpa"    element={<LpaPage />} />
        <Route path="*"               element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

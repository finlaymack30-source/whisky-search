import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CaskValuationPage from './pages/CaskValuationPage'
import MarketReportPage from './pages/MarketReportPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cask-valuation" replace />} />
        <Route path="/cask-valuation" element={<CaskValuationPage />} />
        <Route path="/market-report"  element={<MarketReportPage />} />
      </Routes>
    </BrowserRouter>
  )
}

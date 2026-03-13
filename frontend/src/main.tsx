import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import LandingPage from './pages/LandingPage.tsx'
import BrainstormPage from './pages/BrainstormPage.tsx'
import SharePage from './pages/SharePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/brainstorm" element={<BrainstormPage />} />
        <Route path="/share/:shareToken" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)

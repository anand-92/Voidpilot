import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import LandingPage from './pages/LandingPage.tsx'
import BrainstormPage from './pages/BrainstormPage.tsx'

const isElectron = /electron/i.test(navigator.userAgent.toLowerCase()) || window.electronAPI !== undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {isElectron ? (
          <>
            <Route path="/" element={<App />} />
            <Route path="/brainstorm" element={<BrainstormPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/brainstorm" element={<BrainstormPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </HashRouter>
  </StrictMode>,
)

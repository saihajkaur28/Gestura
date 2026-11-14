import { useState } from 'react'
import './App.css'
import BackendStatus from './components/BackendStatus'
import Dashboard from './pages/Dashboard'
import SignToText from './pages/SignToText'
import TextToSign from './pages/TextToSign'
import { NAV_ITEMS } from './navigation'
import type { Page } from './navigation'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  'sign-to-text': 'Sign → Text',
  'text-to-sign': 'Text → Sign',
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            O
          </span>
          <div>
            <span className="brand-name">OUTLOUD</span>
            <span className="brand-sub">Indian Sign Language</span>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
              aria-current={page === item.id ? 'page' : undefined}
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-desc">{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <BackendStatus />
          <p className="phase-tag">Phase 1 · Landmark detection only</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">{PAGE_TITLES[page]}</span>
          <span className="topbar-note">No sign recognition in Phase 1</span>
        </header>
        <main className="content">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'sign-to-text' && <SignToText />}
          {page === 'text-to-sign' && <TextToSign />}
        </main>
      </div>
    </div>
  )
}

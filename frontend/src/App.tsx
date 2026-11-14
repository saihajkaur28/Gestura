import { useState } from 'react'
import { Hand, Home, LayoutDashboard, Type } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './App.css'
import BackendStatus from './components/BackendStatus'
import ThemeToggle from './components/ThemeToggle'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import SignToText from './pages/SignToText'
import TextToSign from './pages/TextToSign'
import { useTheme } from './hooks/useTheme'
import { NAV_ITEMS } from './navigation'
import type { Page } from './navigation'

type View = 'landing' | Page

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  'sign-to-text': 'Sign → Text',
  'text-to-sign': 'Text → Sign',
}

const NAV_ICONS: Record<Page, LucideIcon> = {
  dashboard: LayoutDashboard,
  'sign-to-text': Hand,
  'text-to-sign': Type,
}

export default function App() {
  const [view, setView] = useState<View>('landing')
  const { theme, toggleTheme } = useTheme()

  if (view === 'landing') {
    return <Landing onOpen={(next) => setView(next)} theme={theme} onToggleTheme={toggleTheme} />
  }

  const page = view

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Hand size={20} strokeWidth={1.8} />
          </span>
          <div>
            <span className="brand-name">GESTURA</span>
            <span className="brand-sub">Indian Sign Language</span>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          <button type="button" className="nav-item" onClick={() => setView('landing')}>
            <span className="nav-icon" aria-hidden="true">
              <Home size={17} strokeWidth={1.8} />
            </span>
            <span className="nav-label">Home</span>
          </button>
          <div className="nav-divider" aria-hidden="true" />
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id]
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => setView(item.id)}
                aria-current={page === item.id ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <BackendStatus />
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">{PAGE_TITLES[page]}</span>
          <div className="topbar-actions">
            <span className="topbar-note">Indian Sign Language</span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button type="button" className="icon-btn" onClick={() => setView('landing')}>
              <Home size={15} strokeWidth={1.9} />
              Home
            </button>
          </div>
        </header>
        <main className="content">
          {page === 'dashboard' && <Dashboard onNavigate={setView} />}
          {page === 'sign-to-text' && <SignToText />}
          {page === 'text-to-sign' && <TextToSign />}
        </main>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { GraduationCap, Hand, Home, LayoutDashboard, LogIn, LogOut, Type } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './App.css'
import BackendStatus from './components/BackendStatus'
import ThemeToggle from './components/ThemeToggle'
import AccessibilityToggle from './components/AccessibilityToggle'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import SignToText from './pages/SignToText'
import TextToSign from './pages/TextToSign'
import Learn from './pages/Learn'
import Auth from './pages/Auth'
import { useTheme } from './hooks/useTheme'
import { useHighContrast } from './hooks/useHighContrast'
import { useAuth } from './hooks/useAuth'
import { NAV_ITEMS } from './navigation'
import type { Page } from './navigation'

type View = 'landing' | 'auth' | Page

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  'sign-to-text': 'Sign → Text',
  'text-to-sign': 'Text → Sign',
  learn: 'Learn ASL',
}

const NAV_ICONS: Record<Page, LucideIcon> = {
  dashboard: LayoutDashboard,
  'sign-to-text': Hand,
  'text-to-sign': Type,
  learn: GraduationCap,
}

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [authPrompt, setAuthPrompt] = useState<string | null>(null)
  const { theme, toggleTheme } = useTheme()
  const { highContrast, toggleHighContrast } = useHighContrast()
  const { user, loading, isAuthenticated, signOut } = useAuth()

  // Route protection: redirect unauthenticated users if on protected pages
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (view === 'dashboard' || view === 'sign-to-text' || view === 'text-to-sign' || view === 'learn') {
        setAuthPrompt('Please sign in to access your GESTURA workspace.')
        setView('auth')
      }
    }
  }, [loading, isAuthenticated, view])

  // Navigation handler with protection guard
  const navigateTo = (nextView: View, promptMessage?: string) => {
    if (nextView !== 'landing' && nextView !== 'auth' && !isAuthenticated && !loading) {
      setAuthPrompt(promptMessage || 'Please sign in to access this feature.')
      setView('auth')
      return
    }
    setAuthPrompt(null)
    setView(nextView)
  }

  // Handle Landing Page
  if (view === 'landing') {
    return (
      <Landing
        onOpen={(next) => navigateTo(next)}
        onOpenAuth={() => {
          setAuthPrompt(null)
          setView('auth')
        }}
        isAuthenticated={isAuthenticated}
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || null}
        onSignOut={async () => {
          await signOut()
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        highContrast={highContrast}
        onToggleHighContrast={toggleHighContrast}
      />
    )
  }

  // Handle Auth Page (Login / Sign Up / Forgot Password)
  if (view === 'auth') {
    if (isAuthenticated) {
      // Authenticated users go straight to dashboard
      return (
        <Dashboard
          onNavigate={(next) => navigateTo(next)}
        />
      )
    }

    return (
      <Auth
        initialMode="login"
        theme={theme}
        onToggleTheme={toggleTheme}
        highContrast={highContrast}
        onToggleHighContrast={toggleHighContrast}
        onSuccess={() => {
          setAuthPrompt(null)
          setView('dashboard')
        }}
        onBackToHome={() => {
          setAuthPrompt(null)
          setView('landing')
        }}
        promptMessage={authPrompt}
      />
    )
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
            <span className="brand-sub">American Sign Language</span>
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
                onClick={() => navigateTo(item.id)}
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
          {isAuthenticated && user && (
            <div className="user-profile-badge">
              <span className="user-avatar-circle">
                {(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
              <div className="user-profile-info">
                <span className="user-profile-name">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <span className="user-profile-email">{user.email}</span>
              </div>
            </div>
          )}
          <BackendStatus />
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">{PAGE_TITLES[page]}</span>
          <div className="topbar-actions">
            <span className="topbar-note">American Sign Language</span>
            <AccessibilityToggle
              highContrast={highContrast}
              onToggle={toggleHighContrast}
              showFullLabel={false}
            />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {isAuthenticated ? (
              <button
                type="button"
                className="logout-btn"
                onClick={async () => {
                  await signOut()
                  setView('landing')
                }}
                title="Log out of GESTURA"
              >
                <LogOut size={14} strokeWidth={1.9} />
                Log out
              </button>
            ) : (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setView('auth')}
              >
                <LogIn size={15} strokeWidth={1.9} />
                Sign in
              </button>
            )}
            <button type="button" className="icon-btn" onClick={() => setView('landing')}>
              <Home size={15} strokeWidth={1.9} />
              Home
            </button>
          </div>
        </header>
        <main className="content">
          {page === 'dashboard' && <Dashboard onNavigate={(next) => navigateTo(next)} />}
          {page === 'sign-to-text' && <SignToText />}
          {page === 'text-to-sign' && <TextToSign />}
          {page === 'learn' && <Learn />}
        </main>
      </div>
    </div>
  )
}


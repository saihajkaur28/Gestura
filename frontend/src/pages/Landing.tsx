import {
  ArrowRight,
  Check,
  GraduationCap,
  Hand,
  LogIn,
  LogOut,
  MessageSquareText,
  Play,
  ShieldCheck,
  Sparkles,
  Type,
  Video,
  Waves,
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import AccessibilityToggle from '../components/AccessibilityToggle'
import type { Theme } from '../hooks/useTheme'
import type { Page } from '../navigation'

interface LandingProps {
  onOpen: (page: Page) => void
  onOpenAuth?: () => void
  isAuthenticated?: boolean
  userName?: string | null
  onSignOut?: () => void
  theme: Theme
  onToggleTheme: () => void
  highContrast?: boolean
  onToggleHighContrast?: () => void
}

export default function Landing({
  onOpen,
  onOpenAuth,
  isAuthenticated = false,
  userName = null,
  onSignOut,
  theme,
  onToggleTheme,
  highContrast = false,
  onToggleHighContrast,
}: LandingProps) {
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="landing-brand" href="#home" aria-label="Gestura home">
          <span className="brand-mark" aria-hidden="true">
            <Hand size={20} strokeWidth={1.8} />
          </span>
          <span className="landing-brand-name">GESTURA</span>
        </a>

        <nav className="landing-nav" aria-label="Landing">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>

        <div className="landing-actions">
          {onToggleHighContrast && (
            <AccessibilityToggle
              highContrast={highContrast}
              onToggle={onToggleHighContrast}
              showFullLabel={false}
            />
          )}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onOpen('dashboard')}
              >
                Dashboard
                <ArrowRight size={15} strokeWidth={2} />
              </button>
              {onSignOut && (
                <button
                  type="button"
                  className="logout-btn"
                  onClick={onSignOut}
                  title={`Signed in as ${userName || 'user'}`}
                >
                  <LogOut size={14} />
                  Log out
                </button>
              )}
            </>
          ) : (
            <>
              {onOpenAuth && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onOpenAuth}
                >
                  <LogIn size={15} strokeWidth={1.8} />
                  Sign in
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => (onOpenAuth ? onOpenAuth() : onOpen('dashboard'))}
              >
                Get started
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </header>


      <main className="landing-main" id="home">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={13} strokeWidth={2} />
              Bidirectional ASL platform
            </span>
            <h1 className="hero-title">
              Communication that flows <em>both ways</em>.
            </h1>
            <p className="hero-text">
              Gestura bridges American Sign Language and spoken language. Turn signing into
              readable text and speech, then turn written words back into expressive sign
              animations — in one calm, accessible workspace.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => onOpen('sign-to-text')}
              >
                <Hand size={17} strokeWidth={2} />
                Sign to Speech
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => onOpen('text-to-sign')}
              >
                <Type size={17} strokeWidth={2} />
                Text to Sign
              </button>
            </div>

            <div className="hero-trust">
              <span>
                <ShieldCheck size={14} strokeWidth={2} /> On-device hand tracking
              </span>
              <span>
                <Waves size={14} strokeWidth={2} /> Real-time recognition
              </span>
              <span>
                <Check size={14} strokeWidth={2} /> Accessible by design
              </span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="avatar-orb">
              <span className="avatar-ring" />
              <span className="avatar-ring inner" />
              <div className="avatar-core">
                <Hand size={72} strokeWidth={1.4} />
              </div>
            </div>
            <span className="avatar-chip chip-a">
              <MessageSquareText size={14} strokeWidth={2} />
              Sign recognised
            </span>
            <span className="avatar-chip chip-b">
              <Play size={13} strokeWidth={2} />
              3D signing avatar
            </span>
            <span className="avatar-chip chip-c">
              <Waves size={14} strokeWidth={2} />
              Live speech
            </span>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-heading">
            <span className="section-eyebrow">Three ways to connect</span>
            <h2 className="section-title">Built around how people actually communicate.</h2>
            <p className="section-subtitle">
              Each mode is designed to feel simple on the surface, while the recognition and
              playback engines do the careful work underneath.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-header">
                <span className="feature-icon" aria-hidden="true">
                  <Hand size={22} strokeWidth={1.7} />
                </span>
                <span className="feature-tag">Live</span>
              </div>
              <h3>SIGN TO SPEECH</h3>
              <p>
                Convert American Sign Language gestures into readable text and speech, with
                on-screen confidence as you sign.
              </p>
              <button
                type="button"
                className="feature-link"
                onClick={() => onOpen('sign-to-text')}
              >
                Open Sign to Speech <ArrowRight size={14} strokeWidth={2} />
              </button>
            </article>

            <article className="feature-card">
              <div className="feature-header">
                <span className="feature-icon" aria-hidden="true">
                  <Type size={22} strokeWidth={1.7} />
                </span>
                <span className="feature-tag">Live</span>
              </div>
              <h3>TEXT TO SIGN</h3>
              <p>
                Convert written text into animated American Sign Language, played back as a
                clear, synchronised sign sequence.
              </p>
              <button
                type="button"
                className="feature-link"
                onClick={() => onOpen('text-to-sign')}
              >
                Open Text to Sign <ArrowRight size={14} strokeWidth={2} />
              </button>
            </article>

            <article className="feature-card">
              <div className="feature-header">
                <span className="feature-icon" aria-hidden="true">
                  <GraduationCap size={22} strokeWidth={1.7} />
                </span>
                <span className="feature-tag">New</span>
              </div>
              <h3>LEARN ASL</h3>
              <p>
                Master all 26 manual alphabet letters, 5 core everyday words, and 5 complete sentences
                with authentic demonstrations and slow-motion speed controls.
              </p>
              <button
                type="button"
                className="feature-link"
                onClick={() => onOpen('learn')}
              >
                Open Learn ASL <ArrowRight size={14} strokeWidth={2} />
              </button>
            </article>

            <article className="feature-card disabled">
              <div className="feature-header">
                <span className="feature-icon" aria-hidden="true">
                  <Video size={22} strokeWidth={1.7} />
                </span>
                <span className="feature-tag soon">Coming soon</span>
              </div>
              <h3>VIDEO TO SIGN</h3>
              <p>
                Convert video dialogue into synchronised sign-language avatar animations, as
                the platform grows.
              </p>
              <button type="button" className="feature-link" disabled>
                In development <ArrowRight size={14} strokeWidth={2} />
              </button>
            </article>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="section-heading">
            <span className="section-eyebrow">About Gestura</span>
            <h2 className="section-title">Accessibility, without the friction.</h2>
            <p className="section-subtitle">
              Gestura is a bidirectional American Sign Language communication platform. It pairs
              privacy-friendly hand tracking with familiar, readable interfaces so that signing
              and reading never feel like a separate task.
            </p>
          </div>

          <div className="about-grid">
            <div className="about-stat">
              <strong>Bidirectional</strong>
              <span>Sign to speech and text to sign in a single, consistent workspace.</span>
            </div>
            <div className="about-stat">
              <strong>On-device</strong>
              <span>Hand landmarks are processed locally in the browser for privacy.</span>
            </div>
            <div className="about-stat">
              <strong>Calm by default</strong>
              <span>Minimal layouts, gentle contrast and clear controls reduce cognitive load.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p>GESTURA — bidirectional American Sign Language communication.</p>
          <div className="landing-footer-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <button type="button" className="btn btn-ghost" onClick={() => onOpen('dashboard')}>
              Open workspace <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

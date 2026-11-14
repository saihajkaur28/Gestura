import { useEffect, useState } from 'react'
import { ArrowRight, Hand, MessageSquareText, Type, Video, Waves } from 'lucide-react'
import { fetchHealth, fetchSigns } from '../lib/api'
import type { SignInfo } from '../lib/api'
import type { Page } from '../navigation'

interface DashboardProps {
  onNavigate: (page: Page) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [signs, setSigns] = useState<SignInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [, signsData] = await Promise.all([fetchHealth(), fetchSigns()])
        if (cancelled) return
        setSigns(signsData.signs)
        setError(null)
      } catch (loadError) {
        if (cancelled) return
        console.warn('[api] Dashboard data could not be loaded.', loadError)
        setError(loadError instanceof Error ? loadError.message : String(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const apiState = loading ? 'checking' : error ? 'offline' : 'online'

  return (
    <section className="page">
      <div className="hero dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">
            <Waves size={13} strokeWidth={2} />
            Welcome back
          </span>
          <h1>GESTURA</h1>
          <p>
            A calm, bidirectional workspace for Indian Sign Language. Choose a mode below to
            start converting between signing, text and speech.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('sign-to-text')}
            >
              <Hand size={16} strokeWidth={2} />
              Sign to Speech
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('text-to-sign')}
            >
              <Type size={16} strokeWidth={2} />
              Text to Sign
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Backend API</div>
          <div
            className={`stat-value ${
              apiState === 'online' ? 'ok' : apiState === 'offline' ? 'error' : 'warn'
            }`}
          >
            {apiState}
          </div>
          <div className="stat-detail">Live service health</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ISL clips loaded</div>
          <div className="stat-value">{loading ? '—' : signs.length}</div>
          <div className="stat-detail">Available sign videos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recognition</div>
          <div className="stat-value warn">Model-dependent</div>
          <div className="stat-detail">On-device landmark engine</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Landmark detection</div>
          <div className="stat-value ok">Available</div>
          <div className="stat-detail">MediaPipe hand tracking</div>
        </div>
      </div>

      {error && (
        <p className="error-text" role="alert">
          Backend request failed: {error}. Start the API and check VITE_API_BASE_URL.
        </p>
      )}

      <div className="feature-grid">
        <div className="card mode-card">
          <span className="mode-icon" aria-hidden="true">
            <MessageSquareText size={21} strokeWidth={1.7} />
          </span>
          <h3>Sign → Text</h3>
          <p>Recognise Indian Sign Language gestures as readable text and speech.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('sign-to-text')}
          >
            Open landmark capture
            <ArrowRight size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="card mode-card">
          <span className="mode-icon" aria-hidden="true">
            <Type size={21} strokeWidth={1.7} />
          </span>
          <h3>Text → Sign</h3>
          <p>Turn written words into a synchronised Indian Sign Language sequence.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('text-to-sign')}
          >
            Open video retrieval
            <ArrowRight size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="card mode-card">
          <span className="mode-icon" aria-hidden="true">
            <Video size={21} strokeWidth={1.7} />
          </span>
          <h3>Video → Sign</h3>
          <p>Convert video dialogue into synchronised sign avatar animations.</p>
          <button type="button" className="btn btn-secondary" disabled>
            Coming soon
          </button>
        </div>
      </div>
    </section>
  )
}

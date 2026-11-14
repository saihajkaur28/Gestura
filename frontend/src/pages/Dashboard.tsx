import { useEffect, useState } from 'react'
import { fetchHealth, fetchSigns } from '../lib/api'
import type { HealthResponse, SignInfo } from '../lib/api'
import type { Page } from '../navigation'

interface DashboardProps {
  onNavigate: (page: Page) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [signs, setSigns] = useState<SignInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [healthData, signsData] = await Promise.all([fetchHealth(), fetchSigns()])
        if (cancelled) return
        setHealth(healthData)
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
      <div className="hero">
        <span className="eyebrow">Bidirectional Indian Sign Language</span>
        <h1>OUTLOUD</h1>
        <p>
          A communication platform for Indian Sign Language (ISL). Phase 1 establishes the
          application shell, real browser-side hand landmark detection, and an ISL video
          retrieval loader. Sign recognition is intentionally not implemented yet.
        </p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Backend API</div>
          <div className={`stat-value ${apiState === 'online' ? 'ok' : apiState === 'offline' ? 'error' : 'warn'}`}>
            {apiState}
          </div>
          <div className="stat-detail">{health ? `${health.app} v${health.version}` : 'Not reachable yet'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ISL clips loaded</div>
          <div className="stat-value">{loading ? '—' : signs.length}</div>
          <div className="stat-detail">
            {signs.length === 0 ? 'No videos provided yet' : 'Signs with an available clip'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recognition</div>
          <div className="stat-value warn">Not implemented</div>
          <div className="stat-detail">Planned for a later phase</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Landmark detection</div>
          <div className="stat-value ok">Available</div>
          <div className="stat-detail">MediaPipe Hands, browser-side</div>
        </div>
      </div>

      {error && (
        <p className="error-text" role="alert">
          Backend request failed: {error}. Start the API and check VITE_API_BASE_URL.
        </p>
      )}

      <div className="grid two-col">
        <div className="card mode-card">
          <h3>Sign → Text</h3>
          <p>
            Open the webcam and inspect live hand landmark detection. This demonstrates the
            capture pipeline only; no sign is recognised and no text is generated.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('sign-to-text')}>
            Open landmark capture
          </button>
        </div>
        <div className="card mode-card">
          <h3>Text → Sign</h3>
          <p>
            Type words or phrases and retrieve the matching pre-recorded ISL clip. Only signs
            present in your provided video folder are shown; missing signs are reported honestly.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('text-to-sign')}>
            Open video retrieval
          </button>
        </div>
      </div>

      <div className="notice">
        <strong>Scope honesty:</strong> Phase 1 does not translate ISL, does not claim full ISL
        coverage, and does not fabricate videos, predictions or accuracy figures.
      </div>
    </section>
  )
}

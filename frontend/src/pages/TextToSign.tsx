import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchSigns, resolveMediaUrl } from '../lib/api'
import type { SignInfo } from '../lib/api'
import { segmentText } from '../lib/segments'

export default function TextToSign() {
  const [signs, setSigns] = useState<SignInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await fetchSigns()
      setSigns(data.signs)
      setError(null)
    } catch (loadError) {
      console.warn('[api] Could not load the sign list.', loadError)
      setSigns([])
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function runLoad() {
      try {
        const data = await fetchSigns()
        if (cancelled) return
        setSigns(data.signs)
        setError(null)
      } catch (loadError) {
        if (cancelled) return
        console.warn('[api] Could not load the sign list.', loadError)
        setSigns([])
        setError(loadError instanceof Error ? loadError.message : String(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void runLoad()
    return () => {
      cancelled = true
    }
  }, [])

  const segments = useMemo(() => segmentText(text, signs), [text, signs])

  const appendSign = (sign: SignInfo) => {
    const words = sign.sign.replace(/_/g, ' ')
    setText((current) => (current.trim() ? `${current.trim()} ${words}` : words))
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Text → Sign</h1>
          <p className="page-subtitle">
            Retrieves pre-recorded ISL clips for the signs you provide. This is video retrieval,
            not sign synthesis, and it only covers the available vocabulary.
          </p>
        </div>
        <span className={`status-pill ${signs.length > 0 ? 'ok' : ''}`}>
          {loading ? 'Loading…' : `${signs.length} sign${signs.length === 1 ? '' : 's'} available`}
        </span>
      </header>

      <div className="notice">
        <strong>Limited vocabulary:</strong> only signs present in your video folder can be shown.
        Words without a clip are reported as unavailable and are never replaced with another sign
        or fabricated content.
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Available signs</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setLoading(true)
              void load()
            }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading && <p className="hint">Loading the sign list from the backend…</p>}

        {!loading && error && (
          <>
            <p className="error-text" role="alert">
              Could not load signs: {error}
            </p>
            <p className="hint">
              Check that the FastAPI backend is running and that VITE_API_BASE_URL is correct.
            </p>
          </>
        )}

        {!loading && !error && signs.length === 0 && (
          <div className="empty-state">
            No ISL videos are loaded yet. Add clips using this structure, then press Refresh:
            <pre>{`videos/
  hello/
    hello.mp4
  water/
    water.mp4`}</pre>
          </div>
        )}

        {!loading && !error && signs.length > 0 && (
          <div className="chips">
            {signs.map((sign) => (
              <button
                key={sign.sign}
                type="button"
                className="chip"
                onClick={() => appendSign(sign)}
              >
                {sign.sign.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="sign-input">Text to convert</label>
          <textarea
            id="sign-input"
            className="text-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="e.g. hello water help"
            rows={3}
          />
        </div>
        <div className="button-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setText('')}
            disabled={text.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Sequence</h2>
        {text.trim() === '' ? (
          <p className="hint">Type a phrase or pick a sign above to see the available ISL clips.</p>
        ) : (
          <div className="sequence">
            {segments.map((segment, index) =>
              segment.sign ? (
                <figure className="sign-card" key={`${segment.text}-${index}`}>
                  <video
                    className="sign-video"
                    src={resolveMediaUrl(segment.sign.video_url)}
                    controls
                    playsInline
                    preload="metadata"
                  />
                  <figcaption>
                    <span>{segment.text}</span>
                    <span className="sign-key">/{segment.sign.sign}</span>
                  </figcaption>
                </figure>
              ) : (
                <div className="sign-card missing" key={`${segment.text}-${index}`}>
                  <div className="missing-body">
                    <span className="missing-label">{segment.text}</span>
                    <span className="missing-note">No ISL video available for this word</span>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}

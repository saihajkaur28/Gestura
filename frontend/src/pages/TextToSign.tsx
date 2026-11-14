import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Gauge,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Type,
  Video,
} from 'lucide-react'
import { fetchSigns, resolveMediaUrl } from '../lib/api'
import type { SignInfo } from '../lib/api'
import { segmentText } from '../lib/segments'

const SPEEDS = [0.75, 1, 1.25, 1.5]

export default function TextToSign() {
  const [signs, setSigns] = useState<SignInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const videoRef = useRef<HTMLVideoElement | null>(null)

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

  const playableIndices = useMemo(
    () =>
      segments.reduce<number[]>((indices, segment, index) => {
        if (segment.sign) indices.push(index)
        return indices
      }, []),
    [segments],
  )

  useEffect(() => {
    setPlaying(false)
    setActiveIndex(playableIndices[0] ?? -1)
  }, [playableIndices, text])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = speed
    if (playing) {
      void video.play().catch(() => setPlaying(false))
    } else {
      video.pause()
    }
  }, [playing, activeIndex, speed])

  const appendSign = (sign: SignInfo) => {
    const words = sign.sign.replace(/_/g, ' ')
    setText((current) => (current.trim() ? `${current.trim()} ${words}` : words))
  }

  const activeSegment = activeIndex >= 0 ? segments[activeIndex] : undefined

  const handleEnded = useCallback(() => {
    const next = playableIndices.find((index) => index > activeIndex)
    if (next === undefined) {
      setPlaying(false)
      return
    }
    setActiveIndex(next)
  }, [activeIndex, playableIndices])

  const togglePlay = useCallback(() => {
    if (!segments.some((segment) => segment.sign)) return
    if (playing) {
      setPlaying(false)
      return
    }
    if (activeIndex < 0 || !segments[activeIndex]?.sign) {
      setActiveIndex(playableIndices[0] ?? -1)
    }
    setPlaying(true)
  }, [activeIndex, playableIndices, playing, segments])

  const replay = useCallback(() => {
    if (playableIndices.length === 0) return
    if (activeIndex === playableIndices[0]) {
      const video = videoRef.current
      if (video) video.currentTime = 0
    }
    setActiveIndex(playableIndices[0])
    setPlaying(true)
  }, [activeIndex, playableIndices])

  const jumpTo = (index: number) => {
    setActiveIndex(index)
    setPlaying(Boolean(segments[index]?.sign))
  }

  const playPosition = playableIndices.indexOf(activeIndex)
  const hasText = text.trim() !== ''

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Text → Sign</h1>
          <p className="page-subtitle">
            Type or select words, then watch them played back as a synchronised Indian Sign
            Language sequence.
          </p>
        </div>
        <span className={`status-pill ${signs.length > 0 ? 'ok' : ''}`}>
          {loading ? 'Loading…' : `${signs.length} sign${signs.length === 1 ? '' : 's'} available`}
        </span>
      </header>

      <div className="card stage-card">
        <div className="stage-header">
          <h2>Signing stage</h2>
          <span className="badge">
            {playableIndices.length > 0 && playPosition >= 0
              ? `Sign ${playPosition + 1} of ${playableIndices.length}`
              : loading
                ? 'Preparing'
                : 'Ready'}
          </span>
        </div>

        <div className="stage-viewport">
          {loading && (
            <div className="stage-empty">
              <span className="mode-icon">
                <Loader2 size={24} strokeWidth={1.8} className="spin" />
              </span>
              <h3>Loading sign library</h3>
              <p>Fetching available sign clips from the backend.</p>
            </div>
          )}

          {!loading && error && (
            <div className="stage-empty">
              <span className="mode-icon">
                <Video size={24} strokeWidth={1.8} />
              </span>
              <h3>Sign library unavailable</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && !hasText && (
            <div className="stage-empty">
              <span className="mode-icon">
                <Type size={24} strokeWidth={1.8} />
              </span>
              <h3>Your signing stage is ready</h3>
              <p>Enter text below or pick a sign to begin the animated sequence.</p>
            </div>
          )}

          {!loading && !error && hasText && activeSegment?.sign && (
            <video
              key={`${activeSegment.sign.sign}-${activeIndex}`}
              ref={videoRef}
              className="stage-video"
              src={resolveMediaUrl(activeSegment.sign.video_url)}
              controls
              playsInline
              preload="auto"
              onEnded={handleEnded}
            />
          )}

          {!loading && !error && hasText && !activeSegment?.sign && (
            <div className="stage-missing">
              <span className="mode-icon">
                <Video size={24} strokeWidth={1.8} />
              </span>
              <strong>{activeSegment ? activeSegment.text : 'No matching signs'}</strong>
              <span>No sign video is available for this word.</span>
            </div>
          )}
        </div>

        {!loading && !error && activeSegment?.sign && (
          <div className="stage-caption">
            <strong>{activeSegment.text}</strong>
            <span className="stage-meta">/{activeSegment.sign.sign}</span>
          </div>
        )}

        <div className="playback-bar">
          <button
            type="button"
            className="playback-btn primary"
            onClick={togglePlay}
            disabled={playableIndices.length === 0}
          >
            {playing ? (
              <>
                <Pause size={16} strokeWidth={2} />
                Pause
              </>
            ) : (
              <>
                <Play size={16} strokeWidth={2} />
                Play
              </>
            )}
          </button>
          <button
            type="button"
            className="playback-btn"
            onClick={replay}
            disabled={playableIndices.length === 0}
          >
            <RotateCcw size={16} strokeWidth={2} />
            Replay
          </button>
          <button
            type="button"
            className="playback-btn"
            onClick={() => {
              setPlaying(false)
              setText('')
            }}
            disabled={text.length === 0}
          >
            Clear
          </button>

          <div className="playback-speed">
            <Gauge size={15} strokeWidth={2} />
            Speed
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                className={`speed-option ${speed === value ? 'active' : ''}`}
                onClick={() => setSpeed(value)}
                aria-pressed={speed === value}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>

        {segments.length > 0 && (
          <div className="timeline" aria-label="Sign sequence timeline">
            {segments.map((segment, index) => (
              <button
                key={`${segment.text}-${index}`}
                type="button"
                className={`timeline-item ${activeIndex === index ? 'active' : ''} ${
                  segment.sign ? '' : 'missing'
                }`}
                onClick={() => jumpTo(index)}
              >
                <span className="timeline-index">Sign {index + 1}</span>
                <span className="timeline-label">{segment.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid two-col">
        <div className="card">
          <div className="field">
            <label htmlFor="sign-input">Text to convert</label>
            <textarea
              id="sign-input"
              className="text-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. hello water help"
              rows={4}
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
          <p className="hint">
            Matched words play in sequence. Words without a clip are shown as missing in the
            timeline.
          </p>
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
              <RefreshCw size={14} strokeWidth={2} />
              Refresh
            </button>
          </div>

          {loading && <p className="hint">Loading the sign list from the backend…</p>}

          {!loading && error && (
            <p className="error-text" role="alert">
              Could not load signs: {error}
            </p>
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
      </div>
    </section>
  )
}

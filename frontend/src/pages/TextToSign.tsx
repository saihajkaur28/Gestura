import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Columns,
  ExternalLink,
  Gauge,
  Info,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Type,
  User,
  Video,
} from 'lucide-react'
import { fetchSigns, resolveMediaUrl } from '../lib/api'
import type { SignInfo } from '../lib/api'
import { segmentText } from '../lib/segments'
import AslAvatarCanvas from '../components/AslAvatarCanvas'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5]

const SAMPLE_PROMPTS = [
  'Hello, thank you!',
  'I need help please',
  'Where is the bathroom?',
  'Doctor, I am in pain',
  'Eat food, drink water',
  'My name is Maya',
]

const CATEGORIES = [
  'All',
  'Greetings',
  'Needs',
  'Medical',
  'Politeness',
  'Questions',
  'General',
]

interface AvatarCharacter {
  id: string
  name: string
  tag: string
  role: string
  description: string
}

const AVATAR_CHARACTERS: AvatarCharacter[] = [
  {
    id: 'maya',
    name: 'Maya',
    tag: 'Primary',
    role: 'Expressive ASL Avatar',
    description: 'Natural facial dynamics & fluid arm kinematics for conversational ASL.',
  },
  {
    id: 'alex',
    name: 'Alex',
    tag: 'Clinical',
    role: 'Assistive Healthcare Avatar',
    description: 'High-contrast, structured signing optimized for ICU and clinical communication.',
  },
  {
    id: 'jordan',
    name: 'Jordan',
    tag: '3rd Avatar',
    role: 'High-Fidelity ASL Avatar',
    description: 'Next-generation articulated hand kinematics with precision finger configuration.',
  },
]

type StageViewMode = 'video' | 'avatar' | 'dual'

export default function TextToSign() {
  const [signs, setSigns] = useState<SignInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState('maya')
  const [viewMode, setViewMode] = useState<StageViewMode>('video')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const advanceTimerRef = useRef<number | null>(null)

  const activeAvatar = useMemo(
    () => AVATAR_CHARACTERS.find((a) => a.id === selectedAvatarId) ?? AVATAR_CHARACTERS[0],
    [selectedAvatarId],
  )

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

  // When text changes, reset active index to first segment if available
  useEffect(() => {
    setPlaying(false)
    if (segments.length > 0) {
      setActiveIndex(0)
    } else {
      setActiveIndex(-1)
    }
  }, [segments.length, text])

  // Handle active video playback rate and play/pause
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

  const activeSegment = activeIndex >= 0 && activeIndex < segments.length ? segments[activeIndex] : undefined

  // Timed advancement for fingerspelled words or missing words when sequence is playing
  useEffect(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }

    if (!playing || !activeSegment) return

    // If the active segment is not a lexical sign (e.g. fingerspelled or missing)
    if (!activeSegment.sign) {
      const holdDuration = activeSegment.isFingerspelled
        ? Math.max(1600 / speed, 900)
        : Math.max(2000 / speed, 1200)

      advanceTimerRef.current = window.setTimeout(() => {
        if (activeIndex < segments.length - 1) {
          setActiveIndex((prev) => prev + 1)
        } else {
          setPlaying(false)
        }
      }, holdDuration)
    }

    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current)
        advanceTimerRef.current = null
      }
    }
  }, [playing, activeIndex, activeSegment, segments.length, speed])

  const handleEnded = useCallback(() => {
    if (activeIndex < segments.length - 1) {
      setActiveIndex((prev) => prev + 1)
    } else {
      setPlaying(false)
    }
  }, [activeIndex, segments.length])

  const togglePlay = useCallback(() => {
    if (segments.length === 0) return
    if (playing) {
      setPlaying(false)
      return
    }
    if (activeIndex < 0 || activeIndex >= segments.length) {
      setActiveIndex(0)
    }
    setPlaying(true)
  }, [activeIndex, playing, segments.length])

  const replay = useCallback(() => {
    if (segments.length === 0) return
    if (activeIndex === 0) {
      const video = videoRef.current
      if (video) video.currentTime = 0
    }
    setActiveIndex(0)
    setPlaying(true)
  }, [activeIndex, segments.length])

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1)
    }
  }, [activeIndex])

  const handleNext = useCallback(() => {
    if (activeIndex < segments.length - 1) {
      setActiveIndex((prev) => prev + 1)
    }
  }, [activeIndex, segments.length])

  const jumpTo = (index: number) => {
    setActiveIndex(index)
  }

  const appendSign = (sign: SignInfo) => {
    const words = sign.sign.replace(/_/g, ' ')
    setText((current) => (current.trim() ? `${current.trim()} ${words}` : words))
  }

  const handleSelectPrompt = (prompt: string) => {
    setText(prompt)
  }

  const filteredSigns = useMemo(() => {
    return signs.filter((sign) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        (sign.category && sign.category.toLowerCase().includes(selectedCategory.toLowerCase()))
      const matchesQuery =
        !searchQuery.trim() ||
        sign.sign.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sign.gloss && sign.gloss.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sign.keywords && sign.keywords.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase())))
      return matchesCategory && matchesQuery
    })
  }, [signs, selectedCategory, searchQuery])

  const hasText = text.trim() !== ''

  // Render 3D Avatar Stage
  const renderAvatarStage = (isCompact = false) => {
    return (
      <div className={`avatar-stage-container ${isCompact ? 'compact' : ''}`}>
        <AslAvatarCanvas
          activeSign={activeSegment?.sign ? activeSegment.sign.sign : null}
          videoRef={viewMode === 'dual' ? videoRef : undefined}
          playing={playing}
          playbackSpeed={speed}
          characterId={selectedAvatarId}
          compact={isCompact}
          onAnimationEnded={handleEnded}
        />

        {!loading && !error && hasText && activeSegment?.isFingerspelled && !isCompact && (
          <div className="fs-stage" style={{ width: '100%', marginTop: 12 }}>
            <span className="asl-gloss-badge" style={{ background: 'rgba(255, 207, 86, 0.2)', color: '#ffd56b' }}>
              ASL Manual Alphabet
            </span>
            <div className="fs-letters-grid" style={{ marginTop: 8 }}>
              {activeSegment.letters?.map((letter, idx) => (
                <span key={idx} className="fs-letter-chip">
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && hasText && !activeSegment?.sign && !activeSegment?.isFingerspelled && !isCompact && (
          <div className="stage-missing" style={{ width: '100%', marginTop: 12 }}>
            <span className="mode-icon">
              <Box size={20} strokeWidth={1.8} />
            </span>
            <strong>{activeSegment ? activeSegment.text : 'No matching signs'}</strong>
            <span>Sign unavailable in the current ASL dictionary. Avatar resting in neutral pose.</span>
          </div>
        )}
      </div>
    )
  }

  // Render Video Stage
  const renderVideoStage = () => {
    return (
      <div className="stage-viewport" style={{ width: '100%' }}>
        {loading && (
          <div className="stage-empty">
            <span className="mode-icon">
              <Loader2 size={24} strokeWidth={1.8} className="spin" />
            </span>
            <h3>Loading ASL sign library</h3>
            <p>Fetching verified clips from Yale ASL Signbank.</p>
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
            <h3>Your ASL signing stage is ready</h3>
            <p>Enter text below, select a sample prompt, or pick signs from the library.</p>
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

        {!loading && !error && hasText && activeSegment?.isFingerspelled && (
          <div className="fs-stage">
            <span className="asl-gloss-badge" style={{ background: 'rgba(255, 207, 86, 0.2)', color: '#ffd56b' }}>
              ASL Manual Alphabet
            </span>
            <h3>Fingerspelling: &ldquo;{activeSegment.text}&rdquo;</h3>
            <p>
              In ASL, proper nouns, names, and concepts without established lexical signs are
              fingerspelled letter-by-letter.
            </p>
            <div className="fs-letters-grid">
              {activeSegment.letters?.map((letter, idx) => (
                <span key={idx} className="fs-letter-chip">
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && hasText && !activeSegment?.sign && !activeSegment?.isFingerspelled && (
          <div className="stage-missing">
            <span className="mode-icon">
              <Video size={24} strokeWidth={1.8} />
            </span>
            <strong>{activeSegment ? activeSegment.text : 'No matching signs'}</strong>
            <span>Sign unavailable in the current ASL dictionary. GESTURA avoids substitute signs.</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Text → Sign</h1>
          <p className="page-subtitle">
            Type or select words, then watch them played back as an authentic American Sign
            Language (ASL) sequence.
          </p>
        </div>
        <span className={`status-pill ${signs.length > 0 ? 'ok' : ''}`}>
          {loading ? 'Loading…' : `${signs.length} ASL signs available`}
        </span>
      </header>

      <div className="card stage-card">
        {/* Avatar and View Mode Switcher Strip */}
        <div className="avatar-controls-strip">
          <div className="avatar-switcher-group">
            <span className="avatar-switcher-label">
              <User size={14} strokeWidth={2} />
              Avatar:
            </span>
            <div className="avatar-selector-pills" role="radiogroup" aria-label="Select Signing Avatar">
              {AVATAR_CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  className={`avatar-pill-btn ${selectedAvatarId === char.id ? 'active' : ''}`}
                  onClick={() => setSelectedAvatarId(char.id)}
                  role="radio"
                  aria-checked={selectedAvatarId === char.id}
                  title={char.description}
                >
                  <span>{char.name}</span>
                  <span className="avatar-tag-badge">{char.tag}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="view-mode-tabs" role="tablist" aria-label="Playback Display View Mode">
            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'video' ? 'active' : ''}`}
              onClick={() => setViewMode('video')}
              role="tab"
              aria-selected={viewMode === 'video'}
              title="Ground-truth video from Yale ASL Signbank"
            >
              <Video size={13} strokeWidth={2} />
              ASL Video
            </button>
            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'avatar' ? 'active' : ''}`}
              onClick={() => setViewMode('avatar')}
              role="tab"
              aria-selected={viewMode === 'avatar'}
              title="3D signing avatar viewport"
            >
              <Box size={13} strokeWidth={2} />
              3D Avatar ({activeAvatar.name})
            </button>
            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'dual' ? 'active' : ''}`}
              onClick={() => setViewMode('dual')}
              role="tab"
              aria-selected={viewMode === 'dual'}
              title="Side-by-side video and avatar playback"
            >
              <Columns size={13} strokeWidth={2} />
              Side-by-Side
            </button>
          </div>
        </div>

        <div className="stage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>Signing Stage</h2>
            {activeSegment?.sign && (
              <span className="asl-gloss-badge">ASL: {activeSegment.aslGloss ?? activeSegment.sign.gloss}</span>
            )}
            {activeSegment?.isFingerspelled && (
              <span className="asl-gloss-badge" style={{ background: 'rgba(255, 207, 86, 0.25)', color: '#8c5e00' }}>
                Fingerspelled
              </span>
            )}
          </div>
          <span className="badge">
            {segments.length > 0 && activeIndex >= 0
              ? `Sign ${activeIndex + 1} of ${segments.length}`
              : loading
                ? 'Preparing'
                : 'Ready'}
          </span>
        </div>

        {/* Viewport: Video, Avatar, or Side-by-Side Dual */}
        {viewMode === 'video' && renderVideoStage()}
        {viewMode === 'avatar' && renderAvatarStage()}
        {viewMode === 'dual' && (
          <div className="side-by-side-stage">
            {renderVideoStage()}
            {renderAvatarStage(true)}
          </div>
        )}

        {!loading && !error && activeSegment && (
          <div className="stage-caption">
            <div className="stage-caption-main">
              <div className="stage-caption-title">
                <strong>{activeSegment.text}</strong>
                {activeSegment.sign?.gloss && (
                  <span className="asl-gloss-badge">{activeSegment.sign.gloss}</span>
                )}
                {activeSegment.sign?.category && (
                  <span className="asl-category-badge">{activeSegment.sign.category}</span>
                )}
              </div>
              {activeSegment.sign?.description && (
                <span className="stage-meta">{activeSegment.sign.description}</span>
              )}
            </div>

            <span className="avatar-status-pill">
              <Info size={12} strokeWidth={2} />
              3D Avatar ({activeAvatar.name}): ASL Kinematic Track &bull; Video Playback Active
            </span>
          </div>
        )}

        {!loading && !error && activeSegment?.sign && (
          <div className="stage-attribution-bar">
            <span className="attribution-source">
              <strong>Source:</strong> Yale ASL Signbank (#{activeSegment.sign.sign}) &bull; Haskins Laboratories, Yale University
            </span>
            <span>
              <strong>License:</strong> {activeSegment.sign.license ?? 'CC BY-NC-SA 4.0'}
            </span>
            <a
              href={`https://aslsignbank.haskins.yale.edu/dictionary/gloss/${activeSegment.sign.sign}.html`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Signbank entry <ExternalLink size={12} strokeWidth={2} />
            </a>
          </div>
        )}

        <div className="playback-bar">
          <button
            type="button"
            className="playback-btn"
            onClick={handlePrev}
            disabled={activeIndex <= 0 || segments.length === 0}
            title="Previous sign"
            aria-label="Previous sign"
          >
            <SkipBack size={16} strokeWidth={2} />
            Prev
          </button>

          <button
            type="button"
            className="playback-btn primary"
            onClick={togglePlay}
            disabled={segments.length === 0}
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
            onClick={handleNext}
            disabled={activeIndex >= segments.length - 1 || segments.length === 0}
            title="Next sign"
            aria-label="Next sign"
          >
            <SkipForward size={16} strokeWidth={2} />
            Next
          </button>

          <button
            type="button"
            className="playback-btn"
            onClick={replay}
            disabled={segments.length === 0}
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
                {value}&times;
              </button>
            ))}
          </div>
        </div>

        {segments.length > 0 && (
          <div className="timeline" aria-label="Sign sequence timeline">
            {segments.map((segment, index) => {
              let statusClass = ''
              if (segment.sign) {
                statusClass = ''
              } else if (segment.isFingerspelled) {
                statusClass = 'fingerspelled'
              } else {
                statusClass = 'missing'
              }

              return (
                <button
                  key={`${segment.text}-${index}`}
                  type="button"
                  className={`timeline-item ${activeIndex === index ? 'active' : ''} ${statusClass}`}
                  onClick={() => jumpTo(index)}
                >
                  <span className="timeline-index">
                    Sign {index + 1} {segment.isFingerspelled ? '• FS' : ''}
                  </span>
                  <span className="timeline-label">{segment.text}</span>
                  {segment.aslGloss && (
                    <span className="chip-gloss">{segment.aslGloss}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid two-col">
        <div className="card">
          <div className="field">
            <label htmlFor="sign-input">English text to convert</label>
            <textarea
              id="sign-input"
              className="text-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. hello thank you, I need help"
              rows={4}
            />
          </div>

          <div className="prompt-chips-wrapper">
            <span className="prompt-chips-label">
              <Sparkles size={12} strokeWidth={2} style={{ display: 'inline', marginRight: 4 }} />
              Quick test phrases:
            </span>
            <div className="prompt-chips">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="prompt-chip"
                  onClick={() => handleSelectPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="button-row" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setText('')}
              disabled={text.length === 0}
            >
              Clear input
            </button>
          </div>
          <p className="hint">
            Matched words play sequential ASL clips. Unrecognized names/words fall back to ASL
            fingerspelling.
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Available ASL Signs ({signs.length})</h2>
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

          <div className="category-tabs" role="tablist" aria-label="Sign categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                role="tab"
                aria-selected={selectedCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: 11,
                color: 'var(--muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="sign-search-input"
              style={{ paddingLeft: 30 }}
              placeholder="Search ASL signs or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 9,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: 12,
                }}
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>

          {loading && <p className="hint">Loading verified ASL catalog from Yale Signbank…</p>}

          {!loading && error && (
            <p className="error-text" role="alert">
              Could not load signs: {error}
            </p>
          )}

          {!loading && !error && filteredSigns.length === 0 && (
            <div className="empty-state">
              No ASL signs found matching &ldquo;{searchQuery || selectedCategory}&rdquo;.
            </div>
          )}

          {!loading && !error && filteredSigns.length > 0 && (
            <div className="chips" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {filteredSigns.map((sign) => (
                <button
                  key={sign.sign}
                  type="button"
                  className="chip"
                  onClick={() => appendSign(sign)}
                  title={`${sign.gloss ?? sign.sign} (${sign.category ?? 'General'})`}
                >
                  {sign.sign.replace(/_/g, ' ')}
                  {sign.gloss && <span className="chip-gloss">/{sign.gloss}</span>}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: '1px solid var(--border)',
              fontSize: '11px',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Info size={13} strokeWidth={2} />
            <span>
              All video assets sourced from Yale ASL Signbank under CC BY-NC-SA 4.0 for non-commercial educational use.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

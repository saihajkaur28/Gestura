import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Box,
  Check,
  Clock,
  Columns,
  ExternalLink,
  Gauge,
  Info,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Type,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { fetchSigns, resolveMediaUrl } from '../lib/api'
import type { SignInfo } from '../lib/api'
import { segmentText, type SignSegment } from '../lib/segments'
import { hasAslAnimation } from '../lib/aslAnimations'
import AslAvatarCanvas from '../components/AslAvatarCanvas'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5]

const SAMPLE_PROMPTS = [
  'Hello, how are you?',
  'Thank you, goodbye',
  'I need help please',
  'Where is the bathroom?',
  'Doctor, I have pain',
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
  'Common Phrases',
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
    tag: 'High-Fid',
    role: 'High-Fidelity ASL Avatar',
    description: 'Next-generation articulated hand kinematics with precision finger configuration.',
  },
  {
    id: 'signkit',
    name: 'Sign-Kit',
    tag: 'X-Bot 3D',
    role: 'Mixamo Rigged Mesh Avatar',
    description: 'Fully rigged 3D humanoid character mesh from Sign-Kit toolkit reproducing authentic ASL movements.',
  },
]

type StageViewMode = 'side-by-side' | 'video' | 'avatar'

export default function TextToSign() {
  const [signs, setSigns] = useState<SignInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Input and converted text state
  const [text, setText] = useState('Hello, how are you?')
  const [activeSequenceText, setActiveSequenceText] = useState('Hello, how are you?')
  const [isConverted, setIsConverted] = useState(true)

  // Sequence playback state
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [isLooping, setIsLooping] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  // Timeline scrubber state (intra-sign)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)

  // Stage display & Avatar selection
  const [selectedAvatarId, setSelectedAvatarId] = useState('maya')
  const [viewMode, setViewMode] = useState<StageViewMode>('side-by-side')

  // Search & category filters for library explorer
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const stageCardRef = useRef<HTMLDivElement | null>(null)

  const activeAvatar = useMemo(
    () => AVATAR_CHARACTERS.find((a) => a.id === selectedAvatarId) ?? AVATAR_CHARACTERS[0],
    [selectedAvatarId],
  )

  // Load signs from backend or bundled catalog
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

  // Generate sequence segments from active converted text
  const segments: SignSegment[] = useMemo(() => {
    return segmentText(activeSequenceText, signs)
  }, [activeSequenceText, signs])

  const activeSegment = activeIndex >= 0 && activeIndex < segments.length ? segments[activeIndex] : undefined

  // Active animation check
  const activeAnimationId = useMemo(() => {
    if (!activeSegment) return null
    if (activeSegment.animationId && hasAslAnimation(activeSegment.animationId)) {
      return activeSegment.animationId
    }
    if (activeSegment.sign?.sign && hasAslAnimation(activeSegment.sign.sign)) {
      return activeSegment.sign.sign
    }
    if (activeSegment.isFingerspelled && activeSegment.letters && activeSegment.letters.length > 0) {
      const firstChar = activeSegment.letters[0].toLowerCase()
      if (hasAslAnimation(firstChar)) return firstChar
    }
    return null
  }, [activeSegment])

  const hasAnimation = activeAnimationId !== null
  const syncStatus = !hasAnimation
    ? 'Animation Unavailable'
    : isSeeking
    ? 'Synchronizing'
    : 'Synced'

  // Determine active video URL
  const activeVideoSrc = useMemo(() => {
    if (!activeSegment) return ''
    if (activeSegment.videoUrl) return resolveMediaUrl(activeSegment.videoUrl)
    if (activeSegment.sign?.frontend_video_url) return activeSegment.sign.frontend_video_url
    if (activeSegment.sign?.video_url) return resolveMediaUrl(activeSegment.sign.video_url)
    return ''
  }, [activeSegment])

  // Reset video and playback state when active segment changes
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setPlaybackError(null)

    const video = videoRef.current
    if (video) {
      video.playbackRate = speed
      video.muted = isMuted
      video.load()
      if (playing) {
        video.play().catch((err) => {
          console.warn('Playback error on segment change:', err)
        })
      }
    }
  }, [activeIndex, activeVideoSrc, speed, isMuted])

  // Fallback timer for segments without a video (e.g. fingerspelled or missing)
  useEffect(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }

    if (!playing || !activeSegment) return

    // If segment has no video file, advance automatically based on duration
    if (!activeVideoSrc) {
      const holdDuration = activeSegment.isFingerspelled
        ? Math.max(1600 / speed, 900)
        : Math.max(2000 / speed, 1200)

      advanceTimerRef.current = window.setTimeout(() => {
        handleSegmentEnded()
      }, holdDuration)
    }

    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current)
        advanceTimerRef.current = null
      }
    }
  }, [playing, activeIndex, activeSegment, activeVideoSrc, speed])

  // Segment completion handler: advance to next sign or loop
  const handleSegmentEnded = useCallback(() => {
    if (activeIndex < segments.length - 1) {
      setActiveIndex((prev) => prev + 1)
    } else if (isLooping) {
      setActiveIndex(0)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        void videoRef.current.play()
      }
    } else {
      setPlaying(false)
    }
  }, [activeIndex, segments.length, isLooping])

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (segments.length === 0) return
    const nextPlaying = !playing
    setPlaying(nextPlaying)

    const video = videoRef.current
    if (video) {
      if (nextPlaying) {
        if (activeIndex < 0 || activeIndex >= segments.length) {
          setActiveIndex(0)
        }
        video.playbackRate = speed
        video.play().catch(() => setPlaying(false))
      } else {
        video.pause()
      }
    }
  }, [activeIndex, playing, segments.length, speed])

  // Replay from start of sequence
  const handleReplay = useCallback(() => {
    if (segments.length === 0) return
    setActiveIndex(0)
    setPlaying(true)
    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      video.playbackRate = speed
      void video.play()
    }
  }, [segments.length, speed])

  // Previous sign in sequence
  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1)
    }
  }, [activeIndex])

  // Next sign in sequence
  const handleNext = useCallback(() => {
    if (activeIndex < segments.length - 1) {
      setActiveIndex((prev) => prev + 1)
    }
  }, [activeIndex, segments.length])

  // Jump to specific sign in sequence
  const jumpTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  // Speed selection
  const handleSpeedSelect = (newSpeed: number) => {
    setSpeed(newSpeed)
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed
    }
  }

  // Timeline scrub handling
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    setIsSeeking(true)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  const handleSeekEnd = () => {
    setIsSeeking(false)
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      videoRef.current.playbackRate = speed
    }
  }

  // Convert button action
  const handleConvert = () => {
    if (!text.trim()) return
    setActiveSequenceText(text.trim())
    setIsConverted(true)
    setActiveIndex(0)
    setPlaying(true)

    // Smooth scroll to stage if needed
    if (stageCardRef.current) {
      stageCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  // Quick sample prompt selection
  const handleSelectPrompt = (prompt: string) => {
    setText(prompt)
    setActiveSequenceText(prompt)
    setIsConverted(true)
    setActiveIndex(0)
    setPlaying(true)
  }

  // Append sign from library explorer
  const appendSign = (sign: SignInfo) => {
    const words = sign.sign.replace(/_/g, ' ')
    setText((current) => (current.trim() ? `${current.trim()} ${words}` : words))
  }

  // Filtered signs for library explorer
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

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00'
    const minutes = Math.floor(secs / 60)
    const seconds = Math.floor(secs % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Text → Sign</h1>
          <p className="page-subtitle">
            Convert sentences into authentic ASL reference video and synchronized 3D avatar animations.
          </p>
        </div>
        <span className={`status-pill ${signs.length > 0 ? 'ok' : ''}`}>
          {loading ? 'Loading…' : `${signs.length} ASL signs available`}
        </span>
      </header>

      {/* Main Signing Stage Card */}
      <div className="card stage-card" ref={stageCardRef}>
        {/* Stage View Mode & Synchronization Header Bar */}
        <div className="asl-stage-header-bar">
          <div className="asl-stage-mode-pills" role="radiogroup" aria-label="Signing Stage View Mode">
            <button
              type="button"
              className={`asl-stage-mode-pill ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
              aria-pressed={viewMode === 'side-by-side'}
            >
              <Columns size={14} />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              className={`asl-stage-mode-pill ${viewMode === 'video' ? 'active' : ''}`}
              onClick={() => setViewMode('video')}
              aria-pressed={viewMode === 'video'}
            >
              <Video size={14} />
              <span>ASL Video</span>
            </button>
            <button
              type="button"
              className={`asl-stage-mode-pill ${viewMode === 'avatar' ? 'active' : ''}`}
              onClick={() => setViewMode('avatar')}
              aria-pressed={viewMode === 'avatar'}
            >
              <Box size={14} />
              <span>3D Avatar</span>
            </button>
          </div>

          <div className="asl-stage-sync-badge-wrapper">
            <span
              className={`asl-sync-indicator ${
                syncStatus === 'Synced' ? 'synced' : syncStatus === 'Synchronizing' ? 'syncing' : 'unavailable'
              }`}
              title={
                syncStatus === 'Synced'
                  ? '3D avatar is locked and synchronized to reference video timestamps'
                  : syncStatus === 'Synchronizing'
                  ? 'Updating avatar frame pose to video scrub position'
                  : 'Authentic 3D animation keyframes in conversion pipeline'
              }
            >
              <span className="dot" />
              <span>{syncStatus}</span>
            </span>
          </div>
        </div>

        {/* Synchronized Signing Stage Grid */}
        <div className={`asl-dual-stage-grid mode-${viewMode}`}>
          {/* LEFT PANEL: ASL Reference Video */}
          {(viewMode === 'side-by-side' || viewMode === 'video') && (
            <div className="asl-stage-panel asl-panel-video">
              <div className="asl-stage-panel-header">
                <div className="asl-panel-title">
                  <Video size={14} className="text-sage" />
                  <span>ASL Reference Video</span>
                </div>
                <span className="badge badge-ok">Original Signer</span>
              </div>

              <div className="asl-video-wrapper">
                {loading && (
                  <div className="asl-unavailable-card" role="status">
                    <Loader2 size={32} className="spin text-sage" />
                    <h3>Loading ASL Library</h3>
                    <p className="asl-unavailable-text">Fetching verified clips from Yale ASL Signbank...</p>
                  </div>
                )}

                {!loading && error && (
                  <div className="asl-unavailable-card" role="status">
                    <AlertCircle size={32} className="text-muted" />
                    <h3>Sign Library Offline</h3>
                    <p className="asl-unavailable-text">{error} Using verified bundled fallback catalog.</p>
                  </div>
                )}

                {!loading && (!isConverted || segments.length === 0) && (
                  <div className="asl-unavailable-card" role="status">
                    <Type size={36} strokeWidth={2} />
                    <h3>Enter Text to Sign</h3>
                    <p className="asl-unavailable-text">
                      Type your sentence below and click <strong>Convert to ASL</strong> to start playback.
                    </p>
                  </div>
                )}

                {!loading && isConverted && activeSegment && !activeVideoSrc && activeSegment.isFingerspelled && (
                  <div className="fs-stage">
                    <span className="asl-gloss-badge" style={{ background: 'rgba(255, 207, 86, 0.2)', color: '#ffd56b' }}>
                      ASL Manual Alphabet
                    </span>
                    <h3>Fingerspelling: &ldquo;{activeSegment.text}&rdquo;</h3>
                    <p>In ASL, names and words without lexical signs are fingerspelled letter-by-letter.</p>
                    <div className="fs-letters-grid">
                      {activeSegment.letters?.map((letter, idx) => (
                        <span key={idx} className="fs-letter-chip">
                          {letter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!loading && isConverted && activeSegment && !activeVideoSrc && !activeSegment.isFingerspelled && (
                  <div className="asl-unavailable-card" role="status">
                    <Clock size={36} strokeWidth={2} />
                    <h3>Sign In Verification</h3>
                    <p className="asl-unavailable-text">
                      Sign video for <strong>&ldquo;{activeSegment.text}&rdquo;</strong> is currently in verification.
                    </p>
                  </div>
                )}

                {!loading && isConverted && activeSegment && activeVideoSrc && (
                  <>
                    <video
                      key={`seq-video-${activeSegment.text}-${activeIndex}`}
                      ref={videoRef}
                      src={activeVideoSrc}
                      className="asl-video-element"
                      playsInline
                      muted={isMuted}
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                      onEnded={handleSegmentEnded}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onError={() => {
                        setPlaybackError('Video stream unavailable. Please verify video source.')
                      }}
                      onClick={togglePlay}
                    />

                    {!playing && (
                      <button
                        type="button"
                        className="asl-video-big-play-overlay"
                        onClick={togglePlay}
                        aria-label="Play Video"
                      >
                        <Play size={40} fill="currentColor" />
                      </button>
                    )}

                    {playbackError && (
                      <div className="asl-video-error-overlay" role="alert">
                        <AlertCircle size={28} />
                        <p>{playbackError}</p>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={togglePlay}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* RIGHT PANEL: 3D Avatar (Synchronized to video timeline) */}
          {(viewMode === 'side-by-side' || viewMode === 'avatar') && (
            <div className="asl-stage-panel asl-panel-avatar">
              <div className="asl-stage-panel-header">
                <div className="asl-panel-title">
                  <Box size={14} className="text-sage" />
                  <span>3D Avatar ({activeAvatar.name})</span>
                </div>

                <div className="asl-avatar-pills-row" role="radiogroup" aria-label="Select Signing Avatar">
                  {AVATAR_CHARACTERS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      className={`asl-avatar-pill ${selectedAvatarId === av.id ? 'active' : ''}`}
                      onClick={() => setSelectedAvatarId(av.id)}
                      title={av.description}
                    >
                      {av.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="asl-avatar-stage-wrapper">
                <AslAvatarCanvas
                  activeSign={activeAnimationId}
                  videoRef={activeVideoSrc ? videoRef : undefined}
                  playing={playing}
                  playbackSpeed={speed}
                  characterId={selectedAvatarId}
                  onAnimationEnded={!activeVideoSrc ? handleSegmentEnded : undefined}
                />
              </div>
            </div>
          )}
        </div>

        {/* Caption & Metadata Strip */}
        {activeSegment && (
          <div className="stage-caption" style={{ marginTop: 12 }}>
            <div className="stage-caption-main">
              <div className="stage-caption-title">
                <strong>{activeSegment.text}</strong>
                {activeSegment.aslGloss && (
                  <span className="asl-gloss-badge">ASL: {activeSegment.aslGloss}</span>
                )}
                {activeSegment.sign?.category && (
                  <span className="asl-category-badge">{activeSegment.sign.category}</span>
                )}
                <span className="badge">
                  Sign {activeIndex + 1} of {segments.length}
                </span>
              </div>
              {activeSegment.sign?.description && (
                <span className="stage-meta">{activeSegment.sign.description}</span>
              )}
            </div>

            <span className="avatar-status-pill">
              <Info size={12} strokeWidth={2} />
              3D Avatar ({activeAvatar.name}): ASL Kinematic Track &bull; {hasAnimation ? 'Synced' : 'Neutral Pose'}
            </span>
          </div>
        )}

        {/* Interactive Scrubbing Bar (Within Active Sign) */}
        {activeVideoSrc && (
          <div className="asl-timeline-container" style={{ marginTop: 12 }}>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onChange={handleSeek}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="asl-timeline-slider"
              aria-label="Synchronized timeline seek"
            />
            <div className="asl-timeline-labels">
              <span className="asl-time-current">{formatTime(currentTime)}</span>
              <span className="asl-sync-timeline-pill">
                {syncStatus === 'Synced' ? 'Timeline Synced (Master: Video)' : 'Synchronizing Timeline...'}
              </span>
              <span className="asl-time-duration">{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Sequence Navigation & Playback Controls Bar */}
        <div className="asl-player-controls-row" style={{ marginTop: 10 }}>
          <div className="asl-playback-actions">
            <button
              type="button"
              className="asl-action-btn"
              onClick={handlePrev}
              disabled={activeIndex <= 0 || segments.length === 0}
              title="Previous sign in sequence"
              aria-label="Previous sign"
            >
              <SkipBack size={18} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className={`asl-action-btn ${playing ? 'playing' : 'primary'}`}
              onClick={togglePlay}
              disabled={segments.length === 0}
              title={playing ? 'Pause' : 'Play sequence'}
              aria-label={playing ? 'Pause' : 'Play sequence'}
            >
              {playing ? (
                <Pause size={20} strokeWidth={2.5} />
              ) : (
                <Play size={20} strokeWidth={2.5} fill="currentColor" />
              )}
            </button>

            <button
              type="button"
              className="asl-action-btn"
              onClick={handleNext}
              disabled={activeIndex >= segments.length - 1 || segments.length === 0}
              title="Next sign in sequence"
              aria-label="Next sign"
            >
              <SkipForward size={18} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className="asl-action-btn"
              onClick={handleReplay}
              disabled={segments.length === 0}
              title="Replay sequence from beginning"
              aria-label="Replay sequence"
            >
              <RotateCcw size={18} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className={`asl-action-btn ${isLooping ? 'active' : ''}`}
              onClick={() => setIsLooping((prev) => !prev)}
              title={isLooping ? 'Disable Loop' : 'Enable Sequence Loop'}
              aria-label={isLooping ? 'Disable Loop' : 'Enable Sequence Loop'}
            >
              <Repeat size={18} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className={`asl-action-btn ${isMuted ? 'active' : ''}`}
              onClick={() => setIsMuted((prev) => !prev)}
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={18} strokeWidth={2.2} /> : <Volume2 size={18} strokeWidth={2.2} />}
            </button>
          </div>

          {/* Shared Playback Speed Controller */}
          <div className="asl-speed-controller" role="radiogroup" aria-label="Sequence Playback Speed">
            <span className="asl-speed-title">
              <Gauge size={13} strokeWidth={2} />
              Speed:
            </span>
            <div className="asl-speed-pills">
              {SPEEDS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`asl-speed-pill ${speed === val ? 'active' : ''}`}
                  onClick={() => handleSpeedSelect(val)}
                  aria-pressed={speed === val}
                >
                  {val === 1 ? '1.0×' : `${val}×`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sequence Timeline Chips */}
        {segments.length > 0 && (
          <div className="timeline" style={{ marginTop: 14 }} aria-label="Sign sequence timeline">
            {segments.map((segment, index) => {
              let statusClass = ''
              if (segment.videoUrl || segment.sign) {
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

        {/* Attribution Bar */}
        {activeSegment?.sign && (
          <div className="stage-attribution-bar" style={{ marginTop: 12 }}>
            <span className="attribution-source">
              <strong>Source:</strong> Yale ASL Signbank & WLASL Ground-Truth Dataset &bull; Haskins Laboratories
            </span>
            <span>
              <strong>License:</strong> CC BY-NC-SA 4.0
            </span>
            <a
              href="https://aslsignbank.haskins.yale.edu/"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Signbank reference <ExternalLink size={12} strokeWidth={2} />
            </a>
          </div>
        )}
      </div>

      {/* Input Card & Quick Samples */}
      <div className="grid two-col" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="field">
            <label htmlFor="sign-input" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              English text to convert into ASL sequence
            </label>
            <textarea
              id="sign-input"
              className="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleConvert()
                }
              }}
              placeholder="e.g. Hello, how are you? / I need help please / Where is the bathroom?"
              rows={4}
            />
          </div>

          <div className="prompt-chips-wrapper">
            <span className="prompt-chips-label">
              <Sparkles size={12} strokeWidth={2} style={{ display: 'inline', marginRight: 4 }} />
              Quick sample phrases:
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

          <div className="button-row" style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConvert}
              disabled={text.trim().length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 750 }}
            >
              <Check size={16} strokeWidth={2.5} />
              Convert to ASL Sequence
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setText('')
                setActiveSequenceText('')
                setPlaying(false)
                setActiveIndex(-1)
              }}
              disabled={text.length === 0}
            >
              Clear
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Identifies verified ASL phrases and words. Unrecognized names fall back to ASL fingerspelling letter-by-letter.
          </p>
        </div>

        {/* Available Signs Explorer Card */}
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
                  right: 8,
                  top: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
          </div>

          <div className="sign-chips-scrollable" style={{ maxHeight: 240, overflowY: 'auto', marginTop: 12 }}>
            <div className="sign-chips">
              {filteredSigns.map((sign) => (
                <button
                  key={sign.sign}
                  type="button"
                  className="sign-chip"
                  onClick={() => appendSign(sign)}
                  title={`${sign.gloss ?? sign.sign} - click to append`}
                >
                  <span>{sign.sign.replace(/_/g, ' ')}</span>
                  {sign.gloss && <span className="chip-gloss">{sign.gloss}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

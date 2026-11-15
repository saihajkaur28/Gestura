import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Gauge,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { ASLVideoItem } from '../data/learnVocabulary'

interface ASLVideoPlayerProps {
  item: ASLVideoItem
  onSelectItem: (item: ASLVideoItem) => void
  onBack: () => void
  alphabetItems: ASLVideoItem[]
  commonWords: ASLVideoItem[]
  commonPhrases: ASLVideoItem[]
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5]

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ASLVideoPlayer({
  item,
  onSelectItem,
  onBack,
  alphabetItems,
  commonWords,
  commonPhrases,
}: ASLVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [isMuted, setIsMuted] = useState(true)
  const [isLooping, setIsLooping] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const isUnavailable = item.status === 'unavailable' || !item.videoUrl

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDropdownOpen])

  // Reset and update video player when the selected item changes
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setPlaybackError(null)

    const video = videoRef.current
    if (video) {
      video.playbackRate = playbackSpeed
      video.muted = isMuted
      video.loop = isLooping
      video.load()
    }
  }, [item, playbackSpeed, isMuted, isLooping])

  const handleTogglePlay = () => {
    const video = videoRef.current
    if (!video || isUnavailable) return

    if (video.paused || video.ended) {
      video.playbackRate = playbackSpeed
      video.play().catch((err) => {
        console.warn('Playback failed:', err)
        setPlaybackError('Could not play video. Click play to retry.')
      })
    } else {
      video.pause()
    }
  }

  const handleReplay = () => {
    const video = videoRef.current
    if (!video || isUnavailable) return

    video.currentTime = 0
    video.playbackRate = playbackSpeed
    video.play().catch(() => {
      setIsPlaying(false)
    })
  }

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      videoRef.current.playbackRate = playbackSpeed
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev
      if (videoRef.current) {
        videoRef.current.muted = next
      }
      return next
    })
  }

  const handleToggleLoop = () => {
    setIsLooping((prev) => {
      const next = !prev
      if (videoRef.current) {
        videoRef.current.loop = next
      }
      return next
    })
  }

  const handleItemSelect = (selected: ASLVideoItem) => {
    setIsDropdownOpen(false)
    onSelectItem(selected)
  }

  // Determine if the current item is an alphabet letter
  const isAlphabetItem = item.category === 'Alphabet'
  const currentLetter = isAlphabetItem ? item.title.toUpperCase() : null

  return (
    <div className="asl-player-container">
      {/* Top Header & Navigation Bar */}
      <div className="asl-player-header">
        <div className="asl-header-left">
          <button
            type="button"
            className="btn btn-secondary asl-back-btn"
            onClick={onBack}
            aria-label="Back to vocabulary library"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
            <span>Library</span>
          </button>

          <div className="asl-player-title-box">
            <div className="asl-title-row">
              <span className={`badge ${isAlphabetItem ? 'badge-ok' : 'badge-category'}`}>
                {item.category}
              </span>
              <h1 className="asl-player-title">
                {isAlphabetItem ? `Fingerspelling: Letter ${item.title}` : item.title}
              </h1>
            </div>
            {item.subtitle && <span className="asl-player-subtitle">{item.subtitle}</span>}
          </div>
        </div>

        {/* Common Words & Phrases Dropdown Selector */}
        <div className="asl-header-right" ref={dropdownRef}>
          <div className="asl-dropdown-wrapper">
            <button
              type="button"
              className="btn btn-secondary asl-dropdown-btn"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
            >
              <Sparkles size={16} className="text-sage" />
              <span className="asl-dropdown-label">
                {item.category === 'Alphabet' ? 'Words & Phrases' : item.title}
              </span>
              <ChevronDown
                size={16}
                className={`asl-dropdown-chevron ${isDropdownOpen ? 'rotated' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="asl-dropdown-menu" role="listbox">
                {/* Switch back to Alphabet shortcut */}
                <div className="asl-dropdown-section-header">
                  <BookOpen size={14} />
                  <span>Manual Alphabet</span>
                </div>
                <button
                  type="button"
                  className={`asl-dropdown-item ${isAlphabetItem ? 'selected' : ''}`}
                  onClick={() => handleItemSelect(alphabetItems[0])}
                >
                  <span className="asl-item-name">Alphabet Grid (A–Z)</span>
                  <span className="badge badge-ok asl-mini-badge">26 Letters</span>
                </button>

                {/* Common Words Group */}
                <div className="asl-dropdown-section-header">
                  <Sparkles size={14} />
                  <span>Common Words (12)</span>
                </div>
                <div className="asl-dropdown-list">
                  {commonWords.map((word) => {
                    const isSelected = item.id === word.id
                    const isAvail = word.status === 'available'
                    return (
                      <button
                        key={word.id}
                        type="button"
                        className={`asl-dropdown-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleItemSelect(word)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="asl-item-name">{word.title}</span>
                        {isAvail ? (
                          <span className="asl-avail-dot" title="Verified Video Available" />
                        ) : (
                          <span className="asl-unavail-badge">Soon</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Common Phrases Group */}
                <div className="asl-dropdown-section-header">
                  <MessageSquare size={14} />
                  <span>Common Phrases (10)</span>
                </div>
                <div className="asl-dropdown-list">
                  {commonPhrases.map((phrase) => {
                    const isSelected = item.id === phrase.id
                    const isAvail = phrase.status === 'available'
                    return (
                      <button
                        key={phrase.id}
                        type="button"
                        className={`asl-dropdown-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleItemSelect(phrase)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="asl-item-name">{phrase.title}</span>
                        {isAvail ? (
                          <span className="asl-avail-dot" title="Verified Video Available" />
                        ) : (
                          <span className="asl-unavail-badge">Soon</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main 3-Section Layout: Video Viewport + Sign Details + Alphabet Navigation Panel */}
      <div className="asl-player-layout-3col">
        {/* SECTION 1: Video Viewport & Playback Controls */}
        <div className="asl-player-viewport-card">
          <div className="asl-video-wrapper">
            {isUnavailable ? (
              <div className="asl-unavailable-card" role="status">
                <div className="asl-unavailable-icon-circle">
                  <Clock size={36} strokeWidth={2} />
                </div>
                <h3>Sign Demonstration In Verification</h3>
                <p className="asl-unavailable-text">
                  An authentic ASL signing video for <strong>"{item.title}"</strong> is currently in the
                  recording and verification pipeline.
                </p>
                <p className="asl-unavailable-subtext">
                  Please review the handshape and movement breakdown in Sign Details, or practice the
                  letters in the Alphabet panel on the right.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onSelectItem(alphabetItems[0])}
                >
                  <BookOpen size={15} />
                  Practice Alphabet (A–Z)
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={item.videoUrl}
                  className="asl-video-element"
                  playsInline
                  muted={isMuted}
                  loop={isLooping}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    if (!isLooping) setIsPlaying(false)
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={() => {
                    setPlaybackError('Video stream unavailable. Please verify video source.')
                  }}
                  onClick={handleTogglePlay}
                />

                {/* Big Play Overlay on Pause */}
                {!isPlaying && (
                  <button
                    type="button"
                    className="asl-video-big-play-overlay"
                    onClick={handleTogglePlay}
                    aria-label="Play Video"
                  >
                    <Play size={44} fill="currentColor" />
                  </button>
                )}

                {playbackError && (
                  <div className="asl-video-error-overlay" role="alert">
                    <AlertCircle size={32} />
                    <p>{playbackError}</p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleTogglePlay}
                    >
                      Retry Playback
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Interactive Timeline Scrubbing Bar */}
          {!isUnavailable && (
            <div className="asl-timeline-container">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                className="asl-timeline-slider"
                aria-label="Video timeline seek"
              />
              <div className="asl-timeline-labels">
                <span className="asl-time-current">{formatTime(currentTime)}</span>
                <span className="asl-time-duration">{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Primary Playback Action Controls */}
          {!isUnavailable && (
            <div className="asl-player-controls-row">
              <div className="asl-playback-actions">
                <button
                  type="button"
                  className={`btn ${isPlaying ? 'btn-secondary' : 'btn-primary'} asl-action-btn`}
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={18} strokeWidth={2.4} />
                  ) : (
                    <Play size={18} fill="currentColor" />
                  )}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary asl-action-btn"
                  onClick={handleReplay}
                  aria-label="Replay sign"
                  title="Replay from beginning"
                >
                  <RotateCcw size={17} strokeWidth={2.2} />
                  <span>Replay</span>
                </button>

                <button
                  type="button"
                  className={`btn btn-secondary asl-action-btn ${isLooping ? 'active-loop' : ''}`}
                  onClick={handleToggleLoop}
                  aria-pressed={isLooping}
                  title="Toggle continuous looping"
                >
                  <span>{isLooping ? 'Looping: On' : 'Loop: Off'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary asl-action-btn asl-mute-btn"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  title={isMuted ? 'Audio muted' : 'Audio unmuted'}
                >
                  {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              </div>

              {/* Playback Speed Controller */}
              <div className="asl-speed-controller" role="group" aria-label="Playback speed">
                <div className="asl-speed-header">
                  <Gauge size={15} strokeWidth={2.2} />
                  <span className="asl-speed-title">Speed:</span>
                  <span className="asl-current-speed-tag">{playbackSpeed}x</span>
                </div>

                <div className="asl-speed-pill-group">
                  {SPEED_OPTIONS.map((speed) => {
                    const isActive = playbackSpeed === speed
                    return (
                      <button
                        key={speed}
                        type="button"
                        className={`asl-speed-pill ${isActive ? 'active' : ''}`}
                        onClick={() => handleSpeedSelect(speed)}
                        aria-pressed={isActive}
                        aria-label={`${speed} times normal speed`}
                      >
                        {isActive && <Check size={11} strokeWidth={3.5} className="asl-check-icon" />}
                        <span>{speed}x</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Sign Details Panel */}
        <div className="asl-details-middle">
          <div className="card asl-sign-info-card">
            <div className="asl-info-card-header">
              <h3>Sign Details</h3>
              {item.status === 'available' ? (
                <span className="badge badge-ok">Verified ASL</span>
              ) : (
                <span className="badge badge-loading">In Pipeline</span>
              )}
            </div>

            {item.description && (
              <div className="asl-info-section">
                <span className="asl-info-label">Movement & Form:</span>
                <p className="asl-info-text">{item.description}</p>
              </div>
            )}

            {item.handshape && (
              <div className="asl-info-section">
                <span className="asl-info-label">Handshape:</span>
                <p className="asl-info-text">{item.handshape}</p>
              </div>
            )}

            {item.tips && item.tips.length > 0 && (
              <div className="asl-info-section">
                <span className="asl-info-label">Learning Tips:</span>
                <ul className="asl-tips-list">
                  {item.tips.map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="asl-info-section asl-speed-tip-box">
              <span className="asl-info-label">Tip for Beginners:</span>
              <p className="asl-speed-tip-text">
                Use <strong>0.5x</strong> or <strong>0.75x</strong> speed to carefully observe finger
                placements, wrist orientation, and movement trajectory.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: Alphabet Navigation Panel (A–Z Grid on Right) */}
        <aside className="asl-alphabet-sidebar" aria-label="Alphabet Navigation">
          <div className="card asl-alphabet-nav-card">
            <div className="asl-alphabet-nav-header">
              <div className="asl-alpha-header-title">
                <BookOpen size={17} className="text-sage" />
                <h3>Alphabets (A-Z)</h3>
              </div>
              <span className="asl-alpha-nav-hint">Click to switch</span>
            </div>

            <div className="asl-alphabet-compact-grid" role="group" aria-label="Alphabet letter selector">
              {alphabetItems.map((letterItem) => {
                const isSelected = currentLetter === letterItem.title.toUpperCase()
                return (
                  <button
                    key={letterItem.id}
                    type="button"
                    className={`asl-alpha-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleItemSelect(letterItem)}
                    aria-pressed={isSelected}
                    aria-label={`Select letter ${letterItem.title}`}
                  >
                    <span className="asl-alpha-char">{letterItem.title}</span>
                  </button>
                )
              })}
            </div>

            {/* Quick Switch to Words / Active State Info */}
            <div className="asl-alpha-nav-footer">
              <div className="asl-alpha-status-info">
                {isAlphabetItem ? (
                  <span>
                    Current Letter: <strong>{item.title}</strong> (Fingerspelling)
                  </span>
                ) : (
                  <span>
                    Viewing: <strong>{item.title}</strong>
                  </span>
                )}
              </div>
              {!isAlphabetItem && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm asl-return-alpha-btn"
                  onClick={() => handleItemSelect(alphabetItems[0])}
                >
                  <BookOpen size={14} />
                  Return to Letter A
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

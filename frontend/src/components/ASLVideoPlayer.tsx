import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
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

export type { ASLVideoItem }

type NavigationCategory = 'Alphabet' | 'Common Words' | 'Common Phrases'

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

function normalizeCategory(category: string): NavigationCategory {
  if (category === 'Common Phrases' || category === 'Common Sentences') return 'Common Phrases'
  if (category === 'Common Words') return 'Common Words'
  return 'Alphabet'
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

  const [currentCategory, setCurrentCategory] = useState<NavigationCategory>(() =>
    normalizeCategory(item.category),
  )

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [isMuted, setIsMuted] = useState(true)
  const [isLooping, setIsLooping] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  const isUnavailable = item.status === 'unavailable' || !item.videoUrl

  // Keep navigation category in sync when item changes
  useEffect(() => {
    setCurrentCategory(normalizeCategory(item.category))
  }, [item])

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

  // Handle switching category explicitly via the three tabs
  const handleCategorySwitch = (category: NavigationCategory) => {
    setCurrentCategory(category)

    // Select the first item in the newly selected category if current item is not in it
    if (category === 'Alphabet' && item.category !== 'Alphabet') {
      onSelectItem(alphabetItems[0])
    } else if (category === 'Common Words' && item.category !== 'Common Words') {
      onSelectItem(commonWords[0])
    } else if (category === 'Common Phrases' && item.category !== 'Common Phrases') {
      onSelectItem(commonPhrases[0])
    }
  }

  // Handle selecting an individual item within current category
  const handleItemSelect = (selected: ASLVideoItem) => {
    setCurrentCategory(normalizeCategory(selected.category))
    onSelectItem(selected)
  }

  const isAlphabetActive = currentCategory === 'Alphabet'
  const isWordsActive = currentCategory === 'Common Words'
  const isPhrasesActive = currentCategory === 'Common Phrases'

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
              <span className={`badge ${item.category === 'Alphabet' ? 'badge-ok' : 'badge-category'}`}>
                {item.category}
              </span>
              <h1 className="asl-player-title">
                {item.category === 'Alphabet' ? `Fingerspelling: Letter ${item.title}` : item.title}
              </h1>
            </div>
            {item.subtitle && <span className="asl-player-subtitle">{item.subtitle}</span>}
          </div>
        </div>
      </div>

      {/* Main 3-Section Layout: Video Viewport + Sign Details + Dynamic Navigation Panel */}
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
                  Review the movement and handshape breakdown in Sign Details, or select another item
                  from the navigation panel.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCategorySwitch('Alphabet')}
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

        {/* SECTION 3: Dynamic Category-Based Navigation Panel */}
        <aside className="asl-alphabet-sidebar" aria-label="Learning Navigation">
          <div className="card asl-alphabet-nav-card">
            {/* Navigation Panel Header */}
            <div className="asl-alphabet-nav-header">
              <div className="asl-alpha-header-title">
                {isAlphabetActive && <BookOpen size={18} className="text-sage" />}
                {isWordsActive && <Sparkles size={18} className="text-sage" />}
                {isPhrasesActive && <MessageSquare size={18} className="text-sage" />}
                <h3>
                  {isAlphabetActive && 'Alphabets (A-Z)'}
                  {isWordsActive && 'Common Words'}
                  {isPhrasesActive && 'Common Phrases'}
                </h3>
              </div>
              <span className="asl-alpha-nav-hint">
                {isAlphabetActive && '26 Letters'}
                {isWordsActive && `${commonWords.length} Words`}
                {isPhrasesActive && `${commonPhrases.length} Phrases`}
              </span>
            </div>

            {/* In-Panel Category Switcher Pills */}
            <div className="asl-nav-category-pills" role="tablist" aria-label="Navigation category selector">
              <button
                type="button"
                role="tab"
                aria-selected={isAlphabetActive}
                className={`asl-nav-pill ${isAlphabetActive ? 'active' : ''}`}
                onClick={() => handleCategorySwitch('Alphabet')}
              >
                Alphabet
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isWordsActive}
                className={`asl-nav-pill ${isWordsActive ? 'active' : ''}`}
                onClick={() => handleCategorySwitch('Common Words')}
              >
                Words
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isPhrasesActive}
                className={`asl-nav-pill ${isPhrasesActive ? 'active' : ''}`}
                onClick={() => handleCategorySwitch('Common Phrases')}
              >
                Phrases
              </button>
            </div>

            {/* DYNAMIC CONTENT 1: Alphabet Grid (Rendered ONLY when Alphabet is selected) */}
            {isAlphabetActive && (
              <div
                className="asl-alphabet-compact-grid"
                role="group"
                aria-label="Alphabet letter selector"
              >
                {alphabetItems.map((letterItem) => {
                  const isSelected = item.title.toUpperCase() === letterItem.title.toUpperCase()
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
            )}

            {/* DYNAMIC CONTENT 2: Common Words List (Rendered ONLY when Common Words is selected) */}
            {isWordsActive && (
              <div
                className="asl-nav-items-list"
                role="listbox"
                aria-label="Common words list"
              >
                {commonWords.map((word) => {
                  const isSelected = item.id === word.id
                  const isAvail = word.status === 'available'
                  return (
                    <button
                      key={word.id}
                      type="button"
                      className={`asl-nav-list-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleItemSelect(word)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="asl-nav-item-title">{word.title}</span>
                      {isAvail ? (
                        <span className="asl-nav-item-badge badge-avail">Video</span>
                      ) : (
                        <span className="asl-nav-item-badge badge-soon">Soon</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* DYNAMIC CONTENT 3: Common Phrases List (Rendered ONLY when Common Phrases is selected) */}
            {isPhrasesActive && (
              <div
                className="asl-nav-items-list"
                role="listbox"
                aria-label="Common phrases list"
              >
                {commonPhrases.map((phrase) => {
                  const isSelected = item.id === phrase.id
                  const isAvail = phrase.status === 'available'
                  return (
                    <button
                      key={phrase.id}
                      type="button"
                      className={`asl-nav-list-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleItemSelect(phrase)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="asl-nav-item-title">{phrase.title}</span>
                      {isAvail ? (
                        <span className="asl-nav-item-badge badge-avail">Video</span>
                      ) : (
                        <span className="asl-nav-item-badge badge-soon">Soon</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Navigation Panel Footer: Always displays currently selected item */}
            <div className="asl-alpha-nav-footer">
              <div className="asl-alpha-status-info">
                {isAlphabetActive && (
                  <span>
                    Selected: <strong>Letter {item.title}</strong> (Fingerspelling)
                  </span>
                )}
                {isWordsActive && (
                  <span>
                    Selected: <strong>{item.title}</strong>
                  </span>
                )}
                {isPhrasesActive && (
                  <span>
                    Selected: <strong>{item.title}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

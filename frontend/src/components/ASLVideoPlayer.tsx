import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Gauge, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'

export interface ASLVideoItem {
  id: string
  title: string
  subtitle?: string
  category: 'Alphabet' | 'Common Words' | 'Common Sentences'
  videoUrl: string
  description?: string
  handshape?: string
  tips?: string[]
}

interface ASLVideoPlayerProps {
  item: ASLVideoItem
  onBack: () => void
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5]

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ASLVideoPlayer({ item, onBack }: ASLVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [isMuted, setIsMuted] = useState(true)
  const [isLooping, setIsLooping] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  // Ensure playbackRate persists when item changes or video loads
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
    }
  }, [item, playbackSpeed, isMuted, isLooping])

  const handleTogglePlay = () => {
    const video = videoRef.current
    if (!video) return

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
    if (!video) return

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

  return (
    <div className="asl-player-container">
      {/* Top Header & Navigation */}
      <div className="asl-player-header">
        <button
          type="button"
          className="btn btn-secondary asl-back-btn"
          onClick={onBack}
          aria-label="Back to vocabulary list"
        >
          <ArrowLeft size={18} strokeWidth={2.2} />
          <span>Back to Library</span>
        </button>

        <div className="asl-player-title-box">
          <span className="badge badge-category">{item.category}</span>
          <h1 className="asl-player-title">{item.title}</h1>
          {item.subtitle && <span className="asl-player-subtitle">{item.subtitle}</span>}
        </div>
      </div>

      <div className="asl-player-layout">
        {/* Main Video Viewport */}
        <div className="asl-player-viewport-card">
          <div className="asl-video-wrapper">
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

            {/* Prominent Play Overlay on Pause */}
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
                <p>{playbackError}</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleTogglePlay}>
                  Retry Playback
                </button>
              </div>
            )}
          </div>

          {/* Interactive Timeline Scrubbing Bar */}
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

          {/* Primary Playback Action Controls */}
          <div className="asl-player-controls-row">
            <div className="asl-playback-actions">
              <button
                type="button"
                className={`btn ${isPlaying ? 'btn-secondary' : 'btn-primary'} asl-action-btn`}
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} strokeWidth={2.4} /> : <Play size={20} fill="currentColor" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary asl-action-btn"
                onClick={handleReplay}
                aria-label="Replay sign"
                title="Replay from beginning"
              >
                <RotateCcw size={18} strokeWidth={2.2} />
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
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>

            {/* Playback Speed Controller */}
            <div className="asl-speed-controller" role="group" aria-label="Playback speed">
              <div className="asl-speed-header">
                <Gauge size={16} strokeWidth={2.2} />
                <span className="asl-speed-title">Playback Speed:</span>
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
                      aria-label={`${speed} times normal playback speed`}
                    >
                      {isActive && <Check size={12} strokeWidth={3} className="asl-check-icon" />}
                      <span>{speed}x</span>
                      {speed === 1.0 && <span className="asl-normal-tag">Normal</span>}
                      {speed === 0.5 && <span className="asl-slow-tag">Slow</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Informational Guidance Panel */}
        <div className="asl-details-sidebar">
          <div className="card asl-sign-info-card">
            <h3>Sign Details</h3>
            
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
                  {item.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="asl-info-section asl-speed-tip-box">
              <span className="asl-info-label">Tip for Beginners:</span>
              <p className="asl-speed-tip-text">
                Use <strong>0.5x</strong> or <strong>0.75x</strong> speed to carefully observe finger placements, wrist orientation, and movement trajectory.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

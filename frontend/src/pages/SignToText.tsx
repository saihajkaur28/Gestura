import { useCallback, useEffect, useRef, useState } from 'react'
import type { HandLandmarker } from '@mediapipe/tasks-vision'
import { createHandLandmarker } from '../lib/mediapipe'
import { drawHandLandmarks } from '../lib/drawLandmarks'
import { DETECTION_RANGES, HandTracker } from '../lib/handTracking'
import type { DetectionRange } from '../lib/handTracking'

type CameraState = 'idle' | 'starting' | 'running' | 'error'
type ModelState = 'loading' | 'ready' | 'error'

export default function SignToText() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const trackerRef = useRef<HandTracker | null>(null)
  if (trackerRef.current === null) {
    trackerRef.current = new HandTracker('medium')
  }

  const [modelState, setModelState] = useState<ModelState>('loading')
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [handCount, setHandCount] = useState(0)
  const [handedness, setHandedness] = useState('')
  const [fps, setFps] = useState(0)
  const [range, setRange] = useState<DetectionRange>('medium')

  useEffect(() => {
    trackerRef.current?.setRange(range)
  }, [range])

  const loadModel = useCallback(async () => {
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    try {
      const landmarker = await createHandLandmarker()
      landmarkerRef.current = landmarker
      setModelState('ready')
      setError(null)
    } catch (loadError) {
      console.error('[mediapipe] Failed to load the hand landmarker.', loadError)
      setModelState('error')
      setError(
        `Hand landmark model failed to load: ${
          loadError instanceof Error ? loadError.message : String(loadError)
        }`,
      )
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function runModelLoad() {
      try {
        const landmarker = await createHandLandmarker()
        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        setModelState('ready')
        setError(null)
      } catch (loadError) {
        if (cancelled) return
        console.error('[mediapipe] Failed to load the hand landmarker.', loadError)
        setModelState('error')
        setError(
          `Hand landmark model failed to load: ${
            loadError instanceof Error ? loadError.message : String(loadError)
          }`,
        )
      }
    }

    void runModelLoad()

    return () => {
      cancelled = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    lastVideoTimeRef.current = -1
    trackerRef.current?.reset()
    const canvas = canvasRef.current
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHandCount(0)
    setHandedness('')
    setFps(0)
    setCameraState('idle')
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error')
      setError('This browser does not support camera access (getUserMedia is unavailable).')
      return
    }
    if (!landmarkerRef.current) {
      setCameraState('error')
      setError('The hand landmark model is not ready yet. Wait for it to load, then retry.')
      return
    }

    setCameraState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        throw new Error('The video element is not available.')
      }
      video.srcObject = stream
      await video.play()
      setCameraState('running')

      let frameCount = 0
      let lastFpsTime = performance.now()

      const loop = () => {
        const landmarker = landmarkerRef.current
        const currentVideo = videoRef.current
        const canvas = canvasRef.current

        if (landmarker && currentVideo && canvas && currentVideo.readyState >= 2) {
          if (currentVideo.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = currentVideo.currentTime
            const now = performance.now()
            const result = landmarker.detectForVideo(currentVideo, now)
            const tracker = trackerRef.current
            const tracking = tracker?.update(result, now)
            drawHandLandmarks(canvas, currentVideo, tracking?.renderHands ?? [])

            setHandCount(tracking?.activeHands.length ?? 0)
            const nextHandedness = (tracking?.activeHands ?? [])
              .map((hand) => hand.handedness)
              .join(', ')
            setHandedness((previous) =>
              previous === nextHandedness ? previous : nextHandedness,
            )
          }

          frameCount += 1
          const now = performance.now()
          if (now - lastFpsTime >= 1000) {
            setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)))
            frameCount = 0
            lastFpsTime = now
          }
        }

        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)
    } catch (cameraError) {
      console.error('[camera] Could not start the webcam.', cameraError)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraState('error')
      setError(
        `Could not start the webcam: ${
          cameraError instanceof Error ? cameraError.message : String(cameraError)
        }`,
      )
    }
  }, [])

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Sign → Text</h1>
          <p className="page-subtitle">
            Live webcam hand landmark detection using MediaPipe. Recognition is not implemented in
            Phase 1, so no sign is interpreted and no text is produced.
          </p>
        </div>
        <span className={`status-pill ${cameraState === 'running' ? 'ok' : ''}`}>
          {cameraState === 'running' ? 'Camera live' : 'Camera off'}
        </span>
      </header>

      <div className="notice">
        <strong>Phase 1 scope:</strong> this screen detects and visualises hand landmarks only. It
        never displays fabricated predictions or recognition results.
      </div>

      <div className="grid two-col">
        <div className="card">
          <div className="card-head">
            <h2>Camera</h2>
            <span
              className={`badge ${
                modelState === 'ready'
                  ? 'badge-ok'
                  : modelState === 'error'
                    ? 'badge-error'
                    : 'badge-loading'
              }`}
            >
              Model: {modelState}
            </span>
          </div>

          <div className="video-frame">
            <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="landmark-canvas" />
            {cameraState !== 'running' && <div className="video-placeholder">Camera preview</div>}
          </div>

          <div className="button-row">
            {cameraState === 'running' ? (
              <button type="button" className="btn btn-secondary" onClick={stopCamera}>
                Stop camera
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void startCamera()}
                disabled={modelState !== 'ready' || cameraState === 'starting'}
              >
                {cameraState === 'starting' ? 'Starting…' : 'Start camera'}
              </button>
            )}
            {modelState === 'error' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setModelState('loading')
                  setError(null)
                  void loadModel()
                }}
              >
                Retry model load
              </button>
            )}
          </div>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Detection</h2>
          <div className="range-control">
            <div className="range-head">
              <span className="range-label">Detection range</span>
              <span className="range-value">{DETECTION_RANGES[range].label}</span>
            </div>
            <div className="range-options" role="group" aria-label="Detection range">
              {(Object.keys(DETECTION_RANGES) as DetectionRange[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`range-option ${range === key ? 'active' : ''}`}
                  onClick={() => setRange(key)}
                  aria-pressed={range === key}
                  title={DETECTION_RANGES[key].description}
                >
                  {DETECTION_RANGES[key].label}
                </button>
              ))}
            </div>
          </div>
          <dl className="stat-list">
            <div>
              <dt>Hands in range</dt>
              <dd>{handCount}</dd>
            </div>
            <div>
              <dt>Handedness</dt>
              <dd>{handedness || '—'}</dd>
            </div>
            <div>
              <dt>Landmark FPS</dt>
              <dd>{fps}</dd>
            </div>
          </dl>
          <p className="hint">
            Up to two hands are tracked, prioritising the largest detections. Apparent size is a
            relative proximity cue, not a physical distance in centimetres.
          </p>
          <p className="hint">
            21 landmarks per tracked hand are drawn over the video. The FPS value measures the
            landmark pass, not the camera frame rate.
          </p>
          <p className="hint">
            Camera access requires a secure context: use <code>http://localhost</code> during local
            development, and HTTPS when deployed.
          </p>
        </div>
      </div>
    </section>
  )
}

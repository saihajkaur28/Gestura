import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, RefreshCw, ScanLine } from 'lucide-react'
import DatasetCollectorPanel from '../components/DatasetCollectorPanel'
import RecognitionPanel from '../components/RecognitionPanel'
import { DatasetRecorder } from '../lib/datasetRecorder'
import type { DatasetSample } from '../lib/datasetRecorder'
import { DETECTION_RANGES } from '../lib/handTracking'
import type { DetectionRange } from '../lib/handTracking'
import { IslRecognitionEngine } from '../lib/islRecognitionEngine'
import type { RecognitionUpdate } from '../lib/islRecognitionEngine'
import { SpeechController } from '../lib/speech'
import { useHandTrackingCamera } from '../hooks/useHandTrackingCamera'
import type { TrackingFrame } from '../hooks/useHandTrackingCamera'

function sentenceWord(label: string): string {
  return label.replace(/_/g, ' ')
}

export default function SignToText() {
  const [recognitionRunning, setRecognitionRunning] = useState(false)
  const [recognition, setRecognition] = useState<RecognitionUpdate | null>(null)
  const [sentence, setSentence] = useState<string[]>([])
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const [samples, setSamples] = useState<DatasetSample[]>([])
  const [lastCommitted, setLastCommitted] = useState<string | null>(null)
  const [speech] = useState(() => new SpeechController())
  const [recorder] = useState(() => new DatasetRecorder())

  const engineRef = useRef<IslRecognitionEngine | null>(null)

  const handleFrame = useCallback(
    ({ timestamp, tracking }: TrackingFrame) => {
      engineRef.current?.pushFrame(tracking.activeHands, timestamp)
      if (recorder.isRecording) {
        recorder.push(tracking.activeHands, timestamp)
      }
    },
    [recorder],
  )

  const {
    videoRef,
    canvasRef,
    modelState,
    cameraState,
    error,
    handCount,
    handedness,
    fps,
    range,
    setRange,
    startCamera,
    stopCamera,
    loadModel,
  } = useHandTrackingCamera({ onFrame: handleFrame })

  useEffect(() => {
    const engine = new IslRecognitionEngine({
      onUpdate: (update) => {
        setRecognition(update)
        if (update.committed) {
          setLastCommitted(update.committed)
          setSentence((current) => [...current, sentenceWord(update.committed!)])
          speech.speakLabel(update.committed)
        }
      },
    })
    engineRef.current = engine

    return () => {
      engine.stop()
      engineRef.current = null
      speech.cancel()
    }
  }, [speech])

  useEffect(() => {
    if (cameraState !== 'running' && recognitionRunning) {
      engineRef.current?.stop()
      setRecognitionRunning(false)
    }
  }, [cameraState, recognitionRunning])

  const toggleRecognition = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    if (recognitionRunning) {
      engine.stop()
      setRecognitionRunning(false)
    } else {
      void engine.start()
      setRecognitionRunning(true)
    }
  }, [recognitionRunning])

  const toggleSpeech = useCallback(() => {
    setSpeechEnabled((current) => {
      const next = !current
      speech.setEnabled(next)
      return next
    })
  }, [speech])

  const repeatLast = useCallback(() => {
    if (!lastCommitted) return
    setSentence((current) => [...current, sentenceWord(lastCommitted)])
    speech.speakLabel(lastCommitted)
  }, [lastCommitted, speech])

  const addSample = useCallback((sample: DatasetSample) => {
    setSamples((current) => [...current, sample])
  }, [])

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Sign → Text</h1>
          <p className="page-subtitle">
            Sign naturally in front of the camera. Gestura recognises each Indian Sign Language
            gesture and builds a readable sentence you can speak aloud.
          </p>
        </div>
        <span className={`status-pill ${cameraState === 'running' ? 'ok' : ''}`}>
          <span className={`status-dot ${cameraState === 'running' ? 'live' : ''}`} />
          {cameraState === 'running' ? 'Camera live' : 'Camera off'}
        </span>
      </header>

      <div className="workspace-grid">
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
            {cameraState === 'running' && (
              <span className="camera-overlay-badge live">
                <span className="dot" aria-hidden="true" />
                Tracking
              </span>
            )}
            {cameraState !== 'running' && (
              <div className="video-placeholder">
                <Camera size={26} strokeWidth={1.5} />
                Camera preview
              </div>
            )}
          </div>

          <div className="button-row">
            {cameraState === 'running' ? (
              <button type="button" className="btn btn-secondary" onClick={stopCamera}>
                <CameraOff size={15} strokeWidth={2} />
                Stop camera
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void startCamera()}
                disabled={modelState !== 'ready' || cameraState === 'starting'}
              >
                <Camera size={15} strokeWidth={2} />
                {cameraState === 'starting' ? 'Starting…' : 'Start camera'}
              </button>
            )}
            {modelState === 'error' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  void loadModel()
                }}
              >
                <RefreshCw size={15} strokeWidth={2} />
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

        <RecognitionPanel
          update={recognition}
          running={recognitionRunning}
          cameraRunning={cameraState === 'running'}
          sentence={sentence}
          lastCommitted={lastCommitted}
          speechEnabled={speechEnabled}
          speechSupported={speech.supported}
          onToggleRecognition={toggleRecognition}
          onClearSentence={() => setSentence([])}
          onRepeatLast={repeatLast}
          onToggleSpeech={toggleSpeech}
        />
      </div>

      <div className="grid two-col">
        <div className="card">
          <div className="card-head">
            <h2>Detection</h2>
            <span className="badge">
              <ScanLine size={12} strokeWidth={2} /> Live
            </span>
          </div>
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
        </div>

        <DatasetCollectorPanel
          recorder={recorder}
          cameraRunning={cameraState === 'running'}
          samples={samples}
          onAddSample={addSample}
          onClearSamples={() => setSamples([])}
        />
      </div>
    </section>
  )
}

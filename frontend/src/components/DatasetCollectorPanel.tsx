import { useEffect, useState } from 'react'
import { Circle, Database, Download, RefreshCw, Trash2 } from 'lucide-react'
import type { DatasetRecorder, DatasetSample } from '../lib/datasetRecorder'
import { downloadDataset } from '../lib/datasetRecorder'
import { ASL_LABELS, UNKNOWN_COLLECTOR_LABEL } from '../lib/aslLabels'

interface DatasetCollectorPanelProps {
  recorder: DatasetRecorder
  cameraRunning: boolean
  samples: DatasetSample[]
  onAddSample: (sample: DatasetSample) => void
  onClearSamples: () => void
}

type DominantHand = 'Left' | 'Right' | 'Both' | 'Unspecified'

const DOMINANT_HAND_OPTIONS: DominantHand[] = ['Right', 'Left', 'Both', 'Unspecified']

function createSessionId(): string {
  const random = globalThis.crypto?.randomUUID?.()
  if (random) return `session-${random.slice(0, 8)}`
  return `session-${Date.now()}`
}

export default function DatasetCollectorPanel({
  recorder,
  cameraRunning,
  samples,
  onAddSample,
  onClearSamples,
}: DatasetCollectorPanelProps) {
  const [label, setLabel] = useState(ASL_LABELS[0]?.label ?? 'HELLO')
  const [signerId, setSignerId] = useState('signer-1')
  const [sessionId, setSessionId] = useState(createSessionId)
  const [dominantHand, setDominantHand] = useState<DominantHand>('Right')
  const [durationMs, setDurationMs] = useState(3000)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      const current = recorder.elapsedMs
      setElapsed(current)
      if (current >= durationMs + 250) {
        const sample = recorder.stop()
        setRecording(false)
        setElapsed(0)
        if (sample) {
          onAddSample(sample)
          setValidationError(null)
          setMessage(
            `Recorded ${sample.label}: ${sample.frameCount} frames over ${sample.durationMs} ms.`,
          )
        } else {
          setValidationError(recorder.error ?? 'Recording could not be used.')
        }
      }
    }, 150)
    return () => clearInterval(timer)
  }, [recording, durationMs, recorder, onAddSample])

  useEffect(() => {
    if (recording && !cameraRunning) {
      recorder.cancel()
      setRecording(false)
      setElapsed(0)
      setValidationError('Recording cancelled because the camera stopped.')
    }
  }, [cameraRunning, recording, recorder])

  useEffect(() => {
    return () => {
      recorder.cancel()
    }
  }, [recorder])

  const startRecording = () => {
    if (!cameraRunning) {
      setValidationError('Start the camera before recording a sign.')
      return
    }
    if (!signerId.trim() || !sessionId.trim()) {
      setValidationError('Signer ID and session ID are required for leakage-safe splits.')
      return
    }
    setMessage(null)
    setValidationError(null)
    setElapsed(0)
    recorder.start(
      {
        label,
        signerId: signerId.trim(),
        sessionId: sessionId.trim(),
        dominantHand,
        durationMs,
      },
      performance.now(),
    )
    setRecording(true)
  }

  const progress = Math.min(100, Math.round((elapsed / durationMs) * 100))

  return (
    <div className="card collector-card">
      <div className="card-head">
        <h2>Dataset collection</h2>
        <span className="badge">
          <Database size={12} strokeWidth={2} /> {samples.length} recorded
        </span>
      </div>

      <div className="collector-fields">
        <label className="collector-field">
          <span>Sign label</span>
          <select value={label} onChange={(event) => setLabel(event.target.value)}>
            {ASL_LABELS.map((item) => (
              <option key={item.label} value={item.label}>
                {item.display}
              </option>
            ))}
            <option value={UNKNOWN_COLLECTOR_LABEL}>
              Unknown / neutral (negative example)
            </option>
          </select>
        </label>

        <label className="collector-field">
          <span>Signer ID</span>
          <input
            value={signerId}
            onChange={(event) => setSignerId(event.target.value)}
            placeholder="e.g. signer-1"
          />
        </label>

        <label className="collector-field">
          <span>Session ID</span>
          <input
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            placeholder="e.g. session-a"
          />
        </label>

        <label className="collector-field">
          <span>Dominant hand</span>
          <select
            value={dominantHand}
            onChange={(event) => setDominantHand(event.target.value as DominantHand)}
          >
            {DOMINANT_HAND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="collector-field">
          <span>Duration</span>
          <select
            value={durationMs}
            onChange={(event) => setDurationMs(Number(event.target.value))}
            disabled={recording}
          >
            <option value={2000}>2 s</option>
            <option value={3000}>3 s</option>
            <option value={4000}>4 s</option>
            <option value={5000}>5 s</option>
          </select>
        </label>
      </div>

      {recording && (
        <div className="collector-progress" aria-live="polite">
          <div className="collector-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span>
            Recording {label}… {recorder.frameCount} frames
          </span>
        </div>
      )}

      <div className="button-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={startRecording}
          disabled={recording || !cameraRunning}
        >
          <Circle size={14} strokeWidth={2} />
          {recording ? 'Recording…' : 'Record sign'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const exported = [...samples]
            downloadDataset(exported, `gestura-asl-${new Date().toISOString().slice(0, 10)}.jsonl`)
          }}
          disabled={samples.length === 0}
        >
          <Download size={14} strokeWidth={2} />
          Export JSONL
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            onClearSamples()
            setMessage(null)
            setValidationError(null)
          }}
          disabled={samples.length === 0}
        >
          <Trash2 size={14} strokeWidth={2} />
          Clear recordings
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSessionId(createSessionId())}
          disabled={recording}
        >
          <RefreshCw size={14} strokeWidth={2} />
          New session ID
        </button>
      </div>

      {message && <p className="hint collector-success">{message}</p>}
      {validationError && (
        <p className="error-text" role="alert">
          {validationError}
        </p>
      )}

      {samples.length > 0 && (
        <div className="collector-sample-list">
          {samples.slice(-8).map((sample, index) => (
            <span className="collector-sample" key={`${sample.sessionId}-${sample.createdAt}-${index}`}>
              {sample.label} · {sample.frameCount}f · {sample.durationMs}ms
            </span>
          ))}
          {samples.length > 8 && (
            <span className="collector-sample muted">+{samples.length - 8} more</span>
          )}
        </div>
      )}

    </div>
  )
}

import { Pause, Play, RotateCcw, Trash2, Volume2, VolumeX } from 'lucide-react'
import type { RecognitionPhase, RecognitionUpdate } from '../lib/islRecognitionEngine'
import { displayLabel } from '../lib/islLabels'

interface RecognitionPanelProps {
  update: RecognitionUpdate | null
  running: boolean
  cameraRunning: boolean
  sentence: string[]
  lastCommitted: string | null
  speechEnabled: boolean
  speechSupported: boolean
  onToggleRecognition: () => void
  onClearSentence: () => void
  onRepeatLast: () => void
  onToggleSpeech: () => void
}

const PHASE_LABELS: Record<RecognitionPhase, string> = {
  idle: 'Recognition paused',
  initialising: 'Initialising recogniser',
  'model-unavailable': 'Model unavailable',
  detecting: 'Detecting hands',
  processing: 'Processing gesture',
  recognising: 'Recognising sign',
  confirmed: 'Sign confirmed',
  unknown: 'Unknown gesture',
  error: 'Recognition error',
}

export default function RecognitionPanel({
  update,
  running,
  cameraRunning,
  sentence,
  lastCommitted,
  speechEnabled,
  speechSupported,
  onToggleRecognition,
  onClearSentence,
  onRepeatLast,
  onToggleSpeech,
}: RecognitionPanelProps) {
  const phase = update?.phase ?? (running ? 'initialising' : 'idle')
  const currentLabel = update?.label ?? null
  const confidence = update?.confidence
  const model = update?.model
  const confidencePercent =
    typeof confidence === 'number' ? Math.round(confidence * 100) : 0

  return (
    <div className="card recognition-card">
      <div className="card-head">
        <h2>Recognition</h2>
        <span className={`badge recognition-badge phase-${phase}`}>
          {PHASE_LABELS[phase]}
        </span>
      </div>

      <div className="recognition-current">
        <span className="recognition-kicker">Current recognition</span>
        <span className="recognition-sign">
          {currentLabel ? displayLabel(currentLabel) : '—'}
        </span>
        <span className="recognition-confidence">
          {typeof confidence === 'number'
            ? `Confidence: ${confidencePercent}%`
            : 'Confidence: —'}
        </span>
        <div className="confidence-track" aria-hidden="true">
          <span style={{ width: `${confidencePercent}%` }} />
        </div>
      </div>

      <div className="recognition-sentence">
        <span className="recognition-kicker">Live sentence</span>
        <p className={sentence.length ? 'sentence-text' : 'sentence-text empty'}>
          {sentence.length ? sentence.join(' ') : 'Confirmed signs will appear here.'}
        </p>
      </div>

      <div className="recognition-status-line">
        <span className={`status-dot ${cameraRunning && running ? 'live' : ''}`} />
        <span className="recognition-model">
          {model?.available
            ? `Model: ${model.modelVersion ?? 'loaded'}`
            : model?.reason
              ? model.reason
              : 'Model status not checked yet'}
        </span>
      </div>

      {update?.detail && <p className="hint recognition-detail">{update.detail}</p>}

      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={onToggleRecognition}>
          {running ? (
            <>
              <Pause size={15} strokeWidth={2} />
              Pause recognition
            </>
          ) : (
            <>
              <Play size={15} strokeWidth={2} />
              Start recognition
            </>
          )}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClearSentence}
          disabled={sentence.length === 0}
        >
          <Trash2 size={15} strokeWidth={2} />
          Clear sentence
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRepeatLast}
          disabled={!lastCommitted}
        >
          <RotateCcw size={15} strokeWidth={2} />
          Repeat last
        </button>
        <button
          type="button"
          className={`btn btn-secondary ${speechEnabled ? 'btn-toggled' : ''}`}
          onClick={onToggleSpeech}
          disabled={!speechSupported}
          aria-pressed={speechEnabled}
        >
          {speechEnabled ? (
            <Volume2 size={15} strokeWidth={2} />
          ) : (
            <VolumeX size={15} strokeWidth={2} />
          )}
          Speech: {speechEnabled ? 'on' : 'off'}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Languages,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { RecognitionPhase, RecognitionUpdate } from '../lib/aslRecognitionEngine'
import { displayLabel, getGestureInfo } from '../lib/aslLabels'
import type { SpeechLanguage } from '../lib/speech'

interface RecognitionPanelProps {
  update: RecognitionUpdate | null
  running: boolean
  cameraRunning: boolean
  sentence: string[]
  lastCommitted: string | null
  speechEnabled: boolean
  speechSupported: boolean
  speechLanguage?: SpeechLanguage
  handCount?: number
  onToggleRecognition: () => void
  onClearSentence: () => void
  onRepeatLast: () => void
  onToggleSpeech: () => void
  onReplayVoice?: () => void
  onChangeLanguage?: (lang: SpeechLanguage) => void
}

const PHASE_LABELS: Record<RecognitionPhase, string> = {
  idle: 'Recognition paused',
  initialising: 'Initializing camera...',
  'model-unavailable': 'Model unavailable',
  detecting: 'Detecting hands...',
  waiting: 'Waiting for sign...',
  processing: 'Processing gesture...',
  recognising: 'Processing gesture...',
  confirmed: 'Gesture recognized',
  'low-confidence': 'Low confidence. Please try again.',
  unknown: 'Waiting for sign...',
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
  speechLanguage = 'both',
  handCount = 0,
  onToggleRecognition,
  onClearSentence,
  onRepeatLast,
  onToggleSpeech,
  onReplayVoice,
  onChangeLanguage,
}: RecognitionPanelProps) {
  const [showDebug, setShowDebug] = useState(false)
  const phase = update?.phase ?? (running ? 'initialising' : 'idle')
  const currentLabel = update?.label ?? null
  const confidence = update?.confidence
  const model = update?.model
  const confidencePercent =
    typeof confidence === 'number' ? Math.round(confidence * 100) : 0

  const gestureInfo = currentLabel ? getGestureInfo(currentLabel) : null
  const committedGesture = lastCommitted ? getGestureInfo(lastCommitted) : null

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
        {gestureInfo ? (
          <div className="recognition-sign-bilingual">
            <span className="recognition-sign">{gestureInfo.english}</span>
            <span className="recognition-hindi-sub">{gestureInfo.hindi}</span>
          </div>
        ) : (
          <span className="recognition-sign">
            {phase === 'waiting' || phase === 'detecting'
              ? 'Waiting for sign...'
              : currentLabel
                ? displayLabel(currentLabel)
                : 'Waiting for sign...'}
          </span>
        )}

        <span className="recognition-confidence">
          {typeof confidence === 'number' && gestureInfo
            ? `Confidence: ${confidencePercent}%`
            : phase === 'waiting'
              ? 'Ready for gesture'
              : 'Confidence: —'}
        </span>
        <div className="confidence-track" aria-hidden="true">
          <span style={{ width: `${gestureInfo ? confidencePercent : 0}%` }} />
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
            ? `Model: ${model.modelVersion ?? 'CNN-GRU Active'}`
            : model?.reason
              ? model.reason
              : 'Model status not checked yet'}
        </span>
      </div>

      {update?.detail && <p className="hint recognition-detail">{update.detail}</p>}

      {/* Voice Language Selector */}
      {onChangeLanguage && (
        <div className="recognition-lang-row">
          <span className="recognition-lang-label">
            <Languages size={13} strokeWidth={2} />
            Voice Language:
          </span>
          <div className="lang-pill-group" role="group" aria-label="Voice language">
            {(['both', 'en', 'hi'] as SpeechLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                className={`lang-pill ${speechLanguage === lang ? 'active' : ''}`}
                onClick={() => onChangeLanguage(lang)}
              >
                {lang === 'both' ? 'English + हिन्दी' : lang === 'en' ? 'English' : 'हिन्दी'}
              </button>
            ))}
          </div>
        </div>
      )}

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

        {onReplayVoice && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReplayVoice}
            disabled={!lastCommitted}
            title="Replay Voice for the last confirmed gesture"
          >
            <Volume2 size={15} strokeWidth={2} />
            Replay voice
          </button>
        )}

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
          className="btn btn-secondary"
          onClick={onClearSentence}
          disabled={sentence.length === 0}
        >
          <Trash2 size={15} strokeWidth={2} />
          Clear sentence
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

      {/* Developer Debugging Panel (Collapsible / Unobtrusive) */}
      <div className="dev-panel-container">
        <button
          type="button"
          className="dev-panel-toggle"
          onClick={() => setShowDebug((prev) => !prev)}
          aria-expanded={showDebug}
        >
          <span className="dev-toggle-label">
            <Cpu size={13} strokeWidth={2} />
            Developer Debug Panel
          </span>
          {showDebug ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showDebug && (
          <div className="dev-debug-body">
            <div className="dev-grid">
              <div className="dev-stat">
                <span className="dev-stat-name">Detected Hands:</span>
                <span className="dev-stat-val">{handCount}</span>
              </div>
              <div className="dev-stat">
                <span className="dev-stat-name">Tracking Status:</span>
                <span className="dev-stat-val">
                  {handCount > 0 ? 'Active (MediaPipe 21-pt)' : 'Searching for hands'}
                </span>
              </div>
              <div className="dev-stat">
                <span className="dev-stat-name">Predicted Class:</span>
                <span className="dev-stat-val dev-highlight">
                  {currentLabel ?? 'None'}
                </span>
              </div>
              <div className="dev-stat">
                <span className="dev-stat-name">Confidence:</span>
                <span className="dev-stat-val">
                  {typeof confidence === 'number' ? `${(confidence * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="dev-stat">
                <span className="dev-stat-name">Last Committed:</span>
                <span className="dev-stat-val">
                  {committedGesture ? `${committedGesture.english} (${committedGesture.hindi})` : 'None'}
                </span>
              </div>
              <div className="dev-stat">
                <span className="dev-stat-name">Model Architecture:</span>
                <span className="dev-stat-val">1D-CNN + BiGRU (179-dim)</span>
              </div>
            </div>

            {update?.topK && update.topK.length > 0 && (
              <div className="dev-scores">
                <span className="dev-scores-title">Class Probability Distribution:</span>
                {update.topK.map((item) => (
                  <div key={item.label} className="dev-score-row">
                    <span className="dev-score-label">{item.label}</span>
                    <div className="dev-score-bar-track">
                      <div
                        className="dev-score-bar-fill"
                        style={{ width: `${Math.round(item.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="dev-score-pct">
                      {(item.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { API_BASE_URL } from './api'
import { FEATURE_VERSION, HandFeatureExtractor } from './handFeatureExtractor'
import { GestureSequenceBuffer, SEQUENCE_LENGTH } from './gestureSequenceBuffer'
import { PredictionStabilizer } from './predictionStabilizer'
import type { TrackedHand } from './handTracking'

export interface TopKPrediction {
  label: string
  confidence: number
}

export interface RecognitionModelStatus {
  available: boolean
  code: string
  reason: string | null
  featureVersion: number
  sequenceLength: number
  labels: string[]
  modelVersion?: string
  trainedAt?: string
  metrics?: Record<string, unknown>
}

export type RecognitionPhase =
  | 'idle'
  | 'initialising'
  | 'model-unavailable'
  | 'detecting'
  | 'processing'
  | 'recognising'
  | 'confirmed'
  | 'unknown'
  | 'error'

export interface RecognitionUpdate {
  phase: RecognitionPhase
  label: string | null
  confidence: number | null
  committed: string | null
  stableVotes: number
  topK: TopKPrediction[]
  model: RecognitionModelStatus | null
  detail: string | null
}

export interface RecognitionEngineOptions {
  apiBaseUrl?: string
  intervalMs?: number
  confidenceThreshold?: number
  onUpdate: (update: RecognitionUpdate) => void
}

interface PredictResponseBody {
  label: string
  confidence: number
  unknown: boolean
  topK: TopKPrediction[]
  modelVersion: string
}

const NO_HANDS_GRACE_MS = 500
const ERROR_RETRY_MS = 2500
const STATUS_RETRY_MS = 10000

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function unavailableStatus(code: string, reason: string): RecognitionModelStatus {
  return {
    available: false,
    code,
    reason,
    featureVersion: FEATURE_VERSION,
    sequenceLength: SEQUENCE_LENGTH,
    labels: [],
  }
}

export class IslRecognitionEngine {
  private readonly apiBaseUrl: string
  private readonly intervalMs: number
  private readonly onUpdate: (update: RecognitionUpdate) => void
  private readonly extractor = new HandFeatureExtractor()
  private readonly buffer = new GestureSequenceBuffer()
  private readonly stabilizer: PredictionStabilizer
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight = false
  private nextAttemptAt = 0
  private lastStatusCheck = 0
  private lastHandAt = 0
  private runToken = 0
  private model: RecognitionModelStatus | null = null
  private phase: RecognitionPhase = 'idle'
  private label: string | null = null
  private confidence: number | null = null
  private topK: TopKPrediction[] = []
  private detail: string | null = null

  constructor(options: RecognitionEngineOptions) {
    this.apiBaseUrl = (options.apiBaseUrl ?? API_BASE_URL).replace(/\/+$/, '')
    this.intervalMs = options.intervalMs ?? 140
    this.onUpdate = options.onUpdate
    this.stabilizer = new PredictionStabilizer({
      confidenceThreshold: options.confidenceThreshold ?? 0.55,
    })
  }

  get modelStatus(): RecognitionModelStatus | null {
    return this.model
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.runToken += 1
    this.resetSequence()
    this.phase = 'initialising'
    this.detail = null
    this.emit()

    await this.refreshModelStatus()
    if (!this.running) return
    this.phase = this.model?.available ? 'detecting' : 'model-unavailable'
    this.emit()

    this.timer = setInterval(() => {
      void this.tick()
    }, this.intervalMs)
  }

  stop(): void {
    this.running = false
    this.runToken += 1
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.resetSequence()
    this.phase = 'idle'
    this.label = null
    this.confidence = null
    this.topK = []
    this.detail = null
    this.emit()
  }

  resetSequence(): void {
    this.buffer.clear()
    this.extractor.reset()
    this.stabilizer.reset()
    this.lastHandAt = 0
    this.label = null
    this.confidence = null
    this.topK = []
  }

  pushFrame(hands: TrackedHand[], timestamp: number): void {
    if (!this.running) return
    const features = this.extractor.update(hands, timestamp)
    this.buffer.push(timestamp, features.modelVector)
    if (features.hands.length > 0) {
      this.lastHandAt = timestamp
    }
  }

  private emit(): void {
    this.onUpdate({
      phase: this.phase,
      label: this.label,
      confidence: this.confidence,
      committed: null,
      stableVotes: 0,
      topK: this.topK,
      model: this.model,
      detail: this.detail,
    })
  }

  private emitSnapshot(
    phase: RecognitionPhase,
    label: string | null,
    confidence: number | null,
    committed: string | null,
    stableVotes: number,
    topK: TopKPrediction[],
    detail: string | null,
  ): void {
    this.phase = phase
    this.label = label
    this.confidence = confidence
    this.topK = topK
    this.detail = detail
    this.onUpdate({
      phase,
      label,
      confidence,
      committed,
      stableVotes,
      topK,
      model: this.model,
      detail,
    })
  }

  private async refreshModelStatus(): Promise<void> {
    this.lastStatusCheck = performance.now()
    try {
      const response = await fetchWithTimeout(
        `${this.apiBaseUrl}/api/recognition/status`,
        { headers: { Accept: 'application/json' } },
        3000,
      )
      if (!response.ok) throw new Error(`status ${response.status}`)
      const body = (await response.json()) as RecognitionModelStatus
      this.model = {
        ...body,
        reason: body.reason ?? null,
      }
    } catch (error) {
      this.model = unavailableStatus(
        'backend-unreachable',
        `Could not reach the recognition service: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  private async tick(): Promise<void> {
    if (!this.running) return
    const now = performance.now()

    if (!this.model?.available) {
      if (now - this.lastStatusCheck >= STATUS_RETRY_MS) {
        await this.refreshModelStatus()
        if (!this.running) return
        this.phase = this.model?.available ? 'detecting' : 'model-unavailable'
        this.emit()
      }
      return
    }

    if (now - this.lastHandAt > NO_HANDS_GRACE_MS) {
      // Drop stale frames so the next sign starts from a clean sequence.
      this.buffer.clear()
      const snapshot = this.stabilizer.push(null, now)
      this.emitSnapshot(
        'detecting',
        snapshot.displayLabel,
        snapshot.displayConfidence,
        snapshot.committed,
        snapshot.stableVotes,
        [],
        this.detail,
      )
      return
    }

    if (this.inFlight || now < this.nextAttemptAt) return

    const frames = this.buffer.snapshot()
    if (!frames) {
      if (this.phase !== 'recognising' && this.phase !== 'confirmed') {
        this.emitSnapshot('detecting', this.label, this.confidence, null, 0, [], null)
      }
      return
    }

    this.inFlight = true
    const token = this.runToken
    if (this.phase === 'detecting') {
      this.emitSnapshot('processing', this.label, this.confidence, null, 0, [], null)
    }

    try {
      const response = await fetchWithTimeout(
        `${this.apiBaseUrl}/api/recognition/predict`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            featureVersion: FEATURE_VERSION,
            frames,
          }),
        },
        6000,
      )
      if (token !== this.runToken) return

      if (response.status === 503) {
        const body = (await response.json().catch(() => null)) as
          | { code?: string; detail?: string }
          | null
        this.model = unavailableStatus(
          body?.code ?? 'model-unavailable',
          body?.detail ?? 'The ISL model is not available.',
        )
        this.emitSnapshot(
          'model-unavailable',
          null,
          null,
          null,
          0,
          [],
          this.model.reason,
        )
        return
      }

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.status} ${response.statusText}`)
      }

      const result = (await response.json()) as PredictResponseBody
      if (token !== this.runToken) return

      if (result.unknown || result.label === 'UNKNOWN') {
        const snapshot = this.stabilizer.push(null, performance.now())
        this.emitSnapshot(
          'unknown',
          snapshot.displayLabel,
          snapshot.displayConfidence,
          snapshot.committed,
          snapshot.stableVotes,
          result.topK,
          'The model did not accept this gesture as a known sign.',
        )
        return
      }

      const snapshot = this.stabilizer.push(
        { label: result.label, confidence: result.confidence },
        performance.now(),
      )
      const phase: RecognitionPhase = snapshot.committed
        ? 'confirmed'
        : snapshot.status === 'unknown'
          ? 'unknown'
          : snapshot.status === 'idle'
            ? 'detecting'
            : 'recognising'
      this.emitSnapshot(
        phase,
        snapshot.displayLabel,
        snapshot.displayConfidence,
        snapshot.committed,
        snapshot.stableVotes,
        result.topK,
        null,
      )
      this.nextAttemptAt = performance.now()
    } catch (error) {
      if (token !== this.runToken) return
      this.nextAttemptAt = performance.now() + ERROR_RETRY_MS
      this.emitSnapshot(
        'error',
        this.label,
        this.confidence,
        null,
        this.stabilizer.isLocked ? 1 : 0,
        [],
        `Recognition request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    } finally {
      if (token === this.runToken) {
        this.inFlight = false
      }
    }
  }
}

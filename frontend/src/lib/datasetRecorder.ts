import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { extractCompactFacePoints, FEATURE_VERSION } from './handFeatureExtractor'
import type { TrackedHand } from './handTracking'

export interface RecorderConfig {
  label: string
  signerId: string
  sessionId: string
  dominantHand: 'Left' | 'Right' | 'Both' | 'Unspecified'
  notes?: string
  durationMs: number
}

export interface RecordedHand {
  handedness: string
  landmarks: [number, number, number][]
}

export interface RecordedFrame {
  t: number
  hands: RecordedHand[]
  face?: [number, number, number][]
}

export interface DatasetSample {
  label: string
  signerId: string
  sessionId: string
  dominantHand: string
  notes: string
  createdAt: string
  frameCount: number
  durationMs: number
  fps: number
  featureVersion: number
  frames: RecordedFrame[]
}

export const MIN_RECORDED_FRAMES = 8
export const MIN_RECORDED_DURATION_MS = 400

function round(value: number): number {
  return Math.round(value * 100000) / 100000
}

function serialiseHand(hand: TrackedHand): RecordedHand | null {
  if (hand.landmarks.length < 21) return null
  const landmarks: [number, number, number][] = []
  for (const landmark of hand.landmarks.slice(0, 21)) {
    if (
      !Number.isFinite(landmark.x) ||
      !Number.isFinite(landmark.y) ||
      !Number.isFinite(landmark.z)
    ) {
      return null
    }
    landmarks.push([round(landmark.x), round(landmark.y), round(landmark.z)])
  }
  return { handedness: hand.handedness || 'Unknown', landmarks }
}

export class DatasetRecorder {
  private config: RecorderConfig | null = null
  private frames: RecordedFrame[] = []
  private startedAt = 0
  private lastError: string | null = null

  get isRecording(): boolean {
    return this.config !== null
  }

  get label(): string | null {
    return this.config?.label ?? null
  }

  get frameCount(): number {
    return this.frames.length
  }

  get error(): string | null {
    return this.lastError
  }

  get elapsedMs(): number {
    if (!this.isRecording || this.startedAt === 0) return 0
    return performance.now() - this.startedAt
  }

  start(config: RecorderConfig, timestamp: number): void {
    this.config = config
    this.frames = []
    this.startedAt = timestamp
    this.lastError = null
  }

  push(
    hands: TrackedHand[],
    timestamp: number,
    faceLandmarks: NormalizedLandmark[] = [],
  ): void {
    if (!this.config || this.startedAt === 0) return
    if (timestamp - this.startedAt > this.config.durationMs + 350) return

    const recordedHands = hands
      .slice(0, 2)
      .map(serialiseHand)
      .filter((hand): hand is RecordedHand => hand !== null)

    const recordedFace = extractCompactFacePoints(faceLandmarks).map(
      ([x, y, z]) => [round(x), round(y), round(z)] as [number, number, number],
    )

    if (recordedHands.length === 0 && recordedFace.length === 0) return

    this.frames.push({
      t: Math.max(0, timestamp - this.startedAt),
      hands: recordedHands,
      ...(recordedFace.length > 0 ? { face: recordedFace } : {}),
    })
  }

  cancel(): void {
    this.config = null
    this.frames = []
    this.startedAt = 0
  }

  stop(): DatasetSample | null {
    const config = this.config
    if (!config) return null
    const frames = this.frames
    this.config = null
    this.frames = []
    this.startedAt = 0

    if (frames.length < MIN_RECORDED_FRAMES) {
      this.lastError = `Too few usable frames (${frames.length}). Keep a hand or face in view and record for longer.`
      return null
    }

    const first = frames[0]!
    const last = frames[frames.length - 1]!
    const durationMs = last.t - first.t
    if (durationMs < MIN_RECORDED_DURATION_MS) {
      this.lastError = `Recording was too short (${Math.round(durationMs)} ms).`
      return null
    }

    const fps = (frames.length - 1) / Math.max(0.001, durationMs / 1000)

    this.lastError = null
    return {
      label: config.label,
      signerId: config.signerId,
      sessionId: config.sessionId,
      dominantHand: config.dominantHand,
      notes: config.notes ?? '',
      createdAt: new Date().toISOString(),
      frameCount: frames.length,
      durationMs: Math.round(durationMs),
      fps: Math.round(fps * 10) / 10,
      featureVersion: FEATURE_VERSION,
      frames,
    }
  }
}

export function samplesToJsonl(samples: DatasetSample[]): string {
  return samples.map((sample) => JSON.stringify(sample)).join('\n') + (samples.length ? '\n' : '')
}

export function downloadDataset(samples: DatasetSample[], filename: string): void {
  const blob = new Blob([samplesToJsonl(samples)], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
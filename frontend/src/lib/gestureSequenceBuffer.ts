import { FRAME_VECTOR_SIZE } from './handFeatureExtractor'

export const SEQUENCE_LENGTH = 32
export const DEFAULT_WINDOW_MS = 2400
export const MIN_SEQUENCE_FRAMES = 10
const MAX_BUFFERED_FRAMES = 120

export interface BufferedFrame {
  timestamp: number
  vector: number[]
}

function lerpVector(a: number[], b: number[], alpha: number): number[] {
  const result = new Array<number>(a.length)
  for (let i = 0; i < a.length; i += 1) {
    const from = a[i] ?? 0
    const to = b[i] ?? 0
    result[i] = from + (to - from) * alpha
  }
  return result
}

export function resampleVectors(frames: BufferedFrame[], target = SEQUENCE_LENGTH): number[][] {
  if (target <= 1) {
    return [frames[0]?.vector.slice() ?? new Array<number>(FRAME_VECTOR_SIZE).fill(0)]
  }
  if (frames.length === 0) {
    return Array.from({ length: target }, () =>
      new Array<number>(FRAME_VECTOR_SIZE).fill(0),
    )
  }
  if (frames.length === 1) {
    return Array.from({ length: target }, () => frames[0]!.vector.slice())
  }

  const times = frames.map((frame) => frame.timestamp)
  const start = times[0]!
  const end = times[times.length - 1]!
  if (end <= start) {
    return Array.from({ length: target }, (_, index) => {
      const sourceIndex = Math.min(
        frames.length - 1,
        Math.round((index * (frames.length - 1)) / (target - 1)),
      )
      return frames[sourceIndex]!.vector.slice()
    })
  }

  const result: number[][] = []
  let cursor = 0
  for (let index = 0; index < target; index += 1) {
    const targetTime = start + ((end - start) * index) / (target - 1)
    while (cursor < times.length - 2 && times[cursor + 1]! < targetTime) {
      cursor += 1
    }
    const left = cursor
    const right = Math.min(cursor + 1, frames.length - 1)
    const span = times[right]! - times[left]!
    const alpha = span <= 0 ? 0 : (targetTime - times[left]!) / span
    result.push(lerpVector(frames[left]!.vector, frames[right]!.vector, Math.min(1, Math.max(0, alpha))))
  }
  return result
}

export class GestureSequenceBuffer {
  private frames: BufferedFrame[] = []

  get size(): number {
    return this.frames.length
  }

  clear(): void {
    this.frames = []
  }

  push(timestamp: number, vector: number[]): void {
    if (vector.length !== FRAME_VECTOR_SIZE) return
    this.frames.push({ timestamp, vector: vector.slice() })
    if (this.frames.length > MAX_BUFFERED_FRAMES) {
      this.frames.splice(0, this.frames.length - MAX_BUFFERED_FRAMES)
    }
  }

  window(windowMs = DEFAULT_WINDOW_MS): BufferedFrame[] {
    if (this.frames.length === 0) return []
    const latest = this.frames[this.frames.length - 1]!.timestamp
    return this.frames.filter((frame) => latest - frame.timestamp <= windowMs)
  }

  isReady(windowMs = DEFAULT_WINDOW_MS, minFrames = MIN_SEQUENCE_FRAMES): boolean {
    return this.window(windowMs).length >= minFrames
  }

  snapshot(windowMs = DEFAULT_WINDOW_MS, target = SEQUENCE_LENGTH): number[][] | null {
    const frames = this.window(windowMs)
    if (frames.length < MIN_SEQUENCE_FRAMES) return null
    return resampleVectors(frames, target)
  }
}

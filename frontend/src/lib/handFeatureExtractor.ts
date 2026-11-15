import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { TrackedHand } from './handTracking'

/**
 * Versioned feature contract shared with backend/app/recognition/features.py.
 * Changes require bumping FEATURE_VERSION and retraining the model.
 */
export const FEATURE_VERSION = 3
export const MAX_FEATURE_HANDS = 2
export const HAND_VECTOR_SIZE = 85
export const INTER_HAND_VECTOR_SIZE = 2
export const FACE_VECTOR_SIZE = 7
export const FRAME_VECTOR_SIZE =
  HAND_VECTOR_SIZE * MAX_FEATURE_HANDS + INTER_HAND_VECTOR_SIZE + FACE_VECTOR_SIZE // 179

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'
export type HandednessName = 'Left' | 'Right' | 'Unknown'

export const FINGER_CHAINS: Record<FingerName, [number, number, number, number]> = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
}

const FINGERS = Object.keys(FINGER_CHAINS) as FingerName[]
const PALM_INDICES = [0, 5, 9, 13, 17]

export interface FeaturePoint {
  x: number
  y: number
  z: number
}

export interface HandFeatures {
  trackId: number
  handedness: HandednessName
  landmarks: FeaturePoint[]
  normalisedLandmarks: FeaturePoint[]
  wrist: FeaturePoint
  palmCenter: FeaturePoint
  palmScale: number
  apparentSize: number
  fingerExtension: Record<FingerName, boolean>
  fingerAngles: Record<FingerName, number>
  thumbIndexPinch: number
  palmOrientation: FeaturePoint
  wristOrientation: { x: number; y: number }
  velocity: FeaturePoint
  depth: number
}

export interface FrameFeatures {
  timestamp: number
  hands: HandFeatures[]
  modelVector: number[]
  interWristDistance: number | null
}

interface PreviousHandState {
  wrist: FeaturePoint
  timestamp: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toPoint(landmark: NormalizedLandmark): FeaturePoint {
  return { x: landmark.x, y: landmark.y, z: landmark.z }
}

function distance(a: FeaturePoint, b: FeaturePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

function angleAt(a: FeaturePoint, vertex: FeaturePoint, b: FeaturePoint): number {
  const ax = a.x - vertex.x
  const ay = a.y - vertex.y
  const az = a.z - vertex.z
  const bx = b.x - vertex.x
  const by = b.y - vertex.y
  const bz = b.z - vertex.z
  const aLength = Math.hypot(ax, ay, az)
  const bLength = Math.hypot(bx, by, bz)
  if (aLength < 1e-6 || bLength < 1e-6) return 0
  const cosine = (ax * bx + ay * by + az * bz) / (aLength * bLength)
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI
}

function clampHandedness(handedness: string): HandednessName {
  const normalised = handedness.trim().toLowerCase()
  if (normalised === 'left') return 'Left'
  if (normalised === 'right') return 'Right'
  return 'Unknown'
}

function handednessValue(handedness: HandednessName): number {
  if (handedness === 'Left') return -1
  if (handedness === 'Right') return 1
  return 0
}

function createZeroVector(): number[] {
  return new Array<number>(FRAME_VECTOR_SIZE).fill(0)
}

function normaliseSingleHand(hand: HandFeatures): number[] {
  const vector: number[] = []
  const wrist = hand.landmarks[0]
  if (!wrist) return new Array<number>(HAND_VECTOR_SIZE).fill(0)
  const scale = Math.max(hand.palmScale, 1e-6)

  // 1. 21 normalized landmarks relative to wrist (63 floats)
  for (const landmark of hand.landmarks) {
    vector.push((landmark.x - wrist.x) / scale)
    vector.push((landmark.y - wrist.y) / scale)
    vector.push((landmark.z - wrist.z) / scale)
  }

  // 2. Wrist position in frame (3 floats: abs(x-0.5), y-0.5, z)
  vector.push(Math.abs(wrist.x - 0.5))
  vector.push(wrist.y - 0.5)
  vector.push(wrist.z)

  // 3. Wrist velocity (3 floats)
  vector.push(hand.velocity.x)
  vector.push(hand.velocity.y)
  vector.push(hand.velocity.z)

  // 4. Finger extension (5 floats: 1 or 0)
  for (const finger of FINGERS) {
    vector.push(hand.fingerExtension[finger] ? 1 : 0)
  }

  // 5. Finger angles (5 floats: 0 to 1)
  for (const finger of FINGERS) {
    vector.push(Math.min(1, Math.max(0, (hand.fingerAngles[finger] ?? 0) / 180)))
  }

  // 6. Palm orientation (3 floats)
  vector.push(hand.palmOrientation.x)
  vector.push(hand.palmOrientation.y)
  vector.push(hand.palmOrientation.z)

  // 7. Scale, handedness, presence (3 floats)
  vector.push(scale)
  vector.push(handednessValue(hand.handedness))
  vector.push(1)

  return vector
}

function extractHand(
  hand: TrackedHand,
  previous: PreviousHandState | undefined,
  timestamp: number,
): HandFeatures | null {
  if (hand.landmarks.length < 21) return null
  const landmarks = hand.landmarks.map(toPoint)
  const wrist = landmarks[0]
  if (!wrist) return null
  const middleMcp = landmarks[9]
  if (!middleMcp) return null

  const palmScale = Math.max(
    Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y),
    1e-6,
  )
  const palmCenter = PALM_INDICES.reduce<FeaturePoint>(
    (accumulator, index) => {
      const point = landmarks[index]
      if (!point) return accumulator
      accumulator.x += point.x / PALM_INDICES.length
      accumulator.y += point.y / PALM_INDICES.length
      accumulator.z += point.z / PALM_INDICES.length
      return accumulator
    },
    { x: 0, y: 0, z: 0 },
  )

  const normalisedLandmarks = landmarks.map((point) => ({
    x: (point.x - wrist.x) / palmScale,
    y: (point.y - wrist.y) / palmScale,
    z: (point.z - wrist.z) / palmScale,
  }))

  const fingerExtension = {} as Record<FingerName, boolean>
  const fingerAngles = {} as Record<FingerName, number>
  for (const finger of FINGERS) {
    const [mcpIndex, pipIndex, dipIndex, tipIndex] = FINGER_CHAINS[finger]
    const mcp = landmarks[mcpIndex]
    const pip = landmarks[pipIndex]
    const dip = landmarks[dipIndex]
    const tip = landmarks[tipIndex]
    if (!mcp || !pip || !dip || !tip) {
      fingerExtension[finger] = false
      fingerAngles[finger] = 0
      continue
    }
    const wristToTip = distance(wrist, tip)
    const wristToPip = distance(wrist, pip)
    const wristToMcp = distance(wrist, mcp)
    fingerExtension[finger] =
      wristToTip > wristToMcp * 1.08 && wristToTip > wristToPip * 1.02
    fingerAngles[finger] = angleAt(mcp, pip, tip)
  }

  const indexMcp = landmarks[5]
  const pinkyMcp = landmarks[17]
  let palmOrientation: FeaturePoint = { x: 0, y: 0, z: 0 }
  if (indexMcp && pinkyMcp) {
    const a = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: indexMcp.z - wrist.z }
    const b = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: pinkyMcp.z - wrist.z }
    const nx = a.y * b.z - a.z * b.y
    const ny = a.z * b.x - a.x * b.z
    const nz = a.x * b.y - a.y * b.x
    const length = Math.hypot(nx, ny, nz)
    if (length > 1e-6) {
      palmOrientation = { x: nx / length, y: ny / length, z: nz / length }
    }
  }

  const wristVectorX = middleMcp.x - wrist.x
  const wristVectorY = middleMcp.y - wrist.y
  const wristLength = Math.max(Math.hypot(wristVectorX, wristVectorY), 1e-6)
  const wristOrientation = {
    x: wristVectorX / wristLength,
    y: wristVectorY / wristLength,
  }

  let velocity: FeaturePoint = { x: 0, y: 0, z: 0 }
  if (previous) {
    const elapsedSeconds = Math.max(0.001, (timestamp - previous.timestamp) / 1000)
    velocity = {
      x: (wrist.x - previous.wrist.x) / palmScale / elapsedSeconds,
      y: (wrist.y - previous.wrist.y) / palmScale / elapsedSeconds,
      z: (wrist.z - previous.wrist.z) / palmScale / elapsedSeconds,
    }
  }

  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const thumbIndexPinch =
    thumbTip && indexTip ? distance(thumbTip, indexTip) / palmScale : 0

  return {
    trackId: hand.id,
    handedness: clampHandedness(hand.handedness),
    landmarks,
    normalisedLandmarks,
    wrist,
    palmCenter,
    palmScale,
    apparentSize: hand.apparentSize,
    fingerExtension,
    fingerAngles,
    thumbIndexPinch,
    palmOrientation,
    wristOrientation,
    velocity,
    depth: wrist.z,
  }
}

export class HandFeatureExtractor {
  private previous = new Map<number, PreviousHandState>()

  reset(): void {
    this.previous.clear()
  }

  update(
    hands: TrackedHand[],
    timestamp: number,
    faceLandmarks: NormalizedLandmark[] = [],
  ): FrameFeatures {
    const valid: HandFeatures[] = []
    for (const hand of hands) {
      const features = extractHand(hand, this.previous.get(hand.id), timestamp)
      if (!features) continue
      valid.push(features)
      this.previous.set(hand.id, { wrist: features.wrist, timestamp })
    }

    const activeIds = new Set(hands.map((hand) => hand.id))
    for (const id of this.previous.keys()) {
      if (!activeIds.has(id)) this.previous.delete(id)
    }

    // Sort by apparent size: primary (largest/active) hand FIRST!
    valid.sort((a, b) => b.apparentSize - a.apparentSize)

    const modelVector = createZeroVector()

    // Hand 0 (Primary)
    if (valid[0]) {
      const v0 = normaliseSingleHand(valid[0])
      for (let i = 0; i < HAND_VECTOR_SIZE; i += 1) {
        modelVector[i] = v0[i] ?? 0
      }
    }

    // Hand 1 (Secondary)
    if (valid[1]) {
      const v1 = normaliseSingleHand(valid[1])
      const offset = HAND_VECTOR_SIZE
      for (let i = 0; i < HAND_VECTOR_SIZE; i += 1) {
        modelVector[offset + i] = v1[i] ?? 0
      }
    }

    // Inter-hand relation (2 floats)
    const interOffset = HAND_VECTOR_SIZE * 2
    if (valid.length >= 2 && valid[0] && valid[1]) {
      modelVector[interOffset] = distance(valid[0].wrist, valid[1].wrist)
      modelVector[interOffset + 1] = 1
    }

    // Face features (7 floats)
    const faceOffset = interOffset + INTER_HAND_VECTOR_SIZE
    if (faceLandmarks.length >= 5 && faceLandmarks[1]) {
      const nose = faceLandmarks[1]
      modelVector[faceOffset] = Math.abs(nose.x - 0.5)
      modelVector[faceOffset + 1] = nose.y - 0.5
      modelVector[faceOffset + 2] = nose.z

      if (valid[0]) {
        modelVector[faceOffset + 3] = Math.abs(valid[0].wrist.x - nose.x)
        modelVector[faceOffset + 4] = valid[0].wrist.y - nose.y
        modelVector[faceOffset + 5] = valid[0].wrist.z - nose.z
      }
      modelVector[faceOffset + 6] = 1
    }

    let interWristDistance: number | null = null
    if (valid.length >= 2 && valid[0] && valid[1]) {
      const scale = Math.max((valid[0].palmScale + valid[1].palmScale) / 2, 1e-6)
      interWristDistance = distance(valid[0].wrist, valid[1].wrist) / scale
    }

    return { timestamp, hands: valid, modelVector, interWristDistance }
  }
}

export function isLandmarkPresent(value: unknown): value is NormalizedLandmark {
  if (!value || typeof value !== 'object') return false
  const landmark = value as Partial<NormalizedLandmark>
  return isFiniteNumber(landmark.x) && isFiniteNumber(landmark.y) && isFiniteNumber(landmark.z)
}

export function extractCompactFacePoints(
  faceLandmarks: NormalizedLandmark[] = [],
): [number, number, number][] {
  if (!faceLandmarks || faceLandmarks.length < 5) return []
  const indices = [1, 33, 263, 152, 10]
  const points: [number, number, number][] = []
  for (const idx of indices) {
    const pt = faceLandmarks[idx]
    if (pt && isLandmarkPresent(pt)) {
      points.push([pt.x, pt.y, pt.z])
    }
  }
  return points
}

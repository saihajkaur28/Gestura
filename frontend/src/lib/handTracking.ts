import type { HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision'

export type DetectionRange = 'near' | 'medium' | 'far'

export interface RangeSettings {
  label: string
  description: string
  enterThreshold: number
  exitThreshold: number
}

export const DETECTION_RANGES: Record<DetectionRange, RangeSettings> = {
  near: {
    label: 'Near',
    description: 'Track only hands held close to the camera.',
    enterThreshold: 0.045,
    exitThreshold: 0.03,
  },
  medium: {
    label: 'Medium',
    description: 'Track hands at a typical desktop distance.',
    enterThreshold: 0.015,
    exitThreshold: 0.01,
  },
  far: {
    label: 'Far',
    description: 'Track hands further away, including more background detections.',
    enterThreshold: 0.006,
    exitThreshold: 0.0038,
  },
}

const MAX_RENDER_HANDS = 2
const MAX_TRACKS = 8
const MATCH_DISTANCE = 0.22
const SELECTED_BOOST = 1.12
const TRACK_TTL_MS = 320
const SIZE_SMOOTHING_MS = 90
const LANDMARK_SMOOTHING_MS = 8
const PRESENCE_RISE_MS = 90
const PRESENCE_FALL_MS = 160

export interface TrackedHand {
  id: number
  landmarks: NormalizedLandmark[]
  handedness: string
  apparentSize: number
  presence: number
}

export interface TrackingResult {
  renderHands: TrackedHand[]
  activeHands: TrackedHand[]
}

interface HandMetrics {
  centroidX: number
  centroidY: number
  apparentSize: number
}

interface DetectedHand extends Omit<TrackedHand, 'id' | 'presence'> {
  centroidX: number
  centroidY: number
}

interface HandTrack extends TrackedHand {
  active: boolean
  lastSeen: number
  centroidX: number
  centroidY: number
}

interface CandidateMatch {
  track: HandTrack
  candidateIndex: number
  distance: number
}

function cloneLandmarks(landmarks: NormalizedLandmark[]): NormalizedLandmark[] {
  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
    presence: landmark.presence,
  }))
}

function computeMetrics(landmarks: NormalizedLandmark[]): HandMetrics | null {
  if (landmarks.length === 0) return null

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let sumX = 0
  let sumY = 0

  for (const landmark of landmarks) {
    minX = Math.min(minX, landmark.x)
    minY = Math.min(minY, landmark.y)
    maxX = Math.max(maxX, landmark.x)
    maxY = Math.max(maxY, landmark.y)
    sumX += landmark.x
    sumY += landmark.y
  }

  const width = Math.max(0, maxX - minX)
  const height = Math.max(0, maxY - minY)

  return {
    centroidX: sumX / landmarks.length,
    centroidY: sumY / landmarks.length,
    apparentSize: width * height,
  }
}

function smoothingAlpha(deltaMs: number, timeConstantMs: number): number {
  return deltaMs <= 0 ? 1 : 1 - Math.exp(-deltaMs / timeConstantMs)
}

function interpolateLandmarks(
  from: NormalizedLandmark[],
  to: NormalizedLandmark[],
  alpha: number,
): NormalizedLandmark[] {
  if (from.length !== to.length) return cloneLandmarks(to)
  return to.map((target, index) => {
    const source = from[index]
    return {
      x: source.x + (target.x - source.x) * alpha,
      y: source.y + (target.y - source.y) * alpha,
      z: source.z + (target.z - source.z) * alpha,
      visibility: target.visibility,
      presence: target.presence,
    }
  })
}

function detectHands(result: HandLandmarkerResult): DetectedHand[] {
  const hands: DetectedHand[] = []
  result.landmarks.forEach((landmarks, index) => {
    const metrics = computeMetrics(landmarks)
    if (!metrics) return
    hands.push({
      landmarks: cloneLandmarks(landmarks),
      handedness: result.handedness[index]?.[0]?.categoryName ?? 'Unknown',
      centroidX: metrics.centroidX,
      centroidY: metrics.centroidY,
      apparentSize: metrics.apparentSize,
    })
  })
  return hands
}

export class HandTracker {
  private tracks: HandTrack[] = []
  private selectedIds = new Set<number>()
  private nextId = 1
  private lastTimestamp: number | null = null
  private enterThreshold: number
  private exitThreshold: number

  constructor(range: DetectionRange = 'medium') {
    const settings = DETECTION_RANGES[range]
    this.enterThreshold = settings.enterThreshold
    this.exitThreshold = settings.exitThreshold
  }

  setRange(range: DetectionRange): void {
    const settings = DETECTION_RANGES[range]
    this.enterThreshold = settings.enterThreshold
    this.exitThreshold = settings.exitThreshold
  }

  reset(): void {
    this.tracks = []
    this.selectedIds.clear()
    this.nextId = 1
    this.lastTimestamp = null
  }

  update(result: HandLandmarkerResult, timestamp: number): TrackingResult {
    const deltaMs =
      this.lastTimestamp === null ? 16 : Math.max(1, timestamp - this.lastTimestamp)
    this.lastTimestamp = timestamp

    const candidates = detectHands(result)
    const matchedCandidates = new Set<number>()
    const updatedTracks = new Set<number>()
    const matches: CandidateMatch[] = []

    for (const track of this.tracks) {
      candidates.forEach((candidate, index) => {
        if (matchedCandidates.has(index)) return
        const distance = Math.hypot(
          candidate.centroidX - track.centroidX,
          candidate.centroidY - track.centroidY,
        )
        if (distance <= MATCH_DISTANCE) {
          matches.push({ track, candidateIndex: index, distance })
        }
      })
    }

    matches.sort((a, b) => a.distance - b.distance)

    for (const match of matches) {
      if (updatedTracks.has(match.track.id) || matchedCandidates.has(match.candidateIndex)) {
        continue
      }
      const candidate = candidates[match.candidateIndex]
      if (!candidate) continue
      updatedTracks.add(match.track.id)
      matchedCandidates.add(match.candidateIndex)
      this.applyCandidate(match.track, candidate, deltaMs, timestamp)
    }

    candidates.forEach((candidate, index) => {
      if (matchedCandidates.has(index)) return
      if (candidate.apparentSize < this.enterThreshold) return
      if (this.tracks.length >= MAX_TRACKS) return
      this.createTrack(candidate, timestamp)
    })

    const live = this.tracks.filter(
      (track) => track.active && timestamp - track.lastSeen <= TRACK_TTL_MS,
    )
    live.sort((a, b) => {
      const aScore = a.apparentSize * (this.selectedIds.has(a.id) ? SELECTED_BOOST : 1)
      const bScore = b.apparentSize * (this.selectedIds.has(b.id) ? SELECTED_BOOST : 1)
      return bScore - aScore
    })

    const active = live.slice(0, MAX_RENDER_HANDS)
    const selected = new Set(active.map((track) => track.id))

    for (const track of this.tracks) {
      const target = selected.has(track.id) ? 1 : 0
      const alpha = smoothingAlpha(
        deltaMs,
        target > track.presence ? PRESENCE_RISE_MS : PRESENCE_FALL_MS,
      )
      track.presence += (target - track.presence) * alpha
      if (target === 0 && track.presence < 0.01) {
        track.presence = 0
      }
    }

    this.tracks = this.tracks.filter(
      (track) => timestamp - track.lastSeen <= TRACK_TTL_MS || track.presence > 0.02,
    )
    this.selectedIds = selected

    const extras = this.tracks
      .filter((track) => !selected.has(track.id) && track.presence > 0.02)
      .sort((a, b) => b.presence - a.presence)

    const renderTracks = [...active]
    for (const track of extras) {
      if (renderTracks.length >= MAX_RENDER_HANDS) break
      renderTracks.push(track)
    }

    return {
      renderHands: renderTracks.map((track) => this.toTrackedHand(track)),
      activeHands: active.map((track) => this.toTrackedHand(track)),
    }
  }

  private applyCandidate(
    track: HandTrack,
    candidate: DetectedHand,
    deltaMs: number,
    timestamp: number,
  ): void {
    const landmarkAlpha = smoothingAlpha(deltaMs, LANDMARK_SMOOTHING_MS)
    track.landmarks = interpolateLandmarks(track.landmarks, candidate.landmarks, landmarkAlpha)

    const sizeAlpha = smoothingAlpha(deltaMs, SIZE_SMOOTHING_MS)
    track.apparentSize += (candidate.apparentSize - track.apparentSize) * sizeAlpha

    const metrics = computeMetrics(track.landmarks)
    if (metrics) {
      track.centroidX = metrics.centroidX
      track.centroidY = metrics.centroidY
    }

    track.handedness = candidate.handedness
    track.lastSeen = timestamp
    this.updateActive(track)
  }

  private createTrack(candidate: DetectedHand, timestamp: number): void {
    this.tracks.push({
      id: this.nextId,
      landmarks: candidate.landmarks,
      handedness: candidate.handedness,
      apparentSize: candidate.apparentSize,
      active: true,
      lastSeen: timestamp,
      presence: 0,
      centroidX: candidate.centroidX,
      centroidY: candidate.centroidY,
    })
    this.nextId += 1
  }

  private updateActive(track: HandTrack): void {
    if (track.active) {
      if (track.apparentSize < this.exitThreshold) {
        track.active = false
      }
    } else if (track.apparentSize >= this.enterThreshold) {
      track.active = true
    }
  }

  private toTrackedHand(track: HandTrack): TrackedHand {
    return {
      id: track.id,
      landmarks: track.landmarks,
      handedness: track.handedness,
      apparentSize: track.apparentSize,
      presence: track.presence,
    }
  }
}

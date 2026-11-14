export interface RawPrediction {
  label: string
  confidence: number
}

export type StabilizerStatus =
  | 'idle'
  | 'recognising'
  | 'confirmed'
  | 'unknown'
  | 'released'

export interface StabilizerSnapshot {
  status: StabilizerStatus
  displayLabel: string | null
  displayConfidence: number | null
  committed: string | null
  stableVotes: number
}

export interface StabilizerConfig {
  confidenceThreshold: number
  minVotes: number
  voteWindowMs: number
  releaseMs: number
  mismatchReleaseMs: number
  cooldownMs: number
  displayHoldMs: number
}

const DEFAULT_CONFIG: StabilizerConfig = {
  confidenceThreshold: 0.6,
  minVotes: 4,
  voteWindowMs: 1400,
  releaseMs: 750,
  mismatchReleaseMs: 600,
  cooldownMs: 900,
  displayHoldMs: 450,
}

interface Vote {
  label: string
  confidence: number
  timestamp: number
}

export class PredictionStabilizer {
  private config: StabilizerConfig
  private votes: Vote[] = []
  private lockedLabel: string | null = null
  private lastConfidentAt = 0
  private mismatchSince: number | null = null
  private lastCommitAt = 0
  private displayLabel: string | null = null
  private displayConfidence: number | null = null
  private lastCommittedLabel: string | null = null

  constructor(config: Partial<StabilizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  reset(): void {
    this.votes = []
    this.lockedLabel = null
    this.lastConfidentAt = 0
    this.mismatchSince = null
    this.lastCommitAt = 0
    this.displayLabel = null
    this.displayConfidence = null
    this.lastCommittedLabel = null
  }

  get lastCommitted(): string | null {
    return this.lastCommittedLabel
  }

  get isLocked(): boolean {
    return this.lockedLabel !== null
  }

  private unlock(now: number): void {
    this.lockedLabel = null
    this.mismatchSince = null
    this.votes = []
    this.lastConfidentAt = now - this.config.releaseMs
  }

  private trimVotes(now: number): void {
    this.votes = this.votes.filter(
      (vote) => now - vote.timestamp <= this.config.voteWindowMs,
    )
  }

  push(prediction: RawPrediction | null, now: number): StabilizerSnapshot {
    const confident =
      prediction !== null && prediction.confidence >= this.config.confidenceThreshold

    if (confident && prediction) {
      this.lastConfidentAt = now
      this.displayLabel = prediction.label
      this.displayConfidence = prediction.confidence
      this.votes.push({
        label: prediction.label,
        confidence: prediction.confidence,
        timestamp: now,
      })
      this.trimVotes(now)
    } else if (now - this.lastConfidentAt > this.config.displayHoldMs) {
      this.displayLabel = null
      this.displayConfidence = null
      this.votes = []
    }

    let status: StabilizerStatus = 'idle'
    let committed: string | null = null

    if (this.lockedLabel !== null) {
      if (confident && prediction && prediction.label !== this.lockedLabel) {
        this.mismatchSince ??= now
        if (now - this.mismatchSince >= this.config.mismatchReleaseMs) {
          this.unlock(now)
          status = 'released'
        }
      } else {
        this.mismatchSince = null
      }

      if (this.lockedLabel !== null && now - this.lastConfidentAt >= this.config.releaseMs) {
        this.unlock(now)
        status = 'released'
      }

      if (this.lockedLabel !== null) {
        return {
          status: 'confirmed',
          displayLabel: this.displayLabel,
          displayConfidence: this.displayConfidence,
          committed: null,
          stableVotes: this.votes.length,
        }
      }
    }

    if (confident) {
      const counts = new Map<string, { count: number; confidence: number }>()
      for (const vote of this.votes) {
        const entry = counts.get(vote.label) ?? { count: 0, confidence: 0 }
        entry.count += 1
        entry.confidence += vote.confidence
        counts.set(vote.label, entry)
      }

      let winner: string | null = null
      let winnerCount = 0
      let winnerConfidence = 0
      for (const [label, entry] of counts) {
        const average = entry.confidence / entry.count
        if (
          entry.count > winnerCount ||
          (entry.count === winnerCount && average > winnerConfidence)
        ) {
          winner = label
          winnerCount = entry.count
          winnerConfidence = average
        }
      }

      const cooldownElapsed =
        this.lastCommitAt === 0 || now - this.lastCommitAt >= this.config.cooldownMs

      if (
        winner !== null &&
        winnerCount >= this.config.minVotes &&
        winnerConfidence >= this.config.confidenceThreshold &&
        cooldownElapsed
      ) {
        this.lockedLabel = winner
        this.lastCommittedLabel = winner
        this.lastCommitAt = now
        this.lastConfidentAt = now
        this.votes = []
        this.displayLabel = winner
        this.displayConfidence = winnerConfidence
        committed = winner
        status = 'confirmed'
      } else if (status !== 'released') {
        status = 'recognising'
      }
    } else if (status !== 'released') {
      status = this.displayLabel === null ? 'idle' : 'unknown'
    }

    return {
      status,
      displayLabel: this.displayLabel,
      displayConfidence: this.displayConfidence,
      committed,
      stableVotes: this.votes.length,
    }
  }
}

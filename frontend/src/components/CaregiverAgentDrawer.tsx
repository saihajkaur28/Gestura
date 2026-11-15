import { useState, useEffect } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  HeartPulse,
  Lock,
  Send,
  Zap,
} from 'lucide-react'
import {
  evaluateMaritimeTriage,
  fetchMaritimeStatus,
  fetchPruneMetrics,
} from '../lib/api'
import type {
  MaritimeStatusResponse,
  MaritimeTriageResponse,
  PruneMetricsResponse,
} from '../lib/api'


interface CaregiverAgentDrawerProps {
  sentence: string[]
  lastCommitted: string | null
}

export default function CaregiverAgentDrawer({
  sentence,
  lastCommitted,
}: CaregiverAgentDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [triageResult, setTriageResult] = useState<MaritimeTriageResponse | null>(null)
  const [maritimeStatus, setMaritimeStatus] = useState<MaritimeStatusResponse | null>(null)
  const [pruneMetrics, setPruneMetrics] = useState<PruneMetricsResponse | null>(null)
  const [customInput, setCustomInput] = useState('')

  // Load status on mount
  useEffect(() => {
    fetchMaritimeStatus().then(setMaritimeStatus).catch(console.error)
    fetchPruneMetrics().then(setPruneMetrics).catch(console.error)
  }, [])

  // Auto-triage for critical emergency keywords
  const activeSign = lastCommitted?.toLowerCase() || ''
  const isUrgentSign = ['help', 'pain', 'emergency', 'doctor', 'water'].includes(activeSign)

  const handleRunTriage = async (signsToEvaluate?: string[]) => {
    setLoading(true)
    const signs = signsToEvaluate || (sentence.length > 0 ? sentence : activeSign ? [activeSign] : ['help'])
    try {
      const res = await evaluateMaritimeTriage(signs)
      setTriageResult(res)
      // refresh Prune metrics after query
      fetchPruneMetrics().then(setPruneMetrics).catch(console.error)
    } catch (err) {
      console.error('Failed to run Maritime triage:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customInput.trim()) return
    const words = customInput.trim().split(/\s+/)
    handleRunTriage(words)
    setCustomInput('')
  }

  const getTriageBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL_EMERGENCY':
        return { label: 'CRITICAL EMERGENCY (CODE ALERT)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
      case 'URGENT_CARE':
        return { label: 'URGENT MEDICAL CARE', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
      case 'ROUTINE_COMFORT':
        return { label: 'ROUTINE COMFORT & HYDRATION', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
      default:
        return { label: 'PATIENT COMMUNICATION', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' }
    }
  }

  const badgeInfo = triageResult ? getTriageBadge(triageResult.triage_level) : null

  return (
    <div className="caregiver-drawer-container">
      {/* Header / Toggle Button */}
      <button
        type="button"
        className="caregiver-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div className="caregiver-toggle-left">
          <div className="agent-icon-wrapper">
            <Bot size={15} strokeWidth={2.2} />
          </div>
          <div className="agent-title-text">
            <span className="agent-title">Autonomous Caregiver AI</span>
            <span className="agent-subtitle">
              Maritime Scale Agents &bull; Prune Security &amp; Cache
            </span>
          </div>
        </div>

        <div className="caregiver-toggle-right">
          {isUrgentSign && !triageResult && (
            <span className="agent-urgent-pill">
              <AlertTriangle size={11} /> Priority Sign: {activeSign.toUpperCase()}
            </span>
          )}
          {triageResult && (
            <span
              className="agent-status-badge"
              style={{ color: badgeInfo?.color, backgroundColor: badgeInfo?.bg }}
            >
              {triageResult.triage_level.replace('_', ' ')}
            </span>
          )}
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Expanded Body */}
      {isOpen && (
        <div className="caregiver-body">
          {/* Platform Badges Row */}
          <div className="platform-badges-row">
            <div className="platform-badge maritime">
              <Zap size={12} strokeWidth={2.5} />
              <span>
                <strong>Maritime Agent Cloud:</strong> {maritimeStatus?.tier || 'Scale (VIHAANX)'}
              </span>
            </div>
            <div className="platform-badge prune">
              <Lock size={12} strokeWidth={2.5} />
              <span>
                <strong>Prune Security:</strong> PII Redactor &bull; Semantic Cache Active
              </span>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="caregiver-actions-bar">
            <button
              type="button"
              className="btn btn-primary agent-eval-btn"
              onClick={() => handleRunTriage()}
              disabled={loading}
            >
              <HeartPulse size={14} />
              {loading ? 'Evaluating Triage...' : 'Evaluate Live Signs with Maritime'}
            </button>

            <form onSubmit={handleCustomSubmit} className="agent-custom-form">
              <input
                type="text"
                placeholder="Or test patient input (e.g. pain chest)..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="agent-input"
              />
              <button type="submit" className="agent-send-btn" disabled={loading || !customInput.trim()}>
                <Send size={13} />
              </button>
            </form>
          </div>

          {/* Triage Result Card */}
          {triageResult && (
            <div className="triage-result-card">
              <div className="triage-header">
                <div className="triage-urgency" style={{ color: badgeInfo?.color }}>
                  <Activity size={14} />
                  <span>{badgeInfo?.label}</span>
                </div>
                <span className="triage-time">
                  Bed: {triageResult.patient_id} &bull; {new Date(triageResult.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="triage-plan">
                <span className="triage-plan-label">Clinical Action Plan:</span>
                <p className="triage-plan-text">{triageResult.action_plan}</p>
              </div>

              <div className="triage-reassurance">
                <span className="triage-plan-label">Bedside Spoken Reassurance:</span>
                <p className="triage-spoken-text">"{triageResult.spoken_reassurance}"</p>
              </div>

              {/* Prune Savings & Metrics Banner */}
              <div className="prune-telemetry-banner">
                <div className="prune-metric">
                  <Clock size={12} />
                  <span>
                    Latency Saved: <strong>{triageResult.prune_metrics.latency_saved_ms}ms</strong>
                  </span>
                </div>
                <div className="prune-metric">
                  <DollarSign size={12} />
                  <span>
                    Cost Saved: <strong>${triageResult.prune_metrics.cost_saved_usd}</strong>
                  </span>
                </div>
                <div className="prune-metric">
                  <CheckCircle2 size={12} />
                  <span>
                    Semantic Cache:{' '}
                    <strong>{triageResult.prune_metrics.cached ? 'HIT (0ms)' : 'STORED'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Prune Telemetry Summary */}
          {pruneMetrics && (
            <div className="prune-metrics-footer">
              <div className="prune-stat">
                <span>Total AI Requests:</span>
                <strong>{pruneMetrics.total_requests}</strong>
              </div>
              <div className="prune-stat">
                <span>Semantic Cache Hits:</span>
                <strong>
                  {pruneMetrics.cache_hits} ({pruneMetrics.cache_hit_rate_pct}%)
                </strong>
              </div>
              <div className="prune-stat">
                <span>Tokens Saved:</span>
                <strong>{pruneMetrics.tokens_saved}</strong>
              </div>
              <div className="prune-stat">
                <span>Total Cost Saved:</span>
                <strong style={{ color: '#10b981' }}>${pruneMetrics.cost_saved_usd}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

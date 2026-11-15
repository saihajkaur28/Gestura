import { Contrast, Check } from 'lucide-react'

interface AccessibilityToggleProps {
  highContrast: boolean
  onToggle: () => void
  compact?: boolean
  showFullLabel?: boolean
}

export default function AccessibilityToggle({
  highContrast,
  onToggle,
  compact = false,
  showFullLabel = false,
}: AccessibilityToggleProps) {
  return (
    <button
      type="button"
      className={`accessibility-toggle-btn ${highContrast ? 'active' : ''} ${
        compact ? 'compact' : ''
      }`}
      onClick={onToggle}
      role="switch"
      aria-checked={highContrast}
      aria-label="Toggle High Contrast and Elderly Accessibility Mode"
      title={
        highContrast
          ? 'High Contrast Mode is active (click to restore default theme)'
          : 'Enable High Contrast Mode for larger text, bold borders, and maximum readability'
      }
    >
      <span className="toggle-icon-wrap" aria-hidden="true">
        <Contrast size={compact ? 16 : 18} strokeWidth={2.4} />
      </span>
      <span className="toggle-label-text">
        {showFullLabel ? 'High Contrast Mode' : 'High Contrast'}
      </span>
      <span className={`toggle-status-badge ${highContrast ? 'on' : 'off'}`}>
        {highContrast ? (
          <>
            <Check size={11} strokeWidth={3} className="check-icon" />
            ON
          </>
        ) : (
          'OFF'
        )}
      </span>
    </button>
  )
}

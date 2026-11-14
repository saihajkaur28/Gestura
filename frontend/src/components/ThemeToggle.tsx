import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to day mode' : 'Switch to night mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to day mode' : 'Switch to night mode'}
    >
      {isDark ? (
        <Sun size={15} strokeWidth={1.9} aria-hidden="true" />
      ) : (
        <Moon size={15} strokeWidth={1.9} aria-hidden="true" />
      )}
      <span>{isDark ? 'Day' : 'Night'}</span>
    </button>
  )
}

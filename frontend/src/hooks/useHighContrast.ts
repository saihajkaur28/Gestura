import { useCallback, useLayoutEffect, useState } from 'react'

const STORAGE_KEY = 'gestura-high-contrast'

function getInitialHighContrast(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored !== null) {
    return stored === 'true'
  }
  return (
    window.matchMedia('(forced-colors: active)').matches ||
    window.matchMedia('(prefers-contrast: more)').matches
  )
}

export function useHighContrast() {
  const [highContrast, setHighContrast] = useState<boolean>(getInitialHighContrast)

  useLayoutEffect(() => {
    if (highContrast) {
      document.documentElement.setAttribute('data-high-contrast', 'true')
      document.body.classList.add('high-contrast')
    } else {
      document.documentElement.removeAttribute('data-high-contrast')
      document.body.classList.remove('high-contrast')
    }
    window.localStorage.setItem(STORAGE_KEY, String(highContrast))
  }, [highContrast])

  const toggleHighContrast = useCallback(() => {
    setHighContrast((curr) => !curr)
  }, [])

  return { highContrast, toggleHighContrast, setHighContrast }
}

import { useCallback, useEffect, useState } from 'react'
import { fetchHealth } from '../lib/api'

type Status = 'checking' | 'online' | 'offline'

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking')
  const [version, setVersion] = useState<string | null>(null)

  const check = useCallback(async () => {
    try {
      const health = await fetchHealth()
      setVersion(health.version)
      setStatus('online')
    } catch (error) {
      console.warn('[api] Backend health check failed.', error)
      setVersion(null)
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function runCheck() {
      try {
        const health = await fetchHealth()
        if (cancelled) return
        setVersion(health.version)
        setStatus('online')
      } catch (error) {
        if (cancelled) return
        console.warn('[api] Backend health check failed.', error)
        setVersion(null)
        setStatus('offline')
      }
    }

    void runCheck()
    const intervalId = window.setInterval(() => {
      void runCheck()
    }, 30000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <button
      type="button"
      className={`backend-status ${status}`}
      onClick={() => {
        setStatus('checking')
        void check()
      }}
      title="Check backend health"
    >
      <span className="dot" aria-hidden="true" />
      <span>
        API {status}
        {version ? ` · v${version}` : ''}
      </span>
    </button>
  )
}

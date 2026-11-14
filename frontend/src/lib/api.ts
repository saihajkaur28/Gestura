const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined

export const API_BASE_URL = (
  configuredBase && configuredBase.trim() !== '' ? configuredBase : 'http://localhost:8000'
).replace(/\/+$/, '')

export interface HealthResponse {
  status: string
  app: string
  version: string
  time: string
  videos_dir: string
  videos_dir_exists: boolean
  video_signs: number
}

export interface SignInfo {
  sign: string
  filename: string
  video_url: string
}

export interface SignsResponse {
  videos_dir: string
  count: number
  signs: SignInfo[]
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

export function fetchHealth(): Promise<HealthResponse> {
  return getJson<HealthResponse>('/health')
}

export function fetchSigns(): Promise<SignsResponse> {
  return getJson<SignsResponse>('/api/signs')
}

export function resolveMediaUrl(videoUrl: string): string {
  return `${API_BASE_URL}${videoUrl}`
}

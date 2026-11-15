const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined

export const API_BASE_URL = (
  configuredBase && configuredBase.trim() !== '' ? configuredBase : 'http://127.0.0.1:8000'
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

import { ASL_CATALOG } from './aslCatalog'

export interface SignInfo {
  sign: string
  filename: string
  video_url: string
  frontend_video_url?: string
  gloss?: string
  keywords?: string[]
  source?: string
  attribution?: string
  license?: string
  status?: string
  description?: string
  category?: string
  avatar_animation?: string | null
}

export interface SignsResponse {
  language?: string
  source?: string
  license?: string
  videos_dir?: string
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

export async function fetchSigns(): Promise<SignsResponse> {
  try {
    const data = await getJson<SignsResponse>('/api/signs')
    if (data.signs && data.signs.length > 0) {
      return data
    }
  } catch (error) {
    console.info('[api] Falling back to bundled ASL catalog.', error)
  }

  // Resilient fallback to verified bundled ASL library
  return {
    language: 'ASL',
    count: ASL_CATALOG.length,
    source: 'ASL Signbank (Haskins Laboratories / Yale University)',
    license: 'Educational and Non-Commercial Research Use with Attribution',
    signs: ASL_CATALOG.map((item) => ({
      sign: item.id,
      gloss: item.gloss,
      keywords: item.keywords,
      filename: item.filename,
      video_url: item.video_url,
      frontend_video_url: item.frontend_video_url,
      source: item.source,
      attribution: item.attribution,
      license: item.license,
      status: item.status,
      description: item.description,
      category: item.category,
      avatar_animation: item.avatar_animation,
    })),
  }
}

export function resolveMediaUrl(videoUrl: string): string {
  if (!videoUrl) return ''
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return videoUrl
  }
  // If static public video URL, return directly for fast browser streaming
  if (videoUrl.startsWith('/videos/asl/')) {
    return videoUrl
  }
  if (videoUrl.startsWith('/media/asl/')) {
    // Prefer static public folder if available, else backend endpoint
    const filename = videoUrl.replace('/media/asl/', '')
    return `/videos/asl/${filename}`
  }
  return `${API_BASE_URL}${videoUrl}`
}

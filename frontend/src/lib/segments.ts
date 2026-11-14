import type { SignInfo } from './api'

export interface SignSegment {
  text: string
  sign: SignInfo | null
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function segmentText(text: string, signs: SignInfo[]): SignSegment[] {
  const lookup = new Map<string, SignInfo>()
  let maxWords = 1

  for (const sign of signs) {
    const key = normalize(sign.sign.replace(/_/g, ' '))
    if (!key) continue
    lookup.set(key, sign)
    maxWords = Math.max(maxWords, key.split(' ').length)
  }

  const tokens = text.trim().split(/\s+/).filter(Boolean)
  const segments: SignSegment[] = []
  let index = 0

  while (index < tokens.length) {
    let matched = false
    const limit = Math.min(maxWords, tokens.length - index)

    for (let size = limit; size >= 1; size -= 1) {
      const raw = tokens.slice(index, index + size).join(' ')
      const sign = lookup.get(normalize(raw))
      if (sign) {
        segments.push({ text: raw, sign })
        index += size
        matched = true
        break
      }
    }

    if (!matched) {
      segments.push({ text: tokens[index], sign: null })
      index += 1
    }
  }

  return segments
}

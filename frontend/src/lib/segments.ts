import type { SignInfo } from './api'

export interface SignSegment {
  text: string
  sign: SignInfo | null
  aslGloss?: string
  isFingerspelled?: boolean
  letters?: string[]
  reason?: string
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Lemmatization and stem mapping for common English variations to ASL base concepts
const STEM_MAP: Record<string, string> = {
  helping: 'help',
  helped: 'help',
  helps: 'help',
  assistant: 'help',
  assisting: 'help',
  thanks: 'thank you',
  thanked: 'thank you',
  thanking: 'thank you',
  drinking: 'water',
  drinks: 'water',
  drank: 'water',
  eating: 'eat',
  ate: 'eat',
  eats: 'eat',
  meals: 'eat',
  food: 'eat',
  waiting: 'wait',
  waited: 'wait',
  waits: 'wait',
  wanting: 'want',
  wanted: 'want',
  wants: 'want',
  needing: 'need',
  needed: 'need',
  needs: 'need',
  hurting: 'pain',
  hurts: 'pain',
  aching: 'pain',
  aches: 'pain',
  restroom: 'bathroom',
  washroom: 'bathroom',
  toilet: 'bathroom',
  physician: 'doctor',
  doctors: 'doctor',
  hospitals: 'hospital',
  urgent: 'emergency',
  crisis: 'emergency',
  friends: 'friend',
  friendly: 'friend',
  bye: 'goodbye',
  byebye: 'goodbye',
  hi: 'hello',
  hey: 'hello',
  greetings: 'hello',
}

export function segmentText(text: string, signs: SignInfo[]): SignSegment[] {
  if (!text || text.trim() === '') return []

  const lookup = new Map<string, SignInfo>()
  let maxWords = 1

  // Index signs by sign id, gloss, and all associated keywords
  for (const sign of signs) {
    const primaryKey = normalize(sign.sign.replace(/_/g, ' '))
    if (primaryKey) {
      lookup.set(primaryKey, sign)
      maxWords = Math.max(maxWords, primaryKey.split(' ').length)
    }

    if (sign.gloss) {
      const glossKey = normalize(sign.gloss.replace(/-/g, ' '))
      if (glossKey) {
        lookup.set(glossKey, sign)
        maxWords = Math.max(maxWords, glossKey.split(' ').length)
      }
    }

    if (Array.isArray(sign.keywords)) {
      for (const kw of sign.keywords) {
        const kwKey = normalize(kw)
        if (kwKey) {
          lookup.set(kwKey, sign)
          maxWords = Math.max(maxWords, kwKey.split(' ').length)
        }
      }
    }
  }

  // Tokenize input by whitespace while tracking word chunks
  const rawTokens = text.trim().split(/\s+/).filter(Boolean)
  const segments: SignSegment[] = []
  let index = 0

  while (index < rawTokens.length) {
    let matched = false
    const limit = Math.min(maxWords, rawTokens.length - index)

    // 1. Try multi-word greedy matching first
    for (let size = limit; size >= 1; size -= 1) {
      const chunk = rawTokens.slice(index, index + size).join(' ')
      const normChunk = normalize(chunk)

      let sign = lookup.get(normChunk)

      // Try stem map if not directly matched
      if (!sign && STEM_MAP[normChunk]) {
        sign = lookup.get(STEM_MAP[normChunk])
      }

      if (sign) {
        segments.push({
          text: chunk,
          sign,
          aslGloss: sign.gloss ?? sign.sign.toUpperCase(),
        })
        index += size
        matched = true
        break
      }
    }

    // 2. If no lexical sign matched, handle single word fallback (fingerspelling for names/unsupported words)
    if (!matched) {
      const token = rawTokens[index]
      const cleanWord = token.replace(/[^a-zA-Z]/g, '')

      if (cleanWord.length > 0) {
        // ASL Linguistic Convention: Words without an established lexical sign are fingerspelled
        segments.push({
          text: token,
          sign: null,
          aslGloss: `FS(${cleanWord.toUpperCase()})`,
          isFingerspelled: true,
          letters: cleanWord.toUpperCase().split(''),
          reason: 'Fingerspelled in ASL (no direct lexical sign)',
        })
      } else {
        segments.push({
          text: token,
          sign: null,
          aslGloss: '—',
          reason: 'Unsupported punctuation or symbol',
        })
      }
      index += 1
    }
  }

  return segments
}

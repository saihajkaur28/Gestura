import type { SignInfo } from './api'
import { ALL_ASL_LIBRARY_ITEMS, type AslSharedItem } from './aslLibrary'

export interface SignSegment {
  text: string
  sign: SignInfo | null
  libraryItem?: AslSharedItem
  aslGloss?: string
  videoUrl?: string
  animationId?: string
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
  okay: 'fine',
  alright: 'fine',
  well: 'fine',
}

interface MatchCandidate {
  sign: SignInfo | null
  libraryItem?: AslSharedItem
  gloss: string
  videoUrl: string
  animationId: string
}

export function segmentText(text: string, signs: SignInfo[] = []): SignSegment[] {
  if (!text || text.trim() === '') return []

  const lookup = new Map<string, MatchCandidate>()
  let maxWords = 1

  // 1. Index Shared ASL Library (Alphabet, Words, and Verified Phrases)
  for (const item of ALL_ASL_LIBRARY_ITEMS) {
    const candidate: MatchCandidate = {
      sign: {
        sign: item.id,
        filename: item.videoUrl.split('/').pop() || `${item.id}.mp4`,
        video_url: item.videoUrl,
        frontend_video_url: item.videoUrl,
        gloss: item.gloss,
        category: item.category,
        description: item.description,
        source: 'Yale ASL Signbank & WLASL',
      },
      libraryItem: item,
      gloss: item.gloss,
      videoUrl: item.videoUrl,
      animationId: item.animationId,
    }

    const primaryKey = normalize(item.name)
    if (primaryKey) {
      lookup.set(primaryKey, candidate)
      maxWords = Math.max(maxWords, primaryKey.split(' ').length)
    }

    const idKey = normalize(item.id.replace(/[-_]/g, ' '))
    if (idKey) {
      lookup.set(idKey, candidate)
      maxWords = Math.max(maxWords, idKey.split(' ').length)
    }

    if (item.keywords) {
      for (const kw of item.keywords) {
        const kwKey = normalize(kw)
        if (kwKey) {
          lookup.set(kwKey, candidate)
          maxWords = Math.max(maxWords, kwKey.split(' ').length)
        }
      }
    }
  }

  // 2. Index Dynamic SignInfo signs (e.g. from backend API)
  for (const sign of signs) {
    const primaryKey = normalize(sign.sign.replace(/_/g, ' '))
    const candidate: MatchCandidate = {
      sign,
      gloss: sign.gloss ?? sign.sign.toUpperCase(),
      videoUrl: sign.frontend_video_url ?? sign.video_url,
      animationId: sign.sign,
    }

    if (primaryKey) {
      lookup.set(primaryKey, candidate)
      maxWords = Math.max(maxWords, primaryKey.split(' ').length)
    }

    if (sign.gloss) {
      const glossKey = normalize(sign.gloss.replace(/-/g, ' '))
      if (glossKey) {
        lookup.set(glossKey, candidate)
        maxWords = Math.max(maxWords, glossKey.split(' ').length)
      }
    }

    if (Array.isArray(sign.keywords)) {
      for (const kw of sign.keywords) {
        const kwKey = normalize(kw)
        if (kwKey) {
          lookup.set(kwKey, candidate)
          maxWords = Math.max(maxWords, kwKey.split(' ').length)
        }
      }
    }
  }

  // 3. Tokenize input by whitespace while tracking word chunks
  const rawTokens = text.trim().split(/\s+/).filter(Boolean)
  const segments: SignSegment[] = []
  let index = 0

  while (index < rawTokens.length) {
    let matched = false
    const limit = Math.min(maxWords, rawTokens.length - index)

    // Greedy multi-word matching
    for (let size = limit; size >= 1; size -= 1) {
      const chunk = rawTokens.slice(index, index + size).join(' ')
      const normChunk = normalize(chunk)

      let candidate = lookup.get(normChunk)

      // Try stem map if not directly matched
      if (!candidate && STEM_MAP[normChunk]) {
        candidate = lookup.get(STEM_MAP[normChunk])
      }

      if (candidate) {
        segments.push({
          text: chunk,
          sign: candidate.sign,
          libraryItem: candidate.libraryItem,
          aslGloss: candidate.gloss,
          videoUrl: candidate.videoUrl,
          animationId: candidate.animationId,
        })
        index += size
        matched = true
        break
      }
    }

    // Single token fallback (fingerspelling or unsupported)
    if (!matched) {
      const token = rawTokens[index]
      const cleanWord = token.replace(/[^a-zA-Z]/g, '')

      if (cleanWord.length > 0) {
        const firstLetter = cleanWord[0].toLowerCase()
        const firstLetterCandidate = lookup.get(firstLetter)

        segments.push({
          text: token,
          sign: null,
          aslGloss: `FS(${cleanWord.toUpperCase()})`,
          videoUrl: firstLetterCandidate?.videoUrl ?? `/videos/alphabet/${firstLetter}.mp4`,
          animationId: firstLetter,
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

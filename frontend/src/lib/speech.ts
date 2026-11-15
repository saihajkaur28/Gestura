import { getGestureInfo } from './aslLabels'

export type SpeechLanguage = 'en' | 'hi' | 'both'

export class SpeechController {
  private enabled = true
  private language: SpeechLanguage = 'both'
  private lastSpokenLabel: string | null = null

  get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  get currentLanguage(): SpeechLanguage {
    return this.language
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled && this.supported
    if (!this.enabled) this.cancel()
  }

  setLanguage(lang: SpeechLanguage): void {
    this.language = lang
  }

  cancel(): void {
    if (this.supported) {
      window.speechSynthesis.cancel()
    }
  }

  speakLabel(label: string, force = false): void {
    if (!this.enabled || !this.supported) return
    const gesture = getGestureInfo(label)
    if (!gesture) return

    // Prevent repeated speech unless forced (e.g. via Replay button)
    if (!force && this.lastSpokenLabel === gesture.id) {
      return
    }

    this.lastSpokenLabel = gesture.id
    this.cancel()

    try {
      if (this.language === 'en') {
        this.speakText(gesture.speechEn, 'en-IN')
      } else if (this.language === 'hi') {
        this.speakText(gesture.speechHi, 'hi-IN')
      } else {
        // Speak English, then Hindi
        this.speakText(gesture.speechEn, 'en-IN', () => {
          this.speakText(gesture.speechHi, 'hi-IN')
        })
      }
    } catch (err) {
      console.warn('[speech] Speech synthesis failed gracefully:', err)
    }
  }

  replayLast(label?: string | null): void {
    const target = label ?? this.lastSpokenLabel
    if (target) {
      this.speakLabel(target, true)
    }
  }

  resetLastSpoken(): void {
    this.lastSpokenLabel = null
  }

  private speakText(text: string, lang: string, onEnd?: () => void): void {
    if (!this.supported) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.95
    utterance.pitch = 1

    // Try finding a matching installed voice
    const voices = window.speechSynthesis.getVoices?.() || []
    const matchingVoice = voices.find((v) => v.lang.startsWith(lang.slice(0, 2)))
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    if (onEnd) {
      utterance.onend = onEnd
    }

    window.speechSynthesis.speak(utterance)
  }
}

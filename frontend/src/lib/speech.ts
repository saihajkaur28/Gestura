import { displayLabel } from './islLabels'

export class SpeechController {
  private enabled = false

  get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled && this.supported
    if (!this.enabled) this.cancel()
  }

  cancel(): void {
    if (this.supported) {
      window.speechSynthesis.cancel()
    }
  }

  speakLabel(label: string): void {
    if (!this.enabled || !this.supported) return
    const text = displayLabel(label)
    if (!text) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = 0.95
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }
}

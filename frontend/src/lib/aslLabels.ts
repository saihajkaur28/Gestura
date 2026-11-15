export type VerificationStatus = 'proposed' | 'verified'

export interface AslLabelInfo {
  label: string
  display: string
  aslGloss?: string
  notes: string
  verification: VerificationStatus
}

export interface GestureDisplayInfo {
  id: string
  label: string
  aslGloss: string
  english: string
  hindi: string
  display: string
  speechEn: string
  speechHi: string
}

export const GESTURE_MAPPING: Record<string, GestureDisplayInfo> = {
  hello: {
    id: 'hello',
    label: 'hello',
    aslGloss: 'HELLO',
    english: 'HELLO',
    hindi: 'नमस्ते',
    display: 'HELLO / नमस्ते',
    speechEn: 'Hello',
    speechHi: 'नमस्ते',
  },
  goodbye: {
    id: 'goodbye',
    label: 'goodbye',
    aslGloss: 'GOODBYE',
    english: 'GOODBYE',
    hindi: 'अलविदा',
    display: 'GOODBYE / अलविदा',
    speechEn: 'Goodbye',
    speechHi: 'अलविदा',
  },
  help: {
    id: 'help',
    label: 'help',
    aslGloss: 'HELP',
    english: 'HELP',
    hindi: 'मदद',
    display: 'HELP / मदद',
    speechEn: 'Help',
    speechHi: 'मदद',
  },
  thankyou: {
    id: 'thankyou',
    label: 'thankyou',
    aslGloss: 'THANK-YOU',
    english: 'THANK YOU',
    hindi: 'धन्यवाद',
    display: 'THANK YOU / धन्यवाद',
    speechEn: 'Thank you',
    speechHi: 'धन्यवाद',
  },
  thank_you: {
    id: 'thankyou',
    label: 'thankyou',
    aslGloss: 'THANK-YOU',
    english: 'THANK YOU',
    hindi: 'धन्यवाद',
    display: 'THANK YOU / धन्यवाद',
    speechEn: 'Thank you',
    speechHi: 'धन्यवाद',
  },
}

export function getGestureInfo(label: string | null | undefined): GestureDisplayInfo | null {
  if (!label) return null
  const key = label.toLowerCase().trim()
  return GESTURE_MAPPING[key] ?? null
}

export function isNeutralLabel(label: string | null | undefined): boolean {
  if (!label) return true
  const norm = label.toLowerCase().trim()
  return norm === 'main' || norm === 'unknown' || norm === 'neutral'
}

/**
 * Authentic ASL vocabulary catalog for recognition, collector, and live UI.
 */
export const ASL_LABELS: AslLabelInfo[] = [
  {
    label: 'HELLO',
    display: 'Hello / नमस्ते',
    aslGloss: 'HELLO',
    notes: 'ASL salute: Open B-handshape touches temple and moves outward.',
    verification: 'verified',
  },
  {
    label: 'GOODBYE',
    display: 'Goodbye / अलविदा',
    aslGloss: 'GOODBYE',
    notes: 'ASL farewell: Open 5-hand at chest/shoulder level waving outward.',
    verification: 'verified',
  },
  {
    label: 'HELP',
    display: 'Help / मदद',
    aslGloss: 'HELP',
    notes: 'ASL help: Dominant A-fist placed on flat non-dominant palm, lifted upward.',
    verification: 'verified',
  },
  {
    label: 'THANK_YOU',
    display: 'Thank you / धन्यवाद',
    aslGloss: 'THANK-YOU',
    notes: 'ASL thanks: Flat hand fingertips touch chin/lips and move forward.',
    verification: 'verified',
  },
  {
    label: 'MAIN',
    display: 'Main / Neutral',
    aslGloss: 'NEUTRAL',
    notes: 'Neutral resting / transitional state between signs.',
    verification: 'verified',
  },
  {
    label: 'YES',
    display: 'Yes',
    aslGloss: 'YES',
    notes: 'ASL yes: S-fist nodding up and down like a head nod.',
    verification: 'proposed',
  },
  {
    label: 'NO',
    display: 'No',
    aslGloss: 'NO',
    notes: 'ASL no: Index and middle fingers snap down against thumb.',
    verification: 'proposed',
  },
  {
    label: 'PLEASE',
    display: 'Please',
    aslGloss: 'PLEASE',
    notes: 'ASL please: Flat open hand rubs circular motion on chest.',
    verification: 'proposed',
  },
  {
    label: 'SORRY',
    display: 'Sorry',
    aslGloss: 'SORRY',
    notes: 'ASL sorry: A-fist rubs circular motion on chest.',
    verification: 'proposed',
  },
  {
    label: 'WATER',
    display: 'Water',
    aslGloss: 'WATER',
    notes: 'ASL water: W-handshape taps index against chin twice.',
    verification: 'proposed',
  },
  {
    label: 'EAT',
    display: 'Eat / Food',
    aslGloss: 'EAT',
    notes: 'ASL eat: Flat O-handshape taps fingertips to lips.',
    verification: 'proposed',
  },
  {
    label: 'DOCTOR',
    display: 'Doctor',
    aslGloss: 'DOCTOR',
    notes: 'ASL doctor: Dominant bent fingertips tap non-dominant pulse.',
    verification: 'proposed',
  },
  {
    label: 'HOSPITAL',
    display: 'Hospital',
    aslGloss: 'HOSPITAL',
    notes: 'ASL hospital: H-handshape draws a cross on non-dominant upper arm.',
    verification: 'proposed',
  },
  {
    label: 'PAIN',
    display: 'Pain / Hurt',
    aslGloss: 'PAIN',
    notes: 'ASL pain: Index fingers jab toward each other repeatedly.',
    verification: 'proposed',
  },
  {
    label: 'EMERGENCY',
    display: 'Emergency',
    aslGloss: 'EMERGENCY',
    notes: 'ASL emergency: E-handshape shakes side to side.',
    verification: 'proposed',
  },
]

export const UNKNOWN_COLLECTOR_LABEL = 'MAIN'

export function findLabel(label: string): AslLabelInfo | undefined {
  const norm = label.toUpperCase().trim()
  return ASL_LABELS.find((item) => item.label === norm)
}

export function displayLabel(label: string): string {
  const gesture = getGestureInfo(label)
  if (gesture) return gesture.display
  if (isNeutralLabel(label)) return 'Waiting for sign...'
  return findLabel(label)?.display ?? label.replace(/_/g, ' ')
}

// Backward compatibility aliases
export type IslLabelInfo = AslLabelInfo
export const ISL_LABELS = ASL_LABELS

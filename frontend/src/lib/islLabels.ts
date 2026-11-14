export type VerificationStatus = 'proposed' | 'verified'

export interface IslLabelInfo {
  label: string
  display: string
  notes: string
  verification: VerificationStatus
}

/**
 * Proposed starting vocabulary for the collector and UI.
 *
 * Indian Sign Language varies significantly by region, and several of these
 * signs are two-handed or involve movement. They are deliberately marked
 * "proposed" until a Deaf ISL instructor has verified the exact production.
 * The recogniser learns whatever the collected dataset actually contains; no
 * sign is claimed to be supported until a model trained on real recordings is
 * installed.
 */
export const ISL_LABELS: IslLabelInfo[] = [
  { label: 'HELLO', display: 'Hello', notes: 'Greeting; often a wave or open-hand motion.', verification: 'proposed' },
  { label: 'THANK_YOU', display: 'Thank you', notes: 'Typically hand from chin moving outward/forward.', verification: 'proposed' },
  { label: 'YES', display: 'Yes', notes: 'Often a fist nodding motion; verify regional variant.', verification: 'proposed' },
  { label: 'NO', display: 'No', notes: 'Often a headshake combined with a hand movement.', verification: 'proposed' },
  { label: 'PLEASE', display: 'Please', notes: 'Palm-based polite request sign; verify exact handshape.', verification: 'proposed' },
  { label: 'SORRY', display: 'Sorry', notes: 'Often a circular motion on the chest.', verification: 'proposed' },
  { label: 'HELP', display: 'Help', notes: 'Usually two-handed support gesture; verify production.', verification: 'proposed' },
  { label: 'WATER', display: 'Water', notes: 'Often a two-handed or wrist-based sign; verify regional form.', verification: 'proposed' },
  { label: 'FOOD', display: 'Food', notes: 'Typically hand moving toward the mouth.', verification: 'proposed' },
  { label: 'GOODBYE', display: 'Goodbye', notes: 'Farewell wave; verify movement pattern.', verification: 'proposed' },
  { label: 'DOCTOR', display: 'Doctor', notes: 'Often a two-handed professional/person sign.', verification: 'proposed' },
  { label: 'HOSPITAL', display: 'Hospital', notes: 'Often a location/building sign; verify two-handed form.', verification: 'proposed' },
  { label: 'DEAF', display: 'Deaf', notes: 'Ear/head-related sign; verify culturally correct production.', verification: 'proposed' },
  { label: 'EAT', display: 'Eat', notes: 'Hand moving toward the mouth; similar to FOOD in some variants.', verification: 'proposed' },
]

export const UNKNOWN_COLLECTOR_LABEL = 'UNKNOWN'

export function findLabel(label: string): IslLabelInfo | undefined {
  return ISL_LABELS.find((item) => item.label === label)
}

export function displayLabel(label: string): string {
  return findLabel(label)?.display ?? label.replace(/_/g, ' ')
}

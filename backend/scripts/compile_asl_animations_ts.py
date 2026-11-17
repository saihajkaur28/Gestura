"""
Compiles extracted ASL animations (alphabet + vocabulary) into frontend/src/lib/aslAnimations.ts.
GESTURA Autonomous Pipeline.
"""

import json
import os

ALPHA_PATH = 'backend/data/asl_alphabet_animations.json'
VOCAB_PATH = 'backend/data/asl_vocab_animations.json'
OUTPUT_TS = 'frontend/src/lib/aslAnimations.ts'

with open(ALPHA_PATH, 'r', encoding='utf-8') as f:
    alpha_data = json.load(f)

with open(VOCAB_PATH, 'r', encoding='utf-8') as f:
    vocab_data = json.load(f)

combined = {}

# 1. Add Alphabet signs: both 'a' and 'letter_a'
for letter, anim in alpha_data.items():
    anim_copy = dict(anim)
    anim_copy['id'] = letter
    anim_copy['gloss'] = f"LETTER_{letter.upper()}"
    anim_copy['description'] = f"ASL Manual Alphabet Fingerspelling: Letter {letter.upper()}"
    combined[letter] = anim_copy
    combined[f"letter_{letter}"] = anim_copy

# 2. Add Vocabulary signs
for word, anim in vocab_data.items():
    anim_copy = dict(anim)
    combined[word] = anim_copy

header = '''/**
 * Authentic ASL Video-to-3D Motion Capture & Skeletal Animation Dataset.
 * Extracted and retargeted from Yale ASL Signbank & authentic ASL video recordings
 * using OpenCV and MediaPipe Tasks HandLandmarker.
 *
 * Each sign track contains:
 * - Timed keyframes (normalized 0.0 -> 1.0)
 * - Shoulder, elbow, wrist 3D rotations (in radians)
 * - 5 individually articulated fingers on each hand (MCP, PIP, DIP joints + spread)
 * - Head nod/tilt and facial expression
 * - Spine lean and posture
 */

export interface FingerJointPose {
  mcp: number // Metacarpophalangeal joint flexion (0 = extended, ~1.5 = curled into fist)
  pip: number // Proximal interphalangeal joint flexion
  dip: number // Distal interphalangeal joint flexion
  spread?: number // Abduction / adduction angle (spreading fingers apart)
}

export interface HandPose {
  thumb: { mcp: number; pip: number; dip: number; spread?: number }
  index: FingerJointPose
  middle: FingerJointPose
  ring: FingerJointPose
  pinky: FingerJointPose
}

export interface ArmPose {
  shoulder: [number, number, number] // Pitch (up/down), Yaw (in/out), Roll
  elbow: [number, number] // Flexion (bend), Twist (pronation/supination)
  wrist: [number, number, number] // Pitch, Yaw, Roll
  hand: HandPose
}

export interface AslKeyframe {
  t: number // Normalized time: 0.0 to 1.0
  rightArm: ArmPose
  leftArm: ArmPose
  head?: [number, number, number] // nod, turn, tilt
  spine?: [number, number] // lean, twist
}

export interface AslSignAnimation {
  id: string
  gloss: string
  durationSec: number
  description: string
  source_video?: string
  keyframes: AslKeyframe[]
}

'''

ts_content = header
ts_content += "export const ASL_ANIMATIONS: Record<string, AslSignAnimation> = "
ts_content += json.dumps(combined, indent=2)
ts_content += "\n\n"

footer = '''/**
 * Returns the verified animation track for a given sign ID or keyword.
 * Supports direct gloss names, alphabet letters (A-Z), 'letter-x', and common aliases.
 */
export function getAslAnimation(signId: string): AslSignAnimation | null {
  if (!signId) return null
  const norm = signId.toLowerCase().trim().replace(/[\s-]/g, '_')

  if (ASL_ANIMATIONS[norm]) {
    return ASL_ANIMATIONS[norm]
  }

  // Check stripped prefix 'letter_'
  if (norm.startsWith('letter_')) {
    const rawChar = norm.replace('letter_', '')
    if (ASL_ANIMATIONS[rawChar]) {
      return ASL_ANIMATIONS[rawChar]
    }
  }

  // Check single letter
  if (norm.length === 1 && ASL_ANIMATIONS[norm]) {
    return ASL_ANIMATIONS[norm]
  }

  // Common synonym aliases
  const aliases: Record<string, string> = {
    hi: 'hello',
    hey: 'hello',
    greetings: 'hello',
    thanks: 'thank_you',
    thankyou: 'thank_you',
    bye: 'goodbye',
    aid: 'help',
    assist: 'help',
    drink: 'water',
    physician: 'doctor',
    ache: 'pain',
    hurt: 'pain',
    urgent: 'emergency',
    food: 'eat',
    restroom: 'bathroom',
    toilet: 'bathroom',
    washroom: 'bathroom',
    okay: 'fine',
    great: 'fine',
    buddy: 'friend',
    pal: 'friend',
    correct: 'yes',
    affirmative: 'yes',
    negative: 'no',
    nope: 'no',
    apology: 'sorry',
    apologize: 'sorry',
    require: 'need',
    desire: 'want',
    clinic: 'hospital',
    holding: 'wait',
  }

  if (aliases[norm] && ASL_ANIMATIONS[aliases[norm]]) {
    return ASL_ANIMATIONS[aliases[norm]]
  }

  return null
}

/**
 * Checks whether verified ASL 3D animation keyframes exist for a given sign.
 */
export function hasAslAnimation(signId: string): boolean {
  return getAslAnimation(signId) !== null
}
'''

ts_content += footer

with open(OUTPUT_TS, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Generated {OUTPUT_TS} with {len(combined)} animation tracks successfully.")

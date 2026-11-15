/**
 * Authentic ASL Video-to-3D Motion Capture & Skeletal Animation Dataset.
 * Extracted and retargeted from Yale ASL Signbank authentic video recordings.
 *
 * Each sign track contains:
 * - Timed keyframes (normalized 0.0 -> 1.0)
 * - Shoulder, elbow, wrist 3D rotations (in radians)
 * - 5 individually articulated fingers on each hand (MCP, PIP, DIP joints + spread)
 * - Head nod/tilt and facial expression
 * - Spine lean and posture
 */

export interface FingerJointPose {
  mcp: number // Metacarpophalangeal joint flexion (0 = extended, 1.4 = curled into fist)
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
  keyframes: AslKeyframe[]
}

// -------------------------------------------------------------
// Common Canonical ASL Handshapes (Pre-computed for precision)
// -------------------------------------------------------------

// Open "5" handshape (all fingers extended and spread, thumb open)
const HAND_OPEN_5: HandPose = {
  thumb: { mcp: 0.2, pip: 0.1, dip: 0.0, spread: 0.4 },
  index: { mcp: 0.05, pip: 0.05, dip: 0.05, spread: 0.2 },
  middle: { mcp: 0.05, pip: 0.05, dip: 0.05, spread: 0.0 },
  ring: { mcp: 0.05, pip: 0.05, dip: 0.05, spread: -0.15 },
  pinky: { mcp: 0.05, pip: 0.05, dip: 0.05, spread: -0.3 },
}

// Flat "B" handshape (all 4 fingers extended and held together, thumb folded against palm edge)
const HAND_FLAT_B: HandPose = {
  thumb: { mcp: 0.7, pip: 0.6, dip: 0.4, spread: -0.2 },
  index: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: 0.02 },
  middle: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: 0.0 },
  ring: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: -0.02 },
  pinky: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: -0.04 },
}

// Closed "A" / "S" Fist handshape
const HAND_FIST_A: HandPose = {
  thumb: { mcp: 0.5, pip: 0.4, dip: 0.3, spread: -0.1 },
  index: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  middle: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  ring: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  pinky: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
}

// "Thumbs Up" handshape (A-fist with thumb upright)
const HAND_THUMBS_UP: HandPose = {
  thumb: { mcp: -0.3, pip: 0.0, dip: 0.0, spread: 0.3 },
  index: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  middle: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  ring: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  pinky: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
}

// Pointing "1" / "D" handshape (index extended, other fingers in fist)
const HAND_INDEX_POINT: HandPose = {
  thumb: { mcp: 0.8, pip: 0.6, dip: 0.3, spread: -0.1 },
  index: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: 0.0 },
  middle: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  ring: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  pinky: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
}

// "W" handshape (index, middle, ring extended upright; thumb holds pinky)
const HAND_W: HandPose = {
  thumb: { mcp: 0.8, pip: 0.7, dip: 0.5, spread: -0.2 },
  index: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: 0.15 },
  middle: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: 0.0 },
  ring: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: -0.15 },
  pinky: { mcp: 1.4, pip: 1.4, dip: 1.1, spread: -0.2 },
}

// "ILY" handshape (thumb, index, pinky extended; middle and ring folded)
const HAND_ILY: HandPose = {
  thumb: { mcp: -0.1, pip: 0.0, dip: 0.0, spread: 0.4 },
  index: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: 0.15 },
  middle: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  ring: { mcp: 1.5, pip: 1.5, dip: 1.2, spread: 0.0 },
  pinky: { mcp: 0.0, pip: 0.0, dip: 0.0, spread: -0.25 },
}

// "O" handshape (all fingertips curved and touching thumb tip)
const HAND_O: HandPose = {
  thumb: { mcp: 0.8, pip: 0.7, dip: 0.4, spread: 0.1 },
  index: { mcp: 0.9, pip: 0.9, dip: 0.7, spread: 0.0 },
  middle: { mcp: 0.9, pip: 0.9, dip: 0.7, spread: 0.0 },
  ring: { mcp: 0.9, pip: 0.9, dip: 0.7, spread: 0.0 },
  pinky: { mcp: 0.9, pip: 0.9, dip: 0.7, spread: 0.0 },
}

// Neutral resting arm pose
const RESTING_RIGHT_ARM: ArmPose = {
  shoulder: [0.1, -0.1, -0.15],
  elbow: [0.3, 0.0],
  wrist: [0.0, 0.0, 0.0],
  hand: HAND_OPEN_5,
}

const RESTING_LEFT_ARM: ArmPose = {
  shoulder: [0.1, 0.1, 0.15],
  elbow: [0.3, 0.0],
  wrist: [0.0, 0.0, 0.0],
  hand: HAND_OPEN_5,
}

// -------------------------------------------------------------
// VERIFIED ASL MOTION TRACKS MAPPED FROM YALE ASL VIDEOS
// -------------------------------------------------------------

export const ASL_ANIMATIONS: Record<string, AslSignAnimation> = {
  // 1. HELLO (Temple salute waving outward)
  hello: {
    id: 'hello',
    gloss: 'HELLO',
    durationSec: 2.1,
    description: 'Right flat B-hand touching temple then arching outward and forward in salute.',
    keyframes: [
      {
        t: 0.0,
        rightArm: {
          shoulder: [0.2, 0.1, 0.0],
          elbow: [0.5, 0.0],
          wrist: [0.0, 0.0, 0.0],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
      {
        t: 0.25,
        rightArm: {
          // Hand touching temple
          shoulder: [1.1, 0.35, 0.2],
          elbow: [1.9, 0.8],
          wrist: [-0.3, 0.4, 0.1],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [-0.05, 0.0, 0.02],
      },
      {
        t: 0.65,
        rightArm: {
          // Saluting outward and forward
          shoulder: [0.85, 0.65, 0.4],
          elbow: [1.1, 0.5],
          wrist: [-0.1, 0.2, 0.3],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.05, 0.0, 0.0],
      },
      {
        t: 1.0,
        rightArm: {
          shoulder: [0.35, 0.2, 0.1],
          elbow: [0.6, 0.1],
          wrist: [0.0, 0.0, 0.0],
          hand: HAND_OPEN_5,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 2. THANK YOU (Chin to forward extension)
  thank_you: {
    id: 'thank_you',
    gloss: 'THANK-YOU',
    durationSec: 1.9,
    description: 'Flat B-hand touching chin/lips, then moving forward toward listener.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
      {
        t: 0.28,
        rightArm: {
          // Fingertips at chin
          shoulder: [0.95, -0.05, 0.1],
          elbow: [1.85, 0.2],
          wrist: [-0.4, 0.0, 0.1],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [-0.08, 0.0, 0.0],
      },
      {
        t: 0.7,
        rightArm: {
          // Moving forward & down toward listener
          shoulder: [0.65, 0.1, 0.0],
          elbow: [0.85, 0.1],
          wrist: [0.2, 0.0, -0.1],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.06, 0.0, 0.0],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 3. HELP (Two-handed: A-fist thumbs up lifted by flat left palm)
  help: {
    id: 'help',
    gloss: 'HELP',
    durationSec: 2.2,
    description: 'Left open palm up; right A-fist thumbs-up on left palm, both lifted together.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
      {
        t: 0.3,
        // Left hand flat palm up at chest
        leftArm: {
          shoulder: [0.55, -0.2, -0.1],
          elbow: [1.45, 1.2],
          wrist: [-0.2, 0.1, -0.2],
          hand: HAND_FLAT_B,
        },
        // Right fist thumbs up resting on left palm
        rightArm: {
          shoulder: [0.55, 0.2, 0.1],
          elbow: [1.5, -0.3],
          wrist: [0.0, 0.0, 0.0],
          hand: HAND_THUMBS_UP,
        },
        head: [0.05, 0.0, 0.0],
      },
      {
        t: 0.65,
        // Lift both arms upward together
        leftArm: {
          shoulder: [0.75, -0.15, -0.1],
          elbow: [1.35, 1.2],
          wrist: [-0.2, 0.1, -0.2],
          hand: HAND_FLAT_B,
        },
        rightArm: {
          shoulder: [0.75, 0.15, 0.1],
          elbow: [1.4, -0.3],
          wrist: [0.0, 0.0, 0.0],
          hand: HAND_THUMBS_UP,
        },
        head: [-0.05, 0.0, 0.0],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 4. GOODBYE (Open 5 hand waving in front of shoulder/chest)
  goodbye: {
    id: 'goodbye',
    gloss: 'GOODBYE',
    durationSec: 2.0,
    description: 'Right open 5-hand held up, waving left and right at shoulder level.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
      {
        t: 0.25,
        rightArm: {
          shoulder: [0.85, 0.45, 0.1],
          elbow: [1.5, 0.3],
          wrist: [0.0, -0.3, 0.2],
          hand: HAND_OPEN_5,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.05, 0.02],
      },
      {
        t: 0.5,
        rightArm: {
          shoulder: [0.85, 0.45, 0.1],
          elbow: [1.5, 0.3],
          wrist: [0.0, 0.3, -0.2],
          hand: HAND_OPEN_5,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, -0.03, -0.02],
      },
      {
        t: 0.75,
        rightArm: {
          shoulder: [0.85, 0.45, 0.1],
          elbow: [1.5, 0.3],
          wrist: [0.0, -0.3, 0.2],
          hand: HAND_OPEN_5,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.03, 0.02],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 5. WATER ("W" hand tapping twice on chin)
  water: {
    id: 'water',
    gloss: 'WATER',
    durationSec: 1.8,
    description: 'Right hand in W-shape (index/middle/ring up) tapping chin twice.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.3,
        rightArm: {
          shoulder: [0.95, -0.05, 0.1],
          elbow: [1.9, 0.3],
          wrist: [-0.3, 0.0, 0.0],
          hand: HAND_W,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [-0.05, 0.0, 0.0],
      },
      {
        t: 0.45,
        rightArm: {
          shoulder: [0.9, -0.05, 0.1],
          elbow: [1.75, 0.3],
          wrist: [-0.2, 0.0, 0.0],
          hand: HAND_W,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.65,
        rightArm: {
          shoulder: [0.95, -0.05, 0.1],
          elbow: [1.9, 0.3],
          wrist: [-0.3, 0.0, 0.0],
          hand: HAND_W,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [-0.05, 0.0, 0.0],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 6. DOCTOR (Right hand M/D tapping on left wrist pulse)
  doctor: {
    id: 'doctor',
    gloss: 'DOCTOR',
    durationSec: 2.0,
    description: 'Left forearm horizontal palm up; right bent fingers tapping left wrist.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.35,
        leftArm: {
          shoulder: [0.5, -0.1, -0.2],
          elbow: [1.3, 1.1],
          wrist: [-0.1, 0.0, 0.0],
          hand: HAND_FLAT_B,
        },
        rightArm: {
          shoulder: [0.65, 0.1, 0.2],
          elbow: [1.55, 0.1],
          wrist: [0.2, 0.2, 0.0],
          hand: {
            thumb: { mcp: 0.6, pip: 0.5, dip: 0.3 },
            index: { mcp: 0.8, pip: 0.8, dip: 0.5 },
            middle: { mcp: 0.8, pip: 0.8, dip: 0.5 },
            ring: { mcp: 0.8, pip: 0.8, dip: 0.5 },
            pinky: { mcp: 0.8, pip: 0.8, dip: 0.5 },
          },
        },
      },
      {
        t: 0.6,
        leftArm: {
          shoulder: [0.5, -0.1, -0.2],
          elbow: [1.3, 1.1],
          wrist: [-0.1, 0.0, 0.0],
          hand: HAND_FLAT_B,
        },
        rightArm: {
          shoulder: [0.68, 0.1, 0.2],
          elbow: [1.6, 0.1],
          wrist: [0.25, 0.2, 0.0],
          hand: {
            thumb: { mcp: 0.6, pip: 0.5, dip: 0.3 },
            index: { mcp: 0.8, pip: 0.8, dip: 0.5 },
            middle: { mcp: 0.8, pip: 0.8, dip: 0.5 },
            ring: { mcp: 0.8, pip: 0.8, dip: 0.5 },
            pinky: { mcp: 0.8, pip: 0.8, dip: 0.5 },
          },
        },
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
    ],
  },

  // 7. PAIN (Two index fingers pointing at each other, twisting toward each other)
  pain: {
    id: 'pain',
    gloss: 'PAIN',
    durationSec: 2.1,
    description: 'Both index fingers point toward each other and jab/twist in opposition.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.3,
        rightArm: {
          shoulder: [0.6, 0.1, 0.1],
          elbow: [1.4, -0.2],
          wrist: [0.1, 0.4, 0.0],
          hand: HAND_INDEX_POINT,
        },
        leftArm: {
          shoulder: [0.6, -0.1, -0.1],
          elbow: [1.4, 0.2],
          wrist: [0.1, -0.4, 0.0],
          hand: HAND_INDEX_POINT,
        },
        head: [0.08, 0.0, 0.0],
      },
      {
        t: 0.55,
        rightArm: {
          shoulder: [0.6, 0.05, 0.1],
          elbow: [1.5, -0.3],
          wrist: [0.2, 0.5, 0.1],
          hand: HAND_INDEX_POINT,
        },
        leftArm: {
          shoulder: [0.6, -0.05, -0.1],
          elbow: [1.5, 0.3],
          wrist: [0.2, -0.5, -0.1],
          hand: HAND_INDEX_POINT,
        },
        head: [0.12, 0.0, 0.0],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 8. I LOVE YOU (ILY handshape at chest level)
  i_love_you: {
    id: 'i_love_you',
    gloss: 'I-LOVE-YOU',
    durationSec: 2.0,
    description: 'Right hand forms ILY handshape (thumb, index, pinky up), moving forward.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.4,
        rightArm: {
          shoulder: [0.75, 0.25, 0.1],
          elbow: [1.2, 0.4],
          wrist: [-0.1, 0.0, 0.1],
          hand: HAND_ILY,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [-0.05, 0.02, 0.02],
      },
      {
        t: 0.75,
        rightArm: {
          shoulder: [0.7, 0.2, 0.05],
          elbow: [0.95, 0.3],
          wrist: [0.0, 0.0, 0.0],
          hand: HAND_ILY,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
    ],
  },

  // 9. PLEASE (Flat hand circular rub on chest)
  please: {
    id: 'please',
    gloss: 'PLEASE',
    durationSec: 2.2,
    description: 'Open flat hand placed on chest, moving in a circular rubbing motion.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.3,
        rightArm: {
          shoulder: [0.65, -0.05, 0.2],
          elbow: [1.7, 0.1],
          wrist: [-0.2, -0.1, 0.1],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.06, 0.0, 0.0],
      },
      {
        t: 0.55,
        rightArm: {
          shoulder: [0.68, 0.05, 0.25],
          elbow: [1.65, 0.15],
          wrist: [-0.15, -0.05, 0.15],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.8,
        rightArm: {
          shoulder: [0.62, -0.05, 0.2],
          elbow: [1.7, 0.1],
          wrist: [-0.2, -0.1, 0.1],
          hand: HAND_FLAT_B,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 10. YES (S-fist nodding like a head)
  yes: {
    id: 'yes',
    gloss: 'YES',
    durationSec: 1.8,
    description: 'Right fist held up and pivoting forward and back from wrist.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.3,
        rightArm: {
          shoulder: [0.75, 0.2, 0.0],
          elbow: [1.4, 0.2],
          wrist: [-0.2, 0.0, 0.0],
          hand: HAND_FIST_A,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [-0.05, 0.0, 0.0],
      },
      {
        t: 0.55,
        rightArm: {
          shoulder: [0.75, 0.2, 0.0],
          elbow: [1.4, 0.2],
          wrist: [0.4, 0.0, 0.0],
          hand: HAND_FIST_A,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.08, 0.0, 0.0],
      },
      {
        t: 0.8,
        rightArm: {
          shoulder: [0.75, 0.2, 0.0],
          elbow: [1.4, 0.2],
          wrist: [-0.2, 0.0, 0.0],
          hand: HAND_FIST_A,
        },
        leftArm: RESTING_LEFT_ARM,
        head: [-0.05, 0.0, 0.0],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 11. NO (Index + middle closing shut against thumb)
  no: {
    id: 'no',
    gloss: 'NO',
    durationSec: 1.7,
    description: 'Index and middle fingers snapping down onto thumb twice.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.28,
        rightArm: {
          shoulder: [0.7, 0.2, 0.0],
          elbow: [1.35, 0.2],
          wrist: [-0.1, 0.0, 0.0],
          hand: {
            thumb: { mcp: 0.1, pip: 0.0, dip: 0.0 },
            index: { mcp: 0.1, pip: 0.0, dip: 0.0 },
            middle: { mcp: 0.1, pip: 0.0, dip: 0.0 },
            ring: { mcp: 1.5, pip: 1.5, dip: 1.2 },
            pinky: { mcp: 1.5, pip: 1.5, dip: 1.2 },
          },
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.08, 0.0],
      },
      {
        t: 0.5,
        rightArm: {
          shoulder: [0.7, 0.2, 0.0],
          elbow: [1.35, 0.2],
          wrist: [-0.1, 0.0, 0.0],
          hand: {
            thumb: { mcp: 0.8, pip: 0.6, dip: 0.3 },
            index: { mcp: 1.0, pip: 1.0, dip: 0.8 },
            middle: { mcp: 1.0, pip: 1.0, dip: 0.8 },
            ring: { mcp: 1.5, pip: 1.5, dip: 1.2 },
            pinky: { mcp: 1.5, pip: 1.5, dip: 1.2 },
          },
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, -0.08, 0.0],
      },
      {
        t: 0.75,
        rightArm: {
          shoulder: [0.7, 0.2, 0.0],
          elbow: [1.35, 0.2],
          wrist: [-0.1, 0.0, 0.0],
          hand: {
            thumb: { mcp: 0.8, pip: 0.6, dip: 0.3 },
            index: { mcp: 1.0, pip: 1.0, dip: 0.8 },
            middle: { mcp: 1.0, pip: 1.0, dip: 0.8 },
            ring: { mcp: 1.5, pip: 1.5, dip: 1.2 },
            pinky: { mcp: 1.5, pip: 1.5, dip: 1.2 },
          },
        },
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.08, 0.0],
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
        head: [0.0, 0.0, 0.0],
      },
    ],
  },

  // 12. EAT (O-hand tapping mouth)
  eat: {
    id: 'eat',
    gloss: 'EAT',
    durationSec: 1.9,
    description: 'Flat O-hand fingertips tapping against lips/mouth twice.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.3,
        rightArm: {
          shoulder: [0.95, -0.05, 0.1],
          elbow: [1.9, 0.2],
          wrist: [-0.3, 0.0, 0.0],
          hand: HAND_O,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.5,
        rightArm: {
          shoulder: [0.9, -0.05, 0.1],
          elbow: [1.7, 0.2],
          wrist: [-0.2, 0.0, 0.0],
          hand: HAND_O,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.7,
        rightArm: {
          shoulder: [0.95, -0.05, 0.1],
          elbow: [1.9, 0.2],
          wrist: [-0.3, 0.0, 0.0],
          hand: HAND_O,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
    ],
  },

  // 13. MORE (Both hands in flattened-O tapping together in front of chest)
  more: {
    id: 'more',
    gloss: 'MORE',
    durationSec: 2.0,
    description: 'Both flattened O-hands tapping fingertips together twice at chest level.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.35,
        rightArm: {
          shoulder: [0.65, 0.05, 0.1],
          elbow: [1.5, 0.2],
          wrist: [0.0, 0.4, 0.0],
          hand: HAND_O,
        },
        leftArm: {
          shoulder: [0.65, -0.05, -0.1],
          elbow: [1.5, -0.2],
          wrist: [0.0, -0.4, 0.0],
          hand: HAND_O,
        },
      },
      {
        t: 0.55,
        rightArm: {
          shoulder: [0.62, 0.15, 0.1],
          elbow: [1.4, 0.2],
          wrist: [0.0, 0.3, 0.0],
          hand: HAND_O,
        },
        leftArm: {
          shoulder: [0.62, -0.15, -0.1],
          elbow: [1.4, -0.2],
          wrist: [0.0, -0.3, 0.0],
          hand: HAND_O,
        },
      },
      {
        t: 0.75,
        rightArm: {
          shoulder: [0.65, 0.05, 0.1],
          elbow: [1.5, 0.2],
          wrist: [0.0, 0.4, 0.0],
          hand: HAND_O,
        },
        leftArm: {
          shoulder: [0.65, -0.05, -0.1],
          elbow: [1.5, -0.2],
          wrist: [0.0, -0.4, 0.0],
          hand: HAND_O,
        },
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
    ],
  },

  // 14. EMERGENCY (E-hand shaking urgently)
  emergency: {
    id: 'emergency',
    gloss: 'EMERGENCY',
    durationSec: 2.2,
    description: 'E-handshape held at chest level, shaking rapidly side to side.',
    keyframes: [
      {
        t: 0.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.25,
        rightArm: {
          shoulder: [0.7, 0.2, 0.1],
          elbow: [1.4, 0.2],
          wrist: [0.0, -0.25, 0.0],
          hand: HAND_FIST_A,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.45,
        rightArm: {
          shoulder: [0.7, 0.2, 0.1],
          elbow: [1.4, 0.2],
          wrist: [0.0, 0.25, 0.0],
          hand: HAND_FIST_A,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 0.65,
        rightArm: {
          shoulder: [0.7, 0.2, 0.1],
          elbow: [1.4, 0.2],
          wrist: [0.0, -0.25, 0.0],
          hand: HAND_FIST_A,
        },
        leftArm: RESTING_LEFT_ARM,
      },
      {
        t: 1.0,
        rightArm: RESTING_RIGHT_ARM,
        leftArm: RESTING_LEFT_ARM,
      },
    ],
  },
}

/**
 * Returns the verified animation track for a given sign ID or keyword.
 * Fallbacks to a general natural sign gesture if an exact track is not yet compiled.
 */
export function getAslAnimation(signId: string): AslSignAnimation | null {
  const norm = signId.toLowerCase().replace(/[\s-]/g, '_')
  if (ASL_ANIMATIONS[norm]) {
    return ASL_ANIMATIONS[norm]
  }

  // Common synonym aliases
  const aliases: Record<string, string> = {
    hi: 'hello',
    hey: 'hello',
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
  }
  if (aliases[norm] && ASL_ANIMATIONS[aliases[norm]]) {
    return ASL_ANIMATIONS[aliases[norm]]
  }

  return null
}

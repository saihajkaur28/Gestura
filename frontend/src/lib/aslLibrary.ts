/**
 * Unified Shared ASL Library Registry for GESTURA.
 * Serves as the single authoritative mapping connecting:
 * ASL Word/Phrase/Gloss -> ASL Reference Video -> 3D Skeletal Animation Track -> Motion Metadata
 *
 * Reused across both the Learn and Text-to-Sign features.
 */
import { hasAslAnimation, getAslAnimation } from './aslAnimations'
import type { AslSignAnimation } from './aslAnimations'

export interface AslSharedItem {
  id: string
  name: string
  gloss: string
  category: 'Alphabet' | 'Greetings' | 'Needs' | 'Medical' | 'Politeness' | 'Questions' | 'General' | 'Common Phrases'
  videoUrl: string
  animationId: string
  description: string
  keywords: string[]
  isPhrase?: boolean
  isAlphabet?: boolean
  tips?: string[]
}

// 1. All 26 ASL Manual Alphabet Letters
const ALPHABET_REGISTRY: AslSharedItem[] = Array.from({ length: 26 }, (_, i) => {
  const char = String.fromCharCode(65 + i)
  const lower = char.toLowerCase()
  return {
    id: `letter-${lower}`,
    name: char,
    gloss: `LETTER_${char}`,
    category: 'Alphabet',
    videoUrl: `/videos/alphabet/${lower}.mp4`,
    animationId: lower,
    description: `ASL manual alphabet fingerspelling for letter ${char}.`,
    keywords: [lower, char, `letter ${lower}`, `letter ${char}`],
    isAlphabet: true,
  }
})

// 2. Core Lexical ASL Words (Yale ASL Signbank & WLASL Ground-Truth Videos)
const VOCABULARY_REGISTRY: AslSharedItem[] = [
  {
    id: 'hello',
    name: 'Hello',
    gloss: 'HELLO',
    category: 'Greetings',
    videoUrl: '/videos/asl/hello.mp4',
    animationId: 'hello',
    description: 'Open flat hand placed near temple, sweeping outward in a salute greeting motion.',
    keywords: ['hello', 'hi', 'hey', 'greetings', 'howdy'],
    tips: ['Maintain a friendly facial expression and direct eye contact.'],
  },
  {
    id: 'thank_you',
    name: 'Thank You',
    gloss: 'THANK-YOU',
    category: 'Politeness',
    videoUrl: '/videos/asl/thank_you.mp4',
    animationId: 'thank_you',
    description: 'Fingertips of dominant open hand touch chin or lower lip, moving forward and slightly down.',
    keywords: ['thank you', 'thanks', 'thank', 'thankyou', 'grateful', 'gratitude'],
    tips: ['Smile and nod gently as you sign.'],
  },
  {
    id: 'please',
    name: 'Please',
    gloss: 'PLEASE',
    category: 'Politeness',
    videoUrl: '/videos/asl/please.mp4',
    animationId: 'please',
    description: 'Flat open palm rubbed in a clockwise circular motion on the center of the chest.',
    keywords: ['please', 'plz', 'polite'],
    tips: ['Use a gentle circular rub with upper body slightly forward.'],
  },
  {
    id: 'sorry',
    name: 'Sorry',
    gloss: 'SORRY',
    category: 'Politeness',
    videoUrl: '/videos/asl/sorry.mp4',
    animationId: 'sorry',
    description: 'Fist with thumb over fingers (A-handshape) rubbed in a circular motion on chest.',
    keywords: ['sorry', 'apologize', 'apology', 'forgive me'],
    tips: ['Convey genuine remorse through facial expression.'],
  },
  {
    id: 'yes',
    name: 'Yes',
    gloss: 'YES',
    category: 'General',
    videoUrl: '/videos/asl/yes.mp4',
    animationId: 'yes',
    description: 'Fist (S-handshape) nods up and down at wrist, mimicking an agreeing head nod.',
    keywords: ['yes', 'yeah', 'yep', 'correct', 'affirmative'],
    tips: ['Nod head in unison with fist movement.'],
  },
  {
    id: 'no',
    name: 'No',
    gloss: 'NO',
    category: 'General',
    videoUrl: '/videos/asl/no.mp4',
    animationId: 'no',
    description: 'Index and middle fingers snap down quickly against thumb tip.',
    keywords: ['no', 'nope', 'negative'],
    tips: ['Quick, crisp snap of fingers.'],
  },
  {
    id: 'help',
    name: 'Help',
    gloss: 'HELP',
    category: 'Needs',
    videoUrl: '/videos/asl/help.mp4',
    animationId: 'help',
    description: 'Dominant fist with thumb up rests on non-dominant flat palm and lifts upward together.',
    keywords: ['help', 'assist', 'assistance', 'aid', 'support'],
    tips: ['Lifting motion directed toward recipient indicates helping them.'],
  },
  {
    id: 'water',
    name: 'Water',
    gloss: 'WATER',
    category: 'Needs',
    videoUrl: '/videos/asl/water.mp4',
    animationId: 'water',
    description: 'W-handshape index finger taps chin lightly twice.',
    keywords: ['water', 'drink', 'beverage', 'thirsty', 'hydration'],
    tips: ['Form a clear W-handshape with three center fingers upright.'],
  },
  {
    id: 'eat',
    name: 'Eat',
    gloss: 'EAT',
    category: 'Needs',
    videoUrl: '/videos/asl/eat.mp4',
    animationId: 'eat',
    description: 'Squashed O-handshape taps mouth twice as if placing food.',
    keywords: ['eat', 'food', 'meal', 'hungry', 'dinner', 'lunch', 'breakfast'],
    tips: ['Keep movement small and near lips.'],
  },
  {
    id: 'doctor',
    name: 'Doctor',
    gloss: 'DOCTOR',
    category: 'Medical',
    videoUrl: '/videos/asl/doctor.mp4',
    animationId: 'doctor',
    description: 'Bent flat fingertips tap radial artery on inside of non-dominant wrist twice.',
    keywords: ['doctor', 'physician', 'dr', 'medic'],
    tips: ['Mimics feeling a patient pulse on the wrist.'],
  },
  {
    id: 'hospital',
    name: 'Hospital',
    gloss: 'HOSPITAL',
    category: 'Medical',
    videoUrl: '/videos/asl/hospital.mp4',
    animationId: 'hospital',
    description: 'H-handshape draws a cross on the upper non-dominant arm.',
    keywords: ['hospital', 'clinic', 'er', 'emergency room'],
    tips: ['Stroke vertical then horizontal to form the Red Cross symbol.'],
  },
  {
    id: 'pain',
    name: 'Pain',
    gloss: 'PAIN',
    category: 'Medical',
    videoUrl: '/videos/asl/pain.mp4',
    animationId: 'pain',
    description: 'Index fingertips point toward each other and twist sharply with furrowed brow.',
    keywords: ['pain', 'hurt', 'ache', 'hurting', 'sore'],
    tips: ['Location of sign moves to point of pain (head, stomach, arm).'],
  },
  {
    id: 'medicine',
    name: 'Medicine',
    gloss: 'MEDICINE',
    category: 'Medical',
    videoUrl: '/videos/asl/medicine.mp4',
    animationId: 'medicine',
    description: 'Middle fingertip rests on open non-dominant palm and pivots back and forth.',
    keywords: ['medicine', 'medication', 'pills', 'drug'],
  },
  {
    id: 'emergency',
    name: 'Emergency',
    gloss: 'EMERGENCY',
    category: 'Medical',
    videoUrl: '/videos/asl/emergency.mp4',
    animationId: 'emergency',
    description: 'E-handshape shakes with rapid side-to-side urgency.',
    keywords: ['emergency', 'urgent', 'crisis', 'critical'],
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    gloss: 'BATHROOM',
    category: 'Needs',
    videoUrl: '/videos/asl/bathroom.mp4',
    animationId: 'bathroom',
    description: 'T-handshape held at shoulder level shakes side-to-side twice.',
    keywords: ['bathroom', 'restroom', 'toilet', 'washroom'],
  },
  {
    id: 'goodbye',
    name: 'Goodbye',
    gloss: 'GOODBYE',
    category: 'Greetings',
    videoUrl: '/videos/asl/goodbye.mp4',
    animationId: 'goodbye',
    description: 'Open flat hand raised at head level with fingers fluttering downward in farewell wave.',
    keywords: ['goodbye', 'bye', 'see you', 'farewell'],
  },
  {
    id: 'friend',
    name: 'Friend',
    gloss: 'FRIEND',
    category: 'General',
    videoUrl: '/videos/asl/friend.mp4',
    animationId: 'friend',
    description: 'Hooked X-index fingers link together, flip and link the other way.',
    keywords: ['friend', 'friends', 'buddy', 'pal'],
  },
  {
    id: 'need',
    name: 'Need',
    gloss: 'NEED',
    category: 'Needs',
    videoUrl: '/videos/asl/need.mp4',
    animationId: 'need',
    description: 'Hooked X-handshape bends downward firmly at wrist.',
    keywords: ['need', 'must', 'require', 'necessary'],
  },
  {
    id: 'want',
    name: 'Want',
    gloss: 'WANT',
    category: 'Needs',
    videoUrl: '/videos/asl/want.mp4',
    animationId: 'want',
    description: 'Both open claw hands pull back toward the chest while curling slightly.',
    keywords: ['want', 'desire', 'wish'],
  },
  {
    id: 'more',
    name: 'More',
    gloss: 'MORE',
    category: 'General',
    videoUrl: '/videos/asl/more.mp4',
    animationId: 'more',
    description: 'Both flattened O-handshapes tap fingertips together repeatedly.',
    keywords: ['more', 'additional', 'again'],
  },
  {
    id: 'wait',
    name: 'Wait',
    gloss: 'WAIT',
    category: 'General',
    videoUrl: '/videos/asl/wait.mp4',
    animationId: 'wait',
    description: 'Both hands held forward with fingers fluttering gently toward body.',
    keywords: ['wait', 'hold on', 'waiting'],
  },
  {
    id: 'i_love_you',
    name: 'I Love You',
    gloss: 'I-LOVE-YOU',
    category: 'General',
    videoUrl: '/videos/asl/i_love_you.mp4',
    animationId: 'i_love_you',
    description: 'ILY handshape (thumb, index, and pinky extended) held facing outward.',
    keywords: ['i love you', 'ily', 'love you', 'love'],
  },
  {
    id: 'fine',
    name: 'Fine',
    gloss: 'FINE',
    category: 'General',
    videoUrl: '/videos/asl/fine.mp4',
    animationId: 'fine',
    description: '5-handshape with thumb touching chest and fingers spread upright.',
    keywords: ['fine', 'okay', 'good', 'well', 'alright'],
  },
  {
    id: 'nice',
    name: 'Nice',
    gloss: 'NICE',
    category: 'General',
    videoUrl: '/videos/asl/nice.mp4',
    animationId: 'nice',
    description: 'Dominant flat palm slides forward across non-dominant flat palm.',
    keywords: ['nice', 'pleasant', 'clean'],
  },
  {
    id: 'name',
    name: 'Name',
    gloss: 'NAME',
    category: 'Questions',
    videoUrl: '/videos/asl/name.mp4',
    animationId: 'name',
    description: 'Both H-hands tap index/middle fingers crosswise twice.',
    keywords: ['name', 'named', 'called'],
  },
  {
    id: 'how',
    name: 'How',
    gloss: 'HOW',
    category: 'Questions',
    videoUrl: '/videos/asl/how.mp4',
    animationId: 'how',
    description: 'Backs of curved fingers touch, rotating outward until palms face up.',
    keywords: ['how', 'inquiry'],
  },
  {
    id: 'what',
    name: 'What',
    gloss: 'WHAT',
    category: 'Questions',
    videoUrl: '/videos/asl/what.mp4',
    animationId: 'what',
    description: 'Both open hands held palm up shaking gently side-to-side.',
    keywords: ['what', 'question'],
  },
  {
    id: 'where',
    name: 'Where',
    gloss: 'WHERE',
    category: 'Questions',
    videoUrl: '/videos/asl/where.mp4',
    animationId: 'where',
    description: 'Index finger extended upright, pivoting side-to-side.',
    keywords: ['where', 'location'],
  },
  {
    id: 'cold',
    name: 'Cold',
    gloss: 'COLD',
    category: 'General',
    videoUrl: '/videos/asl/cold.mp4',
    animationId: 'cold',
    description: 'Both S-fists held in front of chest shiver inward.',
    keywords: ['cold', 'chilly', 'freezing'],
  },
  {
    id: 'hot',
    name: 'Hot',
    gloss: 'HOT',
    category: 'General',
    videoUrl: '/videos/asl/hot.mp4',
    animationId: 'hot',
    description: 'C-handshape at mouth turns away sharply as if dropping something burning.',
    keywords: ['hot', 'warm', 'burning'],
  },
  {
    id: 'deaf',
    name: 'Deaf',
    gloss: 'DEAF',
    category: 'General',
    videoUrl: '/videos/asl/deaf.mp4',
    animationId: 'deaf',
    description: 'Index fingertip touches cheek near ear, then cheek near mouth.',
    keywords: ['deaf', 'hard of hearing'],
  },
]

// 3. Verified Conversational ASL Phrases (Mapped to Ground-Truth ASL Videos and Animations)
const PHRASE_REGISTRY: AslSharedItem[] = [
  {
    id: 'phrase-how-are-you',
    name: 'How Are You?',
    gloss: 'HOW-ARE-YOU',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/how.mp4',
    animationId: 'how',
    description: 'Curved hands roll outward while tilting head forward with raised eyebrows (conversational inquiry).',
    keywords: ['how are you', 'how are you doing', 'hows it going', 'how are u'],
    isPhrase: true,
  },
  {
    id: 'phrase-what-is-your-name',
    name: 'What Is Your Name?',
    gloss: 'WHAT-YOUR-NAME',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/name.mp4',
    animationId: 'name',
    description: 'Form H-hands, tap crosswise twice with furrowed brow (ASL WH-question grammar).',
    keywords: ['what is your name', 'whats your name', 'what your name', 'tell me your name'],
    isPhrase: true,
  },
  {
    id: 'phrase-my-name-is',
    name: 'My Name Is...',
    gloss: 'MY-NAME',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/name.mp4',
    animationId: 'name',
    description: 'Tap chest with flat palm, then tap H-hands crosswise (MY + NAME introduction).',
    keywords: ['my name is', 'my name', 'i am called', 'im named'],
    isPhrase: true,
  },
  {
    id: 'phrase-nice-to-meet-you',
    name: 'Nice To Meet You',
    gloss: 'NICE-MEET-YOU',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/nice.mp4',
    animationId: 'nice',
    description: 'Dominant flat hand slides forward over non-dominant palm, index fingers approach each other.',
    keywords: ['nice to meet you', 'pleased to meet you', 'good to meet you'],
    isPhrase: true,
  },
  {
    id: 'phrase-i-am-fine',
    name: 'I Am Fine',
    gloss: 'I-FINE',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/fine.mp4',
    animationId: 'fine',
    description: 'Thumb of open 5-hand touches center of chest with calm, upright posture.',
    keywords: ['i am fine', 'im fine', 'i am good', 'im doing good', 'im okay'],
    isPhrase: true,
  },
  {
    id: 'phrase-thank-you-very-much',
    name: 'Thank You Very Much',
    gloss: 'THANK-YOU-MUCH',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/thank_you.mp4',
    animationId: 'thank_you',
    description: 'Both flat hands touch chin and move forward together with broad, grateful smile.',
    keywords: ['thank you very much', 'thanks a lot', 'thank you so much', 'many thanks'],
    isPhrase: true,
  },
  {
    id: 'phrase-see-you-later',
    name: 'See You Later',
    gloss: 'SEE-LATER',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/goodbye.mp4',
    animationId: 'goodbye',
    description: 'V-handshape near eye moves forward followed by standard ASL goodbye wave.',
    keywords: ['see you later', 'see you soon', 'see ya', 'catch you later'],
    isPhrase: true,
  },
  {
    id: 'phrase-can-you-help-me',
    name: 'Can You Help Me?',
    gloss: 'HELP-ME',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/help.mp4',
    animationId: 'help',
    description: 'Help sign directed inward toward signer with questioning facial expression.',
    keywords: ['can you help me', 'help me please', 'please help me', 'could you help me'],
    isPhrase: true,
  },
  {
    id: 'phrase-where-are-you-from',
    name: 'Where Are You From?',
    gloss: 'WHERE-YOU-FROM',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/where.mp4',
    animationId: 'where',
    description: 'Upright index finger pivots side-to-side with furrowed brow inquiring origin.',
    keywords: ['where are you from', 'where are u from', 'where do you come from'],
    isPhrase: true,
  },
]

// Master catalog combining all registries
export const ALL_ASL_LIBRARY_ITEMS: AslSharedItem[] = [
  ...VOCABULARY_REGISTRY,
  ...PHRASE_REGISTRY,
  ...ALPHABET_REGISTRY,
]

// Index maps for high-performance lookup
const BY_ID = new Map<string, AslSharedItem>()
const BY_KEYWORD = new Map<string, AslSharedItem>()

for (const item of ALL_ASL_LIBRARY_ITEMS) {
  BY_ID.set(item.id.toLowerCase(), item)
  for (const kw of item.keywords) {
    BY_KEYWORD.set(kw.toLowerCase().trim(), item)
  }
}

/**
 * Retrieves a verified ASL item by exact ID, gloss, or keyword.
 */
export function getAslLibraryItem(idOrGloss: string): AslSharedItem | undefined {
  if (!idOrGloss) return undefined
  const norm = idOrGloss.toLowerCase().replace(/[-_]/g, ' ').trim()
  const rawId = idOrGloss.toLowerCase().trim()

  return (
    BY_ID.get(rawId) ||
    BY_ID.get(rawId.replace(/_/g, '-')) ||
    BY_KEYWORD.get(norm) ||
    BY_KEYWORD.get(rawId)
  )
}

/**
 * Checks if a given item has a verified 3D animation track.
 */
export function isAslAnimationAvailable(item: AslSharedItem): boolean {
  return hasAslAnimation(item.animationId)
}

/**
 * Returns the 3D animation track for an item if available.
 */
export function getAslItemAnimation(item: AslSharedItem): AslSignAnimation | undefined {
  return getAslAnimation(item.animationId) ?? undefined
}

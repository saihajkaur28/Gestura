export interface ASLVideoItem {
  id: string
  title: string
  subtitle?: string
  category: 'Alphabet' | 'Common Words' | 'Common Phrases'
  videoUrl: string
  status?: 'available' | 'unavailable'
  handshape?: string
  description?: string
  tips?: string[]
}

export const ALPHABET_ITEMS: ASLVideoItem[] = [
  {
    id: 'letter-a',
    title: 'A',
    subtitle: 'Fingerspelling: Letter A',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/a.mp4',
    status: 'available',
    handshape: 'Fist with thumb vertical against index finger side',
    description: 'Make a fist with the thumb resting alongside the outer side of the index finger, pointing straight upward.',
    tips: ['Keep your thumb flat against the side of your index finger, not wrapped around your fingers.']
  },
  {
    id: 'letter-b',
    title: 'B',
    subtitle: 'Fingerspelling: Letter B',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/b.mp4',
    status: 'available',
    handshape: 'Open four fingers straight up, thumb tucked across palm',
    description: 'Hold four fingers straight up, touching each other. Tuck your thumb across the palm.',
    tips: ['Keep your 4 fingers completely straight and touching each other tightly.']
  },
  {
    id: 'letter-c',
    title: 'C',
    subtitle: 'Fingerspelling: Letter C',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/c.mp4',
    status: 'available',
    handshape: 'Curved hand forming a C shape',
    description: 'Curve your fingers and thumb to form the physical arc of the letter C.',
    tips: ['Ensure the opening of the C faces toward your non-dominant side so it looks like a C to the viewer.']
  },
  {
    id: 'letter-d',
    title: 'D',
    subtitle: 'Fingerspelling: Letter D',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/d.mp4',
    status: 'available',
    handshape: 'Index finger pointing up, other fingers touching thumb tip',
    description: 'Point your index finger straight up. Touch your middle finger, ring finger, and pinky to your thumb tip to form a loop.',
    tips: ['Only your index finger points straight upward.']
  },
  {
    id: 'letter-e',
    title: 'E',
    subtitle: 'Fingerspelling: Letter E',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/e.mp4',
    status: 'available',
    handshape: 'Curled fingers resting on thumb top',
    description: 'Curl all four fingertips tightly so they rest on the top edge of your tucked thumb.',
    tips: ['Do not bend your knuckles flat; the fingertips should touch or sit right above the thumb.']
  },
  {
    id: 'letter-f',
    title: 'F',
    subtitle: 'Fingerspelling: Letter F',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/f.mp4',
    status: 'available',
    handshape: 'Thumb and index tips touching, other 3 fingers flared upward',
    description: 'Touch the tip of your index finger to your thumb tip (forming a circle), while holding middle, ring, and pinky fingers spread straight up.',
    tips: ['This looks like the classic OK hand gesture with fingers spread.']
  },
  {
    id: 'letter-g',
    title: 'G',
    subtitle: 'Fingerspelling: Letter G',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/g.mp4',
    status: 'available',
    handshape: 'Index finger and thumb pointing parallel horizontally',
    description: 'Extend your index finger and thumb horizontally, parallel to each other with a small gap, while curling the other fingers into palm.',
    tips: ['Point sideways toward your non-dominant side, palm facing inward.']
  },
  {
    id: 'letter-h',
    title: 'H',
    subtitle: 'Fingerspelling: Letter H',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/h.mp4',
    status: 'available',
    handshape: 'Index and middle fingers together pointing horizontally',
    description: 'Extend your index and middle fingers together horizontally pointing sideways, with your thumb tucked beside them.',
    tips: ['Both extended fingers should touch each other tightly.']
  },
  {
    id: 'letter-i',
    title: 'I',
    subtitle: 'Fingerspelling: Letter I',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/i.mp4',
    status: 'available',
    handshape: 'Pinky finger straight up, other fingers closed in fist',
    description: 'Make a fist with your thumb tucked across your middle fingers and raise only your pinky finger straight up.',
    tips: ['Keep your pinky tall and straight, palm facing forward.']
  },
  {
    id: 'letter-j',
    title: 'J',
    subtitle: 'Fingerspelling: Letter J',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/j.mp4',
    status: 'available',
    handshape: 'Pinky tracing a J curve in the air',
    description: 'Start with the letter I handshape (pinky raised) and trace the curved bottom hook of the letter J in the air.',
    tips: ['Rotate your wrist inward smoothly as you carve the bottom curve of the J.']
  },
  {
    id: 'letter-k',
    title: 'K',
    subtitle: 'Fingerspelling: Letter K',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/k.mp4',
    status: 'available',
    handshape: 'Index up, middle forward-up, thumb placed between them',
    description: 'Extend index finger up, middle finger slightly angled forward, and rest your thumb between their base knuckles.',
    tips: ['Your thumb presses against the inside joint of your middle finger.']
  },
  {
    id: 'letter-l',
    title: 'L',
    subtitle: 'Fingerspelling: Letter L',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/l.mp4',
    status: 'available',
    handshape: 'L-shape with index finger and thumb',
    description: 'Point your index finger straight up and thumb straight out to the side at a 90-degree angle, forming an L.',
    tips: ['Keep your other three fingers curled into your palm.']
  },
  {
    id: 'letter-m',
    title: 'M',
    subtitle: 'Fingerspelling: Letter M',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/m.mp4',
    status: 'available',
    handshape: 'Three fingers draped over the tucked thumb',
    description: 'Tuck your thumb across your palm and drape your index, middle, and ring fingers over it, with pinky curled underneath.',
    tips: ['Three knuckles are visible over your thumb, representing the three downward strokes of M.']
  },
  {
    id: 'letter-n',
    title: 'N',
    subtitle: 'Fingerspelling: Letter N',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/n.mp4',
    status: 'available',
    handshape: 'Two fingers draped over the tucked thumb',
    description: 'Tuck your thumb between your middle and ring fingers, draping index and middle fingers over it.',
    tips: ['Two knuckles are visible over the thumb, representing the two downward strokes of N.']
  },
  {
    id: 'letter-o',
    title: 'O',
    subtitle: 'Fingerspelling: Letter O',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/o.mp4',
    status: 'available',
    handshape: 'O-shape with all fingertips touching thumb tip',
    description: 'Curve all fingers and thumb together so all fingertips touch the thumb tip, creating an O.',
    tips: ['Make sure the circle is clearly round and visible from the front.']
  },
  {
    id: 'letter-p',
    title: 'P',
    subtitle: 'Fingerspelling: Letter P',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/p.mp4',
    status: 'available',
    handshape: 'Letter K handshape pointed downwards',
    description: 'Hold the K handshape and point your index finger and middle finger downward from the wrist.',
    tips: ['Your middle finger points straight down, index finger angles slightly forward.']
  },
  {
    id: 'letter-q',
    title: 'Q',
    subtitle: 'Fingerspelling: Letter Q',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/q.mp4',
    status: 'available',
    handshape: 'Letter G handshape pointed downwards',
    description: 'Hold the G handshape (thumb and index parallel) and point both downward toward the ground.',
    tips: ['Fingers point straight downward with a small space between them.']
  },
  {
    id: 'letter-r',
    title: 'R',
    subtitle: 'Fingerspelling: Letter R',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/r.mp4',
    status: 'available',
    handshape: 'Index and middle fingers crossed',
    description: 'Cross your middle finger over your index finger (like wishing for good luck) with other fingers closed.',
    tips: ['Middle finger crosses in front of the index finger.']
  },
  {
    id: 'letter-s',
    title: 'S',
    subtitle: 'Fingerspelling: Letter S',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/s.mp4',
    status: 'available',
    handshape: 'Fist with thumb wrapped across front of fingers',
    description: 'Make a tight fist with your thumb wrapped horizontally across the front of your curled fingers.',
    tips: ['Contrast with letter A (where thumb is at side) and T (where thumb is under index).']
  },
  {
    id: 'letter-t',
    title: 'T',
    subtitle: 'Fingerspelling: Letter T',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/t.mp4',
    status: 'available',
    handshape: 'Thumb tucked under index finger in a fist',
    description: 'Tuck your thumb between your index and middle finger, with the index finger curling over top of the thumb.',
    tips: ['Only the tip of your thumb protrudes between your index and middle fingers.']
  },
  {
    id: 'letter-u',
    title: 'U',
    subtitle: 'Fingerspelling: Letter U',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/u.mp4',
    status: 'available',
    handshape: 'Index and middle fingers held straight up together',
    description: 'Hold your index and middle fingers straight up touching together, with thumb tucked over ring finger.',
    tips: ['Ensure fingers touch tightly together; separating them makes letter V!']
  },
  {
    id: 'letter-v',
    title: 'V',
    subtitle: 'Fingerspelling: Letter V',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/v.mp4',
    status: 'available',
    handshape: 'Index and middle fingers spread in a V / peace sign',
    description: 'Hold index and middle fingers straight up and spread apart into a V shape.',
    tips: ['Palm faces outward toward the viewer.']
  },
  {
    id: 'letter-w',
    title: 'W',
    subtitle: 'Fingerspelling: Letter W',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/w.mp4',
    status: 'available',
    handshape: 'Three fingers (index, middle, ring) held straight up spread apart',
    description: 'Hold your index, middle, and ring fingers straight up and spread apart, with thumb holding pinky down.',
    tips: ['Forms the 3 peaks of the letter W.']
  },
  {
    id: 'letter-x',
    title: 'X',
    subtitle: 'Fingerspelling: Letter X',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/x.mp4',
    status: 'available',
    handshape: 'Fist with index finger curled into a hook',
    description: 'Make a fist and raise your index finger, bending it at both knuckles into a hook shape.',
    tips: ['Resembles Captain Hook\'s pirate hook or a curved question mark.']
  },
  {
    id: 'letter-y',
    title: 'Y',
    subtitle: 'Fingerspelling: Letter Y',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/y.mp4',
    status: 'available',
    handshape: 'Thumb and pinky extended, middle three fingers folded (hang loose / shaka)',
    description: 'Extend your thumb and pinky finger out wide while folding your middle three fingers against your palm.',
    tips: ['Keep your palm facing toward the viewer.']
  },
  {
    id: 'letter-z',
    title: 'Z',
    subtitle: 'Fingerspelling: Letter Z',
    category: 'Alphabet',
    videoUrl: '/videos/alphabet/z.mp4',
    status: 'available',
    handshape: 'Index finger tracing a Z in the air',
    description: 'Extend your index finger and draw the three strokes of the letter Z in the air in front of you.',
    tips: ['Draw across, diagonally down, and across from your dominant to non-dominant side.']
  }
]

export const COMMON_WORDS: ASLVideoItem[] = [
  {
    id: 'word-hello',
    title: 'Hello',
    subtitle: 'Common Word: Greeting',
    category: 'Common Words',
    videoUrl: '/videos/asl/hello.mp4',
    status: 'available',
    handshape: 'Open flat hand (B-handshape)',
    description: 'Place fingertips of your open flat hand near your temple and move your hand outward and forward in a salute-like greeting motion.',
    tips: [
      'Maintain a friendly facial expression with eye contact.',
      'Movement is smooth and dignified, extending forward toward the recipient.'
    ]
  },
  {
    id: 'word-thank-you',
    title: 'Thank You',
    subtitle: 'Common Word: Gratitude',
    category: 'Common Words',
    videoUrl: '/videos/asl/thank_you.mp4',
    status: 'available',
    handshape: 'Open flat hand (B-handshape)',
    description: 'Touch the fingertips of your dominant flat hand to your lips or chin, then move your hand outward and slightly downward toward recipient.',
    tips: [
      'Smile and nod gently as you sign.',
      'Moving both hands forward expresses "Thank you very much".'
    ]
  },
  {
    id: 'word-please',
    title: 'Please',
    subtitle: 'Common Word: Politeness',
    category: 'Common Words',
    videoUrl: '/videos/asl/please.mp4',
    status: 'available',
    handshape: 'Open flat hand with thumb extended',
    description: 'Place your dominant flat palm on the center of your chest and rub in a gentle clockwise circular motion.',
    tips: [
      'Perform 2 to 3 gentle circular rubs.',
      'A slight forward lean of upper body conveys sincerity and politeness.'
    ]
  },
  {
    id: 'word-sorry',
    title: 'Sorry',
    subtitle: 'Common Word: Apology',
    category: 'Common Words',
    videoUrl: '/videos/asl/sorry.mp4',
    status: 'available',
    handshape: 'A-handshape (fist with thumb alongside)',
    description: 'Form an A-handshape (fist with thumb alongside index finger) and rub in a circular motion over your heart and chest.',
    tips: [
      'An apologetic, sincere facial expression reinforces the apology.',
      'Circular motion is typically clockwise from your perspective.'
    ]
  },
  {
    id: 'word-yes',
    title: 'Yes',
    subtitle: 'Common Word: Affirmation',
    category: 'Common Words',
    videoUrl: '/videos/asl/yes.mp4',
    status: 'available',
    handshape: 'Closed fist (S-handshape)',
    description: 'Hold your closed fist in front of your chest and nod it up and down at the wrist, mimicking a nodding head.',
    tips: [
      'Nod your fist twice at a natural conversational tempo.',
      'Nodding your head in tandem reinforces the affirmation.'
    ]
  },
  {
    id: 'word-no',
    title: 'No',
    subtitle: 'Common Word: Negation',
    category: 'Common Words',
    videoUrl: '/videos/asl/no.mp4',
    status: 'available',
    handshape: 'Index and middle fingers snapping to thumb',
    description: 'Extend your index and middle fingers together and snap them down firmly onto the tip of your extended thumb.',
    tips: [
      'Snap fingers down once or twice with crisp definition.',
      'A slight shake of the head accompanies natural ASL delivery.'
    ]
  },
  {
    id: 'word-help',
    title: 'Help',
    subtitle: 'Common Word: Assistance',
    category: 'Common Words',
    videoUrl: '/videos/asl/help.mp4',
    status: 'available',
    handshape: 'Closed fist with thumb upright on open palm',
    description: 'Place your dominant fist with thumb pointing upward onto the flat palm of your non-dominant hand, lifting both upward together.',
    tips: [
      'This sign is directional: moving upward/forward requests or offers help.',
      'Move toward yourself for "help me" or toward the other person for "help you".'
    ]
  },
  {
    id: 'word-good-morning',
    title: 'Good Morning',
    subtitle: 'Common Word: Daily Greeting',
    category: 'Common Words',
    videoUrl: '',
    status: 'unavailable',
    handshape: 'Compound sign (GOOD + MORNING)',
    description: 'Sign not available yet. This sign is currently in the authentic ASL video verification pipeline.',
    tips: [
      'In ASL, formed by signing GOOD (flat hand from chin into palm) followed by MORNING (non-dominant arm horizontal, dominant arm rising like the sun).',
      'Authentic clip recording in progress.'
    ]
  },
  {
    id: 'word-good-night',
    title: 'Good Night',
    subtitle: 'Common Word: Evening Farewell',
    category: 'Common Words',
    videoUrl: '',
    status: 'unavailable',
    handshape: 'Compound sign (GOOD + NIGHT)',
    description: 'Sign not available yet. This sign is currently in the authentic ASL video verification pipeline.',
    tips: [
      'In ASL, formed by signing GOOD followed by NIGHT (dominant bent hand curving over the edge of the horizontal non-dominant wrist).',
      'Authentic clip recording in progress.'
    ]
  },
  {
    id: 'word-welcome',
    title: 'Welcome',
    subtitle: 'Common Word: Hospitality',
    category: 'Common Words',
    videoUrl: '',
    status: 'unavailable',
    handshape: 'Open flat palm sweeping inward',
    description: 'Sign not available yet. This sign is currently in the authentic ASL video verification pipeline.',
    tips: [
      'Open dominant flat palm held out to the side, sweeping gently inward toward the waist/center of body with a welcoming smile.',
      'Authentic clip recording in progress.'
    ]
  },
  {
    id: 'word-goodbye',
    title: 'Goodbye',
    subtitle: 'Common Word: Farewell',
    category: 'Common Words',
    videoUrl: '/videos/asl/goodbye.mp4',
    status: 'available',
    handshape: 'Open flat hand waving fingers downward',
    description: 'Raise your dominant open hand at head level and curl all four fingers downward toward your palm in smooth succession.',
    tips: [
      'Functions as the complete standard sign language farewell for "Goodbye" and "See you".',
      'Wave fingers comfortably with friendly eye contact.'
    ]
  },
  {
    id: 'word-i-love-you',
    title: 'I Love You',
    subtitle: 'Common Word: Expression of Affection',
    category: 'Common Words',
    videoUrl: '/videos/asl/i_love_you.mp4',
    status: 'available',
    handshape: 'ILY Handshape (Thumb, Index & Pinky extended)',
    description: 'Extend your thumb, index finger, and pinky finger upright while curling your middle and ring fingers into your palm.',
    tips: [
      'This single authentic ASL sign combines the manual letters I, L, and Y into the iconic expression "I love you".',
      'Keep palm facing directly toward the person you are communicating with.'
    ]
  }
]

export const COMMON_PHRASES: ASLVideoItem[] = [
  {
    id: 'phrase-how-are-you',
    title: 'How Are You?',
    subtitle: 'Common Phrase: Conversational Inquiry',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/how.mp4',
    status: 'available',
    handshape: 'Both curved hands rotating outward',
    description: 'Hold both curved hands in front of your chest with back of fingers touching, roll hands outward together so palms finish facing upward.',
    tips: [
      'Tilting your head slightly forward with raised or relaxed eyebrows turns this sign into the friendly inquiry "How are you?".',
      'Smooth, rolling wrist motion is key.'
    ]
  },
  {
    id: 'phrase-what-is-your-name',
    title: 'What Is Your Name?',
    subtitle: 'Common Phrase: Introduction Question',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/name.mp4',
    status: 'available',
    handshape: 'H-handshapes (Index & Middle fingers extended)',
    description: 'Form H-handshapes with both hands and tap your dominant index/middle fingers crosswise across the non-dominant index/middle fingers twice.',
    tips: [
      'In ASL grammar, furrowing your eyebrows while signing NAME naturally forms the WH-question "What is your name?".',
      'Tap twice lightly at knuckle level.'
    ]
  },
  {
    id: 'phrase-my-name-is',
    title: 'My Name Is...',
    subtitle: 'Common Phrase: Self Introduction',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/name.mp4',
    status: 'available',
    handshape: 'Open flat hand to chest + H-handshapes tapping',
    description: 'Place your flat dominant palm on your chest for "MY", then tap H-handshapes crosswise for "NAME", then fingerspell your name letter by letter.',
    tips: [
      'Use the Alphabet (A–Z) section on the right to practice fingerspelling each letter of your own name.',
      'Maintain smooth, clear hand positioning when fingerspelling.'
    ]
  },
  {
    id: 'phrase-nice-to-meet-you',
    title: 'Nice To Meet You',
    subtitle: 'Common Phrase: Social Pleasantry',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/nice.mp4',
    status: 'available',
    handshape: 'Dominant palm sliding across non-dominant palm',
    description: 'Place your dominant flat palm on the flat non-dominant palm and slide it forward smoothly off the fingertips.',
    tips: [
      'Accompanied by a warm smile, this sign conveys "Nice" and "Pleased to meet you".',
      'The forward slide is deliberate and smooth.'
    ]
  },
  {
    id: 'phrase-i-am-fine',
    title: 'I Am Fine',
    subtitle: 'Common Phrase: Polite Affirmative Response',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/fine.mp4',
    status: 'available',
    handshape: '5-handshape (open palm with thumb touching chest)',
    description: 'Hold an open 5-handshape with fingers spread and tap the tip of your thumb against the center of your chest twice.',
    tips: [
      'A pleasant, casual facial expression conveys "I am doing well / I am fine".',
      'Tap gently on the breastbone.'
    ]
  },
  {
    id: 'phrase-thank-you-very-much',
    title: 'Thank You Very Much',
    subtitle: 'Common Phrase: Deep Gratitude',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/thank_you.mp4',
    status: 'available',
    handshape: 'Flat hand moving generously forward from chin',
    description: 'Touch fingers to lips or chin and extend your hand forward toward recipient with an earnest smile and slight nod.',
    tips: [
      'Extending the sign forward with warm eye contact expresses "Thank you very much".',
      'Can also be signed with both hands moving forward simultaneously for emphatic thanks.'
    ]
  },
  {
    id: 'phrase-see-you-later',
    title: 'See You Later',
    subtitle: 'Common Phrase: Casual Farewell',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/goodbye.mp4',
    status: 'available',
    handshape: 'Open hand curling fingers toward palm in wave',
    description: 'Raise dominant hand at head level facing forward and curl fingers sequentially toward palm in standard conversational farewell.',
    tips: [
      'Standard ASL closing farewell for informal departures and "See you later".',
      'A friendly wave that signals continuing connection.'
    ]
  },
  {
    id: 'phrase-can-you-help-me',
    title: 'Can You Help Me?',
    subtitle: 'Common Phrase: Directional Assistance Request',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/help.mp4',
    status: 'available',
    handshape: 'HELP sign directed toward oneself',
    description: 'Form the HELP sign (fist on open palm) and draw it inward toward your chest while tilting your head with an inquiring expression.',
    tips: [
      'In ASL, HELP is a directional verb: moving it toward yourself means "Help me", and asking brows make it "Can you help me?".',
      'Raising eyebrows signals a yes/no question.'
    ]
  },
  {
    id: 'phrase-i-dont-understand',
    title: "I Don't Understand",
    subtitle: 'Common Phrase: Clarification Request',
    category: 'Common Phrases',
    videoUrl: '',
    status: 'unavailable',
    handshape: 'Index finger flicking near forehead with head shake',
    description: 'Sign not available yet. This sign is currently in the authentic ASL video verification pipeline.',
    tips: [
      'In ASL, formed by flicking index finger upward from thumb near temple (UNDERSTAND) while shaking head negatively.',
      'Authentic clip recording in progress.'
    ]
  },
  {
    id: 'phrase-where-are-you-from',
    title: 'Where Are You From?',
    subtitle: 'Common Phrase: Inquiry Question',
    category: 'Common Phrases',
    videoUrl: '/videos/asl/where.mp4',
    status: 'available',
    handshape: 'Index finger oscillating side to side',
    description: 'Hold index finger upright at shoulder height and shake it gently side-to-side while furrowing eyebrows in an inquiring expression.',
    tips: [
      'Furrowed eyebrows indicate a WH-question (WHERE). Combined with FROM, it asks "Where are you from?".',
      'Keep wrist relaxed.'
    ]
  }
]

// Backward compatibility alias
export const COMMON_SENTENCES = COMMON_PHRASES

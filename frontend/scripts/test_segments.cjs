const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Read aslCatalog.json from backend/data/asl_catalog.json
const catalogPath = path.resolve(__dirname, '../../backend/data/asl_catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Replicate segmentText logic to test against catalog
function normalize(value) {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STEM_MAP = {
  helping: 'help', helped: 'help', helps: 'help', assistant: 'help',
  thanks: 'thank you', thanked: 'thank you',
  drinking: 'water', drinks: 'water', drank: 'water',
  eating: 'eat', ate: 'eat', meals: 'eat', food: 'eat',
  waiting: 'wait', waited: 'wait',
  wanting: 'want', wanted: 'want',
  needing: 'need', needed: 'need',
  hurting: 'pain', hurts: 'pain', aching: 'pain',
  restroom: 'bathroom', washroom: 'bathroom', toilet: 'bathroom',
  physician: 'doctor', doctors: 'doctor',
  hospitals: 'hospital', urgent: 'emergency',
  friends: 'friend', bye: 'goodbye', byebye: 'goodbye',
  hi: 'hello', hey: 'hello', greetings: 'hello',
};

function segmentText(text, signs) {
  if (!text || text.trim() === '') return [];
  const lookup = new Map();
  let maxWords = 1;

  for (const sign of signs) {
    const primaryKey = normalize(sign.sign.replace(/_/g, ' '));
    if (primaryKey) {
      lookup.set(primaryKey, sign);
      maxWords = Math.max(maxWords, primaryKey.split(' ').length);
    }
    if (sign.gloss) {
      const glossKey = normalize(sign.gloss.replace(/-/g, ' '));
      if (glossKey) {
        lookup.set(glossKey, sign);
        maxWords = Math.max(maxWords, glossKey.split(' ').length);
      }
    }
    if (Array.isArray(sign.keywords)) {
      for (const kw of sign.keywords) {
        const kwKey = normalize(kw);
        if (kwKey) {
          lookup.set(kwKey, sign);
          maxWords = Math.max(maxWords, kwKey.split(' ').length);
        }
      }
    }
  }

  const rawTokens = text.trim().split(/\s+/).filter(Boolean);
  const segments = [];
  let index = 0;

  while (index < rawTokens.length) {
    let matched = false;
    const limit = Math.min(maxWords, rawTokens.length - index);

    for (let size = limit; size >= 1; size -= 1) {
      const chunk = rawTokens.slice(index, index + size).join(' ');
      const normChunk = normalize(chunk);
      let sign = lookup.get(normChunk);
      if (!sign && STEM_MAP[normChunk]) {
        sign = lookup.get(STEM_MAP[normChunk]);
      }
      if (sign) {
        segments.push({
          text: chunk,
          sign,
          aslGloss: sign.gloss || sign.sign.toUpperCase(),
        });
        index += size;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const token = rawTokens[index];
      const cleanWord = token.replace(/[^a-zA-Z]/g, '');
      if (cleanWord.length > 0) {
        segments.push({
          text: token,
          sign: null,
          aslGloss: `FS(${cleanWord.toUpperCase()})`,
          isFingerspelled: true,
          letters: cleanWord.toUpperCase().split(''),
        });
      } else {
        segments.push({
          text: token,
          sign: null,
          aslGloss: '—',
        });
      }
      index += 1;
    }
  }
  return segments;
}

const mockSigns = catalog.map(s => ({
  sign: s.id,
  gloss: s.gloss,
  keywords: s.keywords,
  video_url: s.video_url
}));

console.log('Testing 1: Hello, thank you, help, goodbye');
const s1 = segmentText('hello thank you help goodbye', mockSigns);
assert.strictEqual(s1.length, 4);
assert.strictEqual(s1[0].aslGloss, 'HELLO');
assert.strictEqual(s1[1].aslGloss, 'THANK-YOU');
assert.strictEqual(s1[2].aslGloss, 'HELP');
assert.strictEqual(s1[3].aslGloss, 'GOODBYE');
console.log('  [PASS] Key signs verified successfully');

console.log('Testing 2: Lemmatization (helping, drank, physician, toilet)');
const s2 = segmentText('helping drank physician toilet', mockSigns);
assert.strictEqual(s2[0].aslGloss, 'HELP');
assert.strictEqual(s2[1].aslGloss, 'WATER');
assert.strictEqual(s2[2].aslGloss, 'DOCTOR');
assert.strictEqual(s2[3].aslGloss, 'BATHROOM');
console.log('  [PASS] Lemmatization successfully mapped to ASL signs');

console.log('Testing 3: Fingerspelling fallback for names (Maya, David)');
const s3 = segmentText('Maya David', mockSigns);
assert.strictEqual(s3[0].isFingerspelled, true);
assert.deepStrictEqual(s3[0].letters, ['M', 'A', 'Y', 'A']);
assert.strictEqual(s3[1].isFingerspelled, true);
assert.deepStrictEqual(s3[1].letters, ['D', 'A', 'V', 'I', 'D']);
console.log('  [PASS] Names accurately routed to ASL manual fingerspelling');

console.log('\nAll JS test assertions passed cleanly!');

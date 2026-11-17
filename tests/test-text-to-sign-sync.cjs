const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('Text-to-Sign & Learn Shared ASL Infrastructure Validation', async (t) => {
  const root = path.resolve(__dirname, '..')

  await t.test('aslLibrary.ts exists and exports master registries', () => {
    const libPath = path.join(root, 'frontend', 'src', 'lib', 'aslLibrary.ts')
    assert.ok(fs.existsSync(libPath), 'frontend/src/lib/aslLibrary.ts must exist')
    const content = fs.readFileSync(libPath, 'utf8')
    assert.ok(content.includes('ALL_ASL_LIBRARY_ITEMS'), 'Must export ALL_ASL_LIBRARY_ITEMS')
    assert.ok(content.includes('getAslLibraryItem'), 'Must export getAslLibraryItem')
    assert.ok(content.includes('phrase-how-are-you'), 'Must include conversational phrases')
    assert.ok(content.includes('ALPHABET_REGISTRY') || content.includes('letter-'), 'Must include alphabet letters')
  })

  await t.test('segments.ts integrates with shared ASL library', () => {
    const segmentsPath = path.join(root, 'frontend', 'src', 'lib', 'segments.ts')
    assert.ok(fs.existsSync(segmentsPath), 'frontend/src/lib/segments.ts must exist')
    const content = fs.readFileSync(segmentsPath, 'utf8')
    assert.ok(content.includes('ALL_ASL_LIBRARY_ITEMS'), 'segments.ts must import ALL_ASL_LIBRARY_ITEMS')
    assert.ok(content.includes('isFingerspelled'), 'segments.ts must handle fingerspelling')
  })

  await t.test('TextToSign.tsx implements synchronized dual stage and playback controls', () => {
    const ttsPath = path.join(root, 'frontend', 'src', 'pages', 'TextToSign.tsx')
    assert.ok(fs.existsSync(ttsPath), 'frontend/src/pages/TextToSign.tsx must exist')
    const content = fs.readFileSync(ttsPath, 'utf8')

    // Dual stage layout & View modes
    assert.ok(content.includes('asl-dual-stage-grid'), 'Must use asl-dual-stage-grid')
    assert.ok(content.includes('asl-panel-video'), 'Must contain ASL reference video panel')
    assert.ok(content.includes('asl-panel-avatar'), 'Must contain 3D avatar panel')
    assert.ok(content.includes('side-by-side'), 'Must support side-by-side view mode')
    assert.ok(content.includes('AslAvatarCanvas'), 'Must reuse AslAvatarCanvas')

    // Avatar options (Maya, Alex, Jordan, Sign-Kit)
    assert.ok(content.includes('signkit'), 'Must support Sign-Kit (X-Bot)')
    assert.ok(content.includes('maya'), 'Must support Maya')
    assert.ok(content.includes('alex'), 'Must support Alex')
    assert.ok(content.includes('jordan'), 'Must support Jordan')

    // Controls
    assert.ok(content.includes('SPEEDS'), 'Must have speed controls')
    assert.ok(content.includes('handleReplay'), 'Must support replay')
    assert.ok(content.includes('isLooping'), 'Must support loop toggle')
    assert.ok(content.includes('handleSeek'), 'Must support timeline scrubbing')
    assert.ok(content.includes('Convert to ASL Sequence'), 'Must have dedicated Convert button')
  })

  await t.test('ASL video assets exist in public mirror', () => {
    const aslVideoDir = path.join(root, 'frontend', 'public', 'videos', 'asl')
    const alphaVideoDir = path.join(root, 'frontend', 'public', 'videos', 'alphabet')

    assert.ok(fs.existsSync(aslVideoDir), 'public/videos/asl must exist')
    assert.ok(fs.existsSync(alphaVideoDir), 'public/videos/alphabet must exist')

    // Verify key test videos
    const requiredVideos = ['hello.mp4', 'thank_you.mp4', 'help.mp4', 'how.mp4', 'goodbye.mp4']
    for (const vid of requiredVideos) {
      assert.ok(fs.existsSync(path.join(aslVideoDir, vid)), `Video missing: ${vid}`)
    }

    // Verify all 26 alphabet videos
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(97 + i)
      assert.ok(fs.existsSync(path.join(alphaVideoDir, `${char}.mp4`)), `Alphabet video missing: ${char}.mp4`)
    }
  })
})

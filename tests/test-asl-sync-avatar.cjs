const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('ASL 3D Avatar & Synchronized Motion Validation Suite', async (t) => {
  // 1. Verify Sign-Kit models on disk
  await t.test('Sign-Kit GLB avatar assets exist and have non-zero size', () => {
    const xbotPath = path.resolve(__dirname, '../frontend/public/models/avatars/xbot.glb');
    const ybotPath = path.resolve(__dirname, '../frontend/public/models/avatars/ybot.glb');

    assert.ok(fs.existsSync(xbotPath), 'xbot.glb must exist in frontend/public/models/avatars/');
    assert.ok(fs.existsSync(ybotPath), 'ybot.glb must exist in frontend/public/models/avatars/');

    const xbotStat = fs.statSync(xbotPath);
    const ybotStat = fs.statSync(ybotPath);
    assert.ok(xbotStat.size > 2000000, `xbot.glb size should be ~2.2MB, got ${xbotStat.size}`);
    assert.ok(ybotStat.size > 2000000, `ybot.glb size should be ~2.2MB, got ${ybotStat.size}`);
  });

  // 2. Verify extracted animations JSON datasets
  await t.test('Extracted ASL alphabet animations dataset contains all 26 letters', () => {
    const alphaJsonPath = path.resolve(__dirname, '../backend/data/asl_alphabet_animations.json');
    assert.ok(fs.existsSync(alphaJsonPath), 'asl_alphabet_animations.json must exist');

    const data = JSON.parse(fs.readFileSync(alphaJsonPath, 'utf8'));
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

    for (const char of letters) {
      assert.ok(data[char], `Animation for letter ${char.toUpperCase()} must exist`);
      assert.ok(Array.isArray(data[char].keyframes), `Keyframes for ${char} must be an array`);
      assert.ok(data[char].keyframes.length >= 2, `Keyframes for ${char} must have at least 2 points`);

      // Verify keyframe structure
      const kf0 = data[char].keyframes[0];
      assert.equal(typeof kf0.t, 'number');
      assert.ok(kf0.t >= 0.0 && kf0.t <= 1.0);
      assert.ok(kf0.rightArm && kf0.rightArm.hand);
      assert.ok(kf0.rightArm.hand.thumb);
      assert.ok(kf0.rightArm.hand.index);
    }
  });

  await t.test('Extracted ASL vocabulary animations dataset contains core verified words', () => {
    const vocabJsonPath = path.resolve(__dirname, '../backend/data/asl_vocab_animations.json');
    assert.ok(fs.existsSync(vocabJsonPath), 'asl_vocab_animations.json must exist');

    const data = JSON.parse(fs.readFileSync(vocabJsonPath, 'utf8'));
    const requiredSigns = ['hello', 'thank_you', 'please', 'yes', 'no', 'help', 'doctor', 'water', 'eat', 'more'];

    for (const sign of requiredSigns) {
      assert.ok(data[sign], `Verified sign animation for ${sign} must exist`);
      assert.ok(data[sign].keyframes.length >= 2, `Keyframes for ${sign} must have at least 2 points`);
      assert.ok(data[sign].durationSec > 0, `Duration for ${sign} must be positive`);
    }
  });

  // 3. Verify TypeScript animation library has full coverage
  await t.test('frontend/src/lib/aslAnimations.ts exports full alphabet and vocabulary', () => {
    const tsPath = path.resolve(__dirname, '../frontend/src/lib/aslAnimations.ts');
    assert.ok(fs.existsSync(tsPath), 'aslAnimations.ts must exist');

    const content = fs.readFileSync(tsPath, 'utf8');
    assert.ok(content.includes('export const ASL_ANIMATIONS: Record<string, AslSignAnimation>'));
    assert.ok(content.includes('export function getAslAnimation'));
    assert.ok(content.includes('export function hasAslAnimation'));

    // Check letter entries
    for (const char of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      assert.ok(content.includes(`"${char}":`), `aslAnimations.ts must contain letter ${char}`);
      assert.ok(content.includes(`"letter_${char}":`), `aslAnimations.ts must contain alias letter_${char}`);
    }
  });

  // 4. Verify reference video files exist for synchronized playback
  await t.test('All 26 ASL alphabet videos exist in frontend/public/videos/alphabet', () => {
    const alphaDir = path.resolve(__dirname, '../frontend/public/videos/alphabet');
    for (const char of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      const vidPath = path.join(alphaDir, `${char}.mp4`);
      assert.ok(fs.existsSync(vidPath), `Video for letter ${char}.mp4 must exist`);
      assert.ok(fs.statSync(vidPath).size > 10000, `Video for ${char}.mp4 must be non-empty`);
    }
  });

  await t.test('Core ASL vocabulary videos exist in frontend/public/videos/asl', () => {
    const aslDir = path.resolve(__dirname, '../frontend/public/videos/asl');
    const words = ['hello', 'thank_you', 'please', 'yes', 'no', 'help', 'doctor', 'water', 'eat', 'more'];
    for (const w of words) {
      const vidPath = path.join(aslDir, `${w}.mp4`);
      assert.ok(fs.existsSync(vidPath), `Video for ${w}.mp4 must exist`);
      assert.ok(fs.statSync(vidPath).size > 10000, `Video for ${w}.mp4 must be non-empty`);
    }
  });
});

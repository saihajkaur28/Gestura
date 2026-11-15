import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const target = resolve(scriptDir, '..', 'public', 'models', 'hand_landmarker.task')
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

if (await exists(target)) {
  console.log('[fetch-model] hand_landmarker.task already present, skipping download.')
  process.exit(0)
}

console.log('[fetch-model] downloading official MediaPipe hand_landmarker.task ...')
const response = await fetch(modelUrl)
if (!response.ok) {
  console.error(`[fetch-model] download failed: HTTP ${response.status} ${response.statusText}`)
  process.exit(1)
}

const buffer = Buffer.from(await response.arrayBuffer())
await mkdir(dirname(target), { recursive: true })
await writeFile(target, buffer)
console.log(
  `[fetch-model] saved ${(buffer.length / 1024 / 1024).toFixed(2)} MB to public/models/hand_landmarker.task`,
)

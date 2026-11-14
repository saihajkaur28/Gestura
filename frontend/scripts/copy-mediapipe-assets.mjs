import { access, cp, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')
const source = resolve(projectRoot, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const target = resolve(projectRoot, 'public', 'mediapipe', 'wasm')

try {
  await access(source)
} catch {
  console.error(
    '[mediapipe-assets] @mediapipe/tasks-vision is not installed. Run `npm install` first.',
  )
  process.exit(1)
}

await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
console.log('[mediapipe-assets] copied MediaPipe wasm runtime to public/mediapipe/wasm')

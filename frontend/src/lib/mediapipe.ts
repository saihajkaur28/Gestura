import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const assetBase = import.meta.env.BASE_URL

export const HAND_LANDMARKER_WASM_PATH = `${assetBase}mediapipe/wasm`
export const HAND_LANDMARKER_MODEL_PATH = `${assetBase}models/hand_landmarker.task`

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(HAND_LANDMARKER_WASM_PATH)

  const buildOptions = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: {
      modelAssetPath: HAND_LANDMARKER_MODEL_PATH,
      delegate,
    },
    runningMode: 'VIDEO' as const,
    numHands: 2,
  })

  try {
    return await HandLandmarker.createFromOptions(vision, buildOptions('GPU'))
  } catch (error) {
    console.warn('[mediapipe] GPU delegate unavailable, retrying on CPU.', error)
    return HandLandmarker.createFromOptions(vision, buildOptions('CPU'))
  }
}

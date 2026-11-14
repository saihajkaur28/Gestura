import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const assetBase = import.meta.env.BASE_URL

export const HAND_LANDMARKER_WASM_PATH = `${assetBase}mediapipe/wasm`
export const HAND_LANDMARKER_MODEL_PATH = `${assetBase}models/hand_landmarker.task`

export const MAX_CANDIDATE_HANDS = 4

export interface HandLandmarkerConfig {
  numHands: number
}

export async function createHandLandmarker(
  config: Partial<HandLandmarkerConfig> = {},
): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(HAND_LANDMARKER_WASM_PATH)

  const buildOptions = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: {
      modelAssetPath: HAND_LANDMARKER_MODEL_PATH,
      delegate,
    },
    runningMode: 'VIDEO' as const,
    numHands: config.numHands ?? MAX_CANDIDATE_HANDS,
  })

  try {
    return await HandLandmarker.createFromOptions(vision, buildOptions('GPU'))
  } catch (error) {
    console.warn('[mediapipe] GPU delegate unavailable, retrying on CPU.', error)
    return HandLandmarker.createFromOptions(vision, buildOptions('CPU'))
  }
}

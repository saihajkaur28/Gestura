import { FaceLandmarker, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const assetBase = import.meta.env.BASE_URL

export const HAND_LANDMARKER_WASM_PATH = `${assetBase}mediapipe/wasm`
export const HAND_LANDMARKER_MODEL_PATH = `${assetBase}models/hand_landmarker.task`
export const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export const MAX_CANDIDATE_HANDS = 2

export interface HandLandmarkerConfig {
  numHands: number
  minHandDetectionConfidence: number
  minHandPresenceConfidence: number
  minTrackingConfidence: number
}

export async function createHandLandmarker(
  config: Partial<HandLandmarkerConfig> = {},
): Promise<HandLandmarker> {
  let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>
  try {
    vision = await FilesetResolver.forVisionTasks(HAND_LANDMARKER_WASM_PATH)
  } catch (localError) {
    console.warn('[mediapipe] Local WASM fileset resolution failed, trying CDN fallback...', localError)
    vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    )
  }

  const buildOptions = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: {
      modelAssetPath: HAND_LANDMARKER_MODEL_PATH,
      delegate,
    },
    runningMode: 'VIDEO' as const,
    numHands: config.numHands ?? MAX_CANDIDATE_HANDS,
    minHandDetectionConfidence: config.minHandDetectionConfidence ?? 0.5,
    minHandPresenceConfidence: config.minHandPresenceConfidence ?? 0.5,
    minTrackingConfidence: config.minTrackingConfidence ?? 0.5,
  })

  try {
    return await HandLandmarker.createFromOptions(vision, buildOptions('GPU'))
  } catch (error) {
    console.warn('[mediapipe] GPU delegate unavailable, retrying on CPU.', error)
    return HandLandmarker.createFromOptions(vision, buildOptions('CPU'))
  }
}

export async function createFaceLandmarker(): Promise<FaceLandmarker | null> {
  try {
    let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>
    try {
      vision = await FilesetResolver.forVisionTasks(HAND_LANDMARKER_WASM_PATH)
    } catch {
      vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
      )
    }

    const buildOptions = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        delegate,
      },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    try {
      return await FaceLandmarker.createFromOptions(vision, buildOptions('GPU'))
    } catch {
      return await FaceLandmarker.createFromOptions(vision, buildOptions('CPU'))
    }
  } catch (error) {
    console.warn('[mediapipe] Face landmarker unavailable, continuing with hands only.', error)
    return null
  }
}
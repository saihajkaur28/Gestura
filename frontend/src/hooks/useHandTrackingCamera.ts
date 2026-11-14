import { useCallback, useEffect, useRef, useState } from 'react'
import type { HandLandmarker } from '@mediapipe/tasks-vision'
import { createHandLandmarker } from '../lib/mediapipe'
import { drawHandLandmarks } from '../lib/drawLandmarks'
import { DETECTION_RANGES, HandTracker } from '../lib/handTracking'
import type { DetectionRange, TrackingResult } from '../lib/handTracking'

export type CameraState = 'idle' | 'starting' | 'running' | 'error'
export type ModelState = 'loading' | 'ready' | 'error'

export interface TrackingFrame {
  timestamp: number
  tracking: TrackingResult
}

export interface UseHandTrackingCameraOptions {
  onFrame?: (frame: TrackingFrame) => void
}

export function useHandTrackingCamera(options: UseHandTrackingCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const trackerRef = useRef<HandTracker | null>(null)
  const onFrameRef = useRef(options.onFrame)
  const pausedRef = useRef(false)

  if (trackerRef.current === null) {
    trackerRef.current = new HandTracker('medium')
  }

  const [modelState, setModelState] = useState<ModelState>('loading')
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [handCount, setHandCount] = useState(0)
  const [handedness, setHandedness] = useState('')
  const [fps, setFps] = useState(0)
  const [range, setRange] = useState<DetectionRange>('medium')

  useEffect(() => {
    onFrameRef.current = options.onFrame
  }, [options.onFrame])

  useEffect(() => {
    trackerRef.current?.setRange(range)
  }, [range])

  const loadModel = useCallback(async () => {
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    setModelState('loading')
    try {
      const landmarker = await createHandLandmarker()
      landmarkerRef.current = landmarker
      setModelState('ready')
      setError(null)
    } catch (loadError) {
      console.error('[mediapipe] Failed to load the hand landmarker.', loadError)
      setModelState('error')
      setError(
        `Hand landmark model failed to load: ${
          loadError instanceof Error ? loadError.message : String(loadError)
        }`,
      )
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    lastVideoTimeRef.current = -1
    trackerRef.current?.reset()
    const canvas = canvasRef.current
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHandCount(0)
    setHandedness('')
    setFps(0)
    setCameraState('idle')
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error')
      setError('This browser does not support camera access (getUserMedia is unavailable).')
      return
    }
    if (!landmarkerRef.current) {
      setCameraState('error')
      setError('The hand landmark model is not ready yet. Wait for it to load, then retry.')
      return
    }

    setCameraState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        throw new Error('The video element is not available.')
      }
      video.srcObject = stream
      await video.play()
      setCameraState('running')

      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          if (streamRef.current !== stream) return
          stopCamera()
          setCameraState('error')
          setError('The camera was disconnected. Reconnect it and start the camera again.')
        })
      }

      let frameCount = 0
      let lastFpsTime = performance.now()

      const loop = () => {
        const landmarker = landmarkerRef.current
        const currentVideo = videoRef.current
        const canvas = canvasRef.current

        if (
          !pausedRef.current &&
          landmarker &&
          currentVideo &&
          canvas &&
          currentVideo.readyState >= 2
        ) {
          if (currentVideo.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = currentVideo.currentTime
            const now = performance.now()
            const result = landmarker.detectForVideo(currentVideo, now)
            const tracker = trackerRef.current
            const tracking = tracker?.update(result, now)
            drawHandLandmarks(canvas, currentVideo, tracking?.renderHands ?? [])

            if (tracking) {
              onFrameRef.current?.({ timestamp: now, tracking })
            }

            setHandCount(tracking?.activeHands.length ?? 0)
            const nextHandedness = (tracking?.activeHands ?? [])
              .map((hand) => hand.handedness)
              .join(', ')
            setHandedness((previous) =>
              previous === nextHandedness ? previous : nextHandedness,
            )
          }

          frameCount += 1
          const now = performance.now()
          if (now - lastFpsTime >= 1000) {
            setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)))
            frameCount = 0
            lastFpsTime = now
          }
        }

        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)
    } catch (cameraError) {
      console.error('[camera] Could not start the webcam.', cameraError)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraState('error')
      setError(
        `Could not start the webcam: ${
          cameraError instanceof Error ? cameraError.message : String(cameraError)
        }`,
      )
    }
  }, [stopCamera])

  useEffect(() => {
    let cancelled = false

    async function runModelLoad() {
      try {
        const landmarker = await createHandLandmarker()
        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker
        setModelState('ready')
        setError(null)
      } catch (loadError) {
        if (cancelled) return
        console.error('[mediapipe] Failed to load the hand landmarker.', loadError)
        setModelState('error')
        setError(
          `Hand landmark model failed to load: ${
            loadError instanceof Error ? loadError.message : String(loadError)
          }`,
        )
      }
    }

    void runModelLoad()

    const handleVisibility = () => {
      pausedRef.current = document.visibilityState === 'hidden'
      if (!pausedRef.current) {
        lastVideoTimeRef.current = -1
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  return {
    videoRef,
    canvasRef,
    modelState,
    cameraState,
    error,
    handCount,
    handedness,
    fps,
    range,
    setRange,
    startCamera,
    stopCamera,
    loadModel,
    detectionRanges: DETECTION_RANGES,
  }
}

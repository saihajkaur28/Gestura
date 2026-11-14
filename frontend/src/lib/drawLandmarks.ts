import { HandLandmarker } from '@mediapipe/tasks-vision'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'

export function drawHandLandmarks(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  result: HandLandmarkerResult,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }

  const width = canvas.width
  const height = canvas.height
  ctx.clearRect(0, 0, width, height)

  const lineWidth = Math.max(2, width / 400)
  const pointRadius = Math.max(3, width / 350)

  for (const landmarks of result.landmarks) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)'
    ctx.lineWidth = lineWidth
    for (const connection of HandLandmarker.HAND_CONNECTIONS) {
      const start = landmarks[connection.start]
      const end = landmarks[connection.end]
      if (!start || !end) continue
      ctx.beginPath()
      ctx.moveTo(start.x * width, start.y * height)
      ctx.lineTo(end.x * width, end.y * height)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(244, 114, 182, 0.95)'
    for (const point of landmarks) {
      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, pointRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

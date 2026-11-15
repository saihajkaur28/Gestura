import { HandLandmarker } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { TrackedHand } from './handTracking'

const PALM_INDICES = [0, 5, 9, 13, 17]
const PALM_NODE_INDICES = new Set(PALM_INDICES)
const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20])

interface Point {
  x: number
  y: number
}

function projectLandmarks(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
): Point[] {
  return landmarks.map((landmark) => ({
    x: landmark.x * width,
    y: landmark.y * height,
  }))
}

function strokeConnections(ctx: CanvasRenderingContext2D, points: Point[]): void {
  for (const connection of HandLandmarker.HAND_CONNECTIONS) {
    const start = points[connection.start]
    const end = points[connection.end]
    if (!start || !end) continue

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }
}

interface HandTint {
  aura: string
  auraMid: string
  node: string
  palm: string
  glow: string
}

const HAND_TINTS: HandTint[] = [
  {
    aura: '137, 182, 165',
    auraMid: '168, 197, 186',
    node: '205, 232, 216',
    palm: '168, 197, 186',
    glow: '137, 182, 165',
  },
  {
    aura: '168, 197, 186',
    auraMid: '200, 224, 214',
    node: '226, 242, 235',
    palm: '190, 216, 205',
    glow: '150, 184, 168',
  },
]

function drawHand(
  ctx: CanvasRenderingContext2D,
  hand: TrackedHand,
  width: number,
  height: number,
  unit: number,
  variant: number,
): void {
  const alpha = Math.min(1, Math.max(0, hand.presence))
  if (alpha <= 0.02) return

  const tint = HAND_TINTS[variant % HAND_TINTS.length] ?? HAND_TINTS[0]!

  const points = projectLandmarks(hand.landmarks, width, height)
  if (points.length === 0) return

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const auraRadius = Math.max(maxX - minX, maxY - minY) * 0.85 + 14 * unit

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const aura = ctx.createRadialGradient(
    centerX,
    centerY,
    auraRadius * 0.08,
    centerX,
    centerY,
    auraRadius,
  )
  aura.addColorStop(0, `rgba(${tint.aura}, ${0.16 * alpha})`)
  aura.addColorStop(0.5, `rgba(${tint.auraMid}, ${0.07 * alpha})`)
  aura.addColorStop(1, `rgba(${tint.auraMid}, 0)`)
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const palmPoints = PALM_INDICES.map((index) => points[index]).filter(
    (point): point is Point => Boolean(point),
  )

  if (palmPoints.length === PALM_INDICES.length) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(palmPoints[0].x, palmPoints[0].y)
    for (let index = 1; index < palmPoints.length; index += 1) {
      ctx.lineTo(palmPoints[index].x, palmPoints[index].y)
    }
    ctx.closePath()
    const palmGradient = ctx.createLinearGradient(minX, minY, maxX, maxY)
    palmGradient.addColorStop(0, `rgba(${tint.auraMid}, ${0.12 * alpha})`)
    palmGradient.addColorStop(1, `rgba(137, 182, 165, ${0.05 * alpha})`)
    ctx.fillStyle = palmGradient
    ctx.fill()
    ctx.restore()
  }

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = `rgba(${tint.glow}, ${0.18 * alpha})`
  ctx.lineWidth = 9 * unit
  strokeConnections(ctx, points)
  ctx.strokeStyle = `rgba(${tint.glow}, ${0.34 * alpha})`
  ctx.lineWidth = 4.5 * unit
  strokeConnections(ctx, points)
  ctx.restore()

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const lineGradient = ctx.createLinearGradient(minX, minY, maxX, maxY)
  lineGradient.addColorStop(0, `rgba(224, 245, 233, ${0.95 * alpha})`)
  lineGradient.addColorStop(0.55, `rgba(176, 214, 196, ${0.9 * alpha})`)
  lineGradient.addColorStop(1, `rgba(140, 183, 160, ${0.85 * alpha})`)
  ctx.strokeStyle = lineGradient
  ctx.lineWidth = 2.2 * unit
  strokeConnections(ctx, points)
  ctx.restore()

  const centre = palmPoints.length
    ? {
        x: palmPoints.reduce((sum, point) => sum + point.x, 0) / palmPoints.length,
        y: palmPoints.reduce((sum, point) => sum + point.y, 0) / palmPoints.length,
      }
    : { x: centerX, y: centerY }

  points.forEach((point, index) => {
    const isFingertip = FINGERTIP_INDICES.has(index)
    const isPalm = PALM_NODE_INDICES.has(index)
    const depth = hand.landmarks[index]?.z ?? 0
    // Negative MediaPipe z is closer to the camera. Keep the effect subtle.
    const depthScale = Math.min(1.14, Math.max(0.88, 1 - depth * 1.6))
    const radius =
      (isFingertip ? 5.2 : isPalm ? 4 : 2.7) * unit * depthScale

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.shadowColor = `rgba(${tint.glow}, ${0.85 * alpha})`
    ctx.shadowBlur = (isFingertip ? 16 : isPalm ? 10 : 6) * unit * alpha
    ctx.fillStyle = isFingertip
      ? `rgba(232, 246, 238, ${0.95 * alpha})`
      : isPalm
        ? `rgba(${tint.palm}, ${0.92 * alpha})`
        : `rgba(${tint.node}, ${0.85 * alpha})`
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    if (isFingertip) {
      ctx.save()
      ctx.strokeStyle = `rgba(232, 246, 238, ${0.45 * alpha})`
      ctx.lineWidth = 1.2 * unit
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius + 3.4 * unit, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  })

  if (palmPoints.length === PALM_INDICES.length) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = `rgba(${tint.node}, ${0.55 * alpha})`
    ctx.lineWidth = 1.1 * unit
    const marker = 4.6 * unit
    ctx.beginPath()
    ctx.arc(centre.x, centre.y, marker, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(centre.x - marker * 0.55, centre.y)
    ctx.lineTo(centre.x + marker * 0.55, centre.y)
    ctx.moveTo(centre.x, centre.y - marker * 0.55)
    ctx.lineTo(centre.x, centre.y + marker * 0.55)
    ctx.stroke()
    ctx.restore()
  }
}

export function drawHandLandmarks(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: TrackedHand[],
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }

  const width = canvas.width
  const height = canvas.height
  if (width === 0 || height === 0) return

  ctx.clearRect(0, 0, width, height)
  if (hands.length === 0) return

  const unit = Math.max(0.65, width / 1280)

  hands.forEach((hand, index) => {
    drawHand(ctx, hand, width, height, unit, index)
  })
}

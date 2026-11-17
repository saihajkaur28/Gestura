import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  getAslAnimation,
  type ArmPose,
} from '../lib/aslAnimations'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface AslAvatarCanvasProps {
  activeSign: string | null
  videoRef?: React.RefObject<HTMLVideoElement | null>
  playing: boolean
  playbackSpeed: number
  characterId: string
  compact?: boolean
  onAnimationEnded?: () => void
  onSyncStateChange?: (state: 'synced' | 'synchronizing' | 'unavailable') => void
}

// Character visual themes
interface CharacterTheme {
  name: string
  skinColor: number
  hairColor: number
  clothingColor: number
  accentColor: number
  hairStyle: 'long' | 'short' | 'undercut'
  hasWristbands?: boolean
  isGlbModel?: boolean
  modelUrl?: string
}

const CHARACTER_THEMES: Record<string, CharacterTheme> = {
  maya: {
    name: 'Maya',
    skinColor: 0xf5c396,
    hairColor: 0x2e1d16,
    clothingColor: 0x6fae96, // Sage green tailored top
    accentColor: 0xc9eddc,
    hairStyle: 'long',
  },
  alex: {
    name: 'Alex',
    skinColor: 0xdfb496,
    hairColor: 0x3d322b,
    clothingColor: 0x487f73, // Clinical scrub top
    accentColor: 0xffffff,
    hairStyle: 'short',
    hasWristbands: true, // High-contrast clinical wristbands
  },
  jordan: {
    name: 'Jordan',
    skinColor: 0xbf8b6a,
    hairColor: 0x181a19,
    clothingColor: 0x1f2924, // Dark graphite tactical suit
    accentColor: 0x89b6a5, // Luminous sage joints
    hairStyle: 'undercut',
    hasWristbands: true,
  },
  signkit: {
    name: 'Sign-Kit (X-Bot)',
    skinColor: 0x4f7a8a,
    hairColor: 0x1f2924,
    clothingColor: 0x243b35,
    accentColor: 0x89b6a5,
    hairStyle: 'short',
    isGlbModel: true,
    modelUrl: '/models/avatars/xbot.glb',
  },
}

// Helper to linearly interpolate a single number
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Helper to interpolate 3D vectors/rotations
function lerpTuple3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

// Helper to interpolate 2D vectors
function lerpTuple2(a: [number, number], b: [number, number], t: number): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

export default function AslAvatarCanvas({
  activeSign,
  videoRef,
  playing,
  playbackSpeed = 1,
  characterId = 'maya',
  compact = false,
  onAnimationEnded,
  onSyncStateChange,
}: AslAvatarCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [hasValidAnimation, setHasValidAnimation] = useState(false)
  const [animationDescription, setAnimationDescription] = useState<string | null>(null)

  // Internal animation clock for avatar-only mode
  const animTimeRef = useRef(0)
  const lastTimestampRef = useRef<number | null>(null)

  // Node references for skeletal manipulation
  const skeletonRef = useRef<{
    headNode: THREE.Object3D
    rightShoulder: THREE.Object3D
    rightElbow: THREE.Object3D
    rightWrist: THREE.Object3D
    rightFingers: {
      thumb: [THREE.Object3D, THREE.Object3D]
      index: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
      middle: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
      ring: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
      pinky: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
    }
    leftShoulder: THREE.Object3D
    leftElbow: THREE.Object3D
    leftWrist: THREE.Object3D
    leftFingers: {
      thumb: [THREE.Object3D, THREE.Object3D]
      index: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
      middle: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
      ring: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
      pinky: [THREE.Object3D, THREE.Object3D, THREE.Object3D]
    }
  } | null>(null)

  const activeSignAnim = activeSign ? getAslAnimation(activeSign) : null

  useEffect(() => {
    if (activeSignAnim) {
      setHasValidAnimation(true)
      setAnimationDescription(activeSignAnim.description)
      if (onSyncStateChange) onSyncStateChange('synced')
    } else if (activeSign) {
      setHasValidAnimation(false)
      setAnimationDescription(null)
      if (onSyncStateChange) onSyncStateChange('unavailable')
    } else {
      setHasValidAnimation(false)
      setAnimationDescription(null)
      if (onSyncStateChange) onSyncStateChange('unavailable')
    }
  }, [activeSign, activeSignAnim, onSyncStateChange])

  // Reset clock when active sign changes
  useEffect(() => {
    animTimeRef.current = 0
    lastTimestampRef.current = null
  }, [activeSign])

  // Build the complete 3D Humanoid Mesh in Three.js
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 400
    const height = container.clientHeight || 450

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x131d1a) // Soft obsidian background

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
    camera.position.set(0, 1.45, 2.5)
    camera.lookAt(0, 1.25, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 2. Studio Lighting for accurate depth and hand articulation
    const ambientLight = new THREE.AmbientLight(0xfffdfa, 1.2)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xfffbf0, 1.8)
    keyLight.position.set(1.5, 3.0, 2.0)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xcce8df, 0.9)
    fillLight.position.set(-2.0, 1.8, 1.5)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xa0e8af, 1.1)
    rimLight.position.set(0, 2.5, -2.0)
    scene.add(rimLight)

    // 3. Materials customized for Character Theme
    const theme = CHARACTER_THEMES[characterId] || CHARACTER_THEMES.maya

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: theme.skinColor,
      roughness: 0.65,
      metalness: 0.05,
    })

    const clothMaterial = new THREE.MeshStandardMaterial({
      color: theme.clothingColor,
      roughness: 0.75,
      metalness: 0.1,
    })

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: theme.hairColor,
      roughness: 0.85,
    })

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: theme.accentColor,
      roughness: 0.3,
      metalness: 0.4,
    })

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x1a211e })

    // 4. Construct Humanoid Avatar Rig or Load Sign-Kit GLTF Avatar
    if (theme.isGlbModel) {
      const loader = new GLTFLoader()
      loader.load(
        theme.modelUrl || '/models/avatars/xbot.glb',
        (gltf) => {
          gltf.scene.traverse((child: any) => {
            if (child.isMesh || child.type === 'SkinnedMesh') {
              child.frustumCulled = false
              child.castShadow = true
              child.receiveShadow = true
            }
          })

          gltf.scene.position.set(0, 0, 0)
          scene.add(gltf.scene)

          function findBone(...names: string[]): THREE.Object3D {
            for (const name of names) {
              const obj = gltf.scene.getObjectByName(name)
              if (obj) return obj
            }
            return new THREE.Group()
          }

          skeletonRef.current = {
            headNode: findBone('mixamorig:Head', 'mixamorigHead'),
            rightShoulder: findBone('mixamorig:RightArm', 'mixamorigRightArm'),
            rightElbow: findBone('mixamorig:RightForeArm', 'mixamorigRightForeArm'),
            rightWrist: findBone('mixamorig:RightHand', 'mixamorigRightHand'),
            rightFingers: {
              thumb: [
                findBone('mixamorig:RightHandThumb1', 'mixamorigRightHandThumb1'),
                findBone('mixamorig:RightHandThumb2', 'mixamorigRightHandThumb2'),
              ],
              index: [
                findBone('mixamorig:RightHandIndex1', 'mixamorigRightHandIndex1'),
                findBone('mixamorig:RightHandIndex2', 'mixamorigRightHandIndex2'),
                findBone('mixamorig:RightHandIndex3', 'mixamorigRightHandIndex3'),
              ],
              middle: [
                findBone('mixamorig:RightHandMiddle1', 'mixamorigRightHandMiddle1'),
                findBone('mixamorig:RightHandMiddle2', 'mixamorigRightHandMiddle2'),
                findBone('mixamorig:RightHandMiddle3', 'mixamorigRightHandMiddle3'),
              ],
              ring: [
                findBone('mixamorig:RightHandRing1', 'mixamorigRightHandRing1'),
                findBone('mixamorig:RightHandRing2', 'mixamorigRightHandRing2'),
                findBone('mixamorig:RightHandRing3', 'mixamorigRightHandRing3'),
              ],
              pinky: [
                findBone('mixamorig:RightHandPinky1', 'mixamorigRightHandPinky1'),
                findBone('mixamorig:RightHandPinky2', 'mixamorigRightHandPinky2'),
                findBone('mixamorig:RightHandPinky3', 'mixamorigRightHandPinky3'),
              ],
            },
            leftShoulder: findBone('mixamorig:LeftArm', 'mixamorigLeftArm'),
            leftElbow: findBone('mixamorig:LeftForeArm', 'mixamorigLeftForeArm'),
            leftWrist: findBone('mixamorig:LeftHand', 'mixamorigLeftHand'),
            leftFingers: {
              thumb: [
                findBone('mixamorig:LeftHandThumb1', 'mixamorigLeftHandThumb1'),
                findBone('mixamorig:LeftHandThumb2', 'mixamorigLeftHandThumb2'),
              ],
              index: [
                findBone('mixamorig:LeftHandIndex1', 'mixamorigLeftHandIndex1'),
                findBone('mixamorig:LeftHandIndex2', 'mixamorigLeftHandIndex2'),
                findBone('mixamorig:LeftHandIndex3', 'mixamorigLeftHandIndex3'),
              ],
              middle: [
                findBone('mixamorig:LeftHandMiddle1', 'mixamorigLeftHandMiddle1'),
                findBone('mixamorig:LeftHandMiddle2', 'mixamorigLeftHandMiddle2'),
                findBone('mixamorig:LeftHandMiddle3', 'mixamorigLeftHandMiddle3'),
              ],
              ring: [
                findBone('mixamorig:LeftHandRing1', 'mixamorigLeftHandRing1'),
                findBone('mixamorig:LeftHandRing2', 'mixamorigLeftHandRing2'),
                findBone('mixamorig:LeftHandRing3', 'mixamorigLeftHandRing3'),
              ],
              pinky: [
                findBone('mixamorig:LeftHandPinky1', 'mixamorigLeftHandPinky1'),
                findBone('mixamorig:LeftHandPinky2', 'mixamorigLeftHandPinky2'),
                findBone('mixamorig:LeftHandPinky3', 'mixamorigLeftHandPinky3'),
              ],
            },
          }
        },
        undefined,
        (err) => {
          console.warn('Sign-Kit GLTF load error, fallback to procedural rig:', err)
        }
      )
    } else {
      const avatarGroup = new THREE.Group()
      scene.add(avatarGroup)

    // Torso / Chest
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.19, 0.6, 16)
    const torso = new THREE.Mesh(torsoGeo, clothMaterial)
    torso.position.set(0, 0.95, 0)
    avatarGroup.add(torso)

    // Collar / Shoulders
    const shoulderBarGeo = new THREE.BoxGeometry(0.68, 0.12, 0.22)
    const shoulderBar = new THREE.Mesh(shoulderBarGeo, clothMaterial)
    shoulderBar.position.set(0, 1.25, 0)
    avatarGroup.add(shoulderBar)

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.18, 16)
    const neck = new THREE.Mesh(neckGeo, skinMaterial)
    neck.position.set(0, 1.34, 0)
    avatarGroup.add(neck)

    // Head Pivot
    const headNode = new THREE.Group()
    headNode.position.set(0, 1.52, 0)
    avatarGroup.add(headNode)

    // Head Mesh
    const headGeo = new THREE.SphereGeometry(0.165, 24, 24)
    headGeo.scale(1.0, 1.15, 1.05)
    const headMesh = new THREE.Mesh(headGeo, skinMaterial)
    headNode.add(headMesh)

    // Eyes
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), eyeMaterial)
    leftEye.position.set(-0.062, 0.04, 0.148)
    headNode.add(leftEye)

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), eyeMaterial)
    rightEye.position.set(0.062, 0.04, 0.148)
    headNode.add(rightEye)

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.18, 20, 20)
    hairGeo.scale(1.02, 1.05, 1.05)
    const hairMesh = new THREE.Mesh(hairGeo, hairMaterial)
    hairMesh.position.set(0, 0.06, -0.02)
    headNode.add(hairMesh)

    // Helper: Build an articulated 5-finger hand
    function buildArticulatedHand(isRight: boolean) {
      const wristNode = new THREE.Group()

      // Palm
      const palmGeo = new THREE.BoxGeometry(0.075, 0.085, 0.025)
      const palm = new THREE.Mesh(palmGeo, skinMaterial)
      palm.position.set(0, -0.045, 0)
      wristNode.add(palm)

      // Wristband if enabled
      if (theme.hasWristbands) {
        const bandGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.035, 16)
        const band = new THREE.Mesh(bandGeo, accentMaterial)
        band.rotation.x = Math.PI / 2
        wristNode.add(band)
      }

      // Helper to build a finger with 3 joints
      function buildFinger(xOffset: number, length: number, isThumb = false) {
        const mcp = new THREE.Group()
        mcp.position.set(xOffset, isThumb ? -0.025 : -0.088, isThumb ? 0.015 : 0)

        // Joint 1
        const j1Len = length * 0.42
        const j1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, j1Len, 8), skinMaterial)
        j1Mesh.position.set(0, -j1Len / 2, 0)
        mcp.add(j1Mesh)

        // Joint 2 (PIP)
        const pip = new THREE.Group()
        pip.position.set(0, -j1Len, 0)
        mcp.add(pip)

        const j2Len = length * 0.35
        const j2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, j2Len, 8), skinMaterial)
        j2Mesh.position.set(0, -j2Len / 2, 0)
        pip.add(j2Mesh)

        // Joint 3 (DIP / Tip)
        const dip = new THREE.Group()
        dip.position.set(0, -j2Len, 0)
        pip.add(dip)

        const j3Len = length * 0.23
        const j3Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, j3Len, 8), skinMaterial)
        j3Mesh.position.set(0, -j3Len / 2, 0)
        dip.add(j3Mesh)

        wristNode.add(mcp)
        return [mcp, pip, dip] as [THREE.Group, THREE.Group, THREE.Group]
      }

      // 5 individually articulated fingers
      const side = isRight ? 1 : -1
      const thumb = buildFinger(side * 0.045, 0.065, true)
      const index = buildFinger(side * 0.026, 0.082)
      const middle = buildFinger(side * 0.008, 0.09)
      const ring = buildFinger(side * -0.011, 0.082)
      const pinky = buildFinger(side * -0.028, 0.068)

      return {
        wristNode,
        fingers: {
          thumb: [thumb[0], thumb[1]] as [THREE.Group, THREE.Group],
          index,
          middle,
          ring,
          pinky,
        },
      }
    }

    // Helper: Build arm hierarchy (Shoulder -> Elbow -> Wrist)
    function buildArm(isRight: boolean) {
      const shoulderX = isRight ? 0.32 : -0.32
      const shoulder = new THREE.Group()
      shoulder.position.set(shoulderX, 1.25, 0)
      avatarGroup.add(shoulder)

      // Upper Arm
      const upperArmLen = 0.28
      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.038, upperArmLen, 12),
        clothMaterial
      )
      upperArm.position.set(0, -upperArmLen / 2, 0)
      shoulder.add(upperArm)

      // Elbow
      const elbow = new THREE.Group()
      elbow.position.set(0, -upperArmLen, 0)
      shoulder.add(elbow)

      // Forearm
      const forearmLen = 0.26
      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.034, forearmLen, 12),
        skinMaterial
      )
      forearm.position.set(0, -forearmLen / 2, 0)
      elbow.add(forearm)

      // Wrist & Hand
      const { wristNode, fingers } = buildArticulatedHand(isRight)
      wristNode.position.set(0, -forearmLen, 0)
      elbow.add(wristNode)

      return { shoulder, elbow, wrist: wristNode, fingers }
    }

    const rightArmRig = buildArm(true)
    const leftArmRig = buildArm(false)

    skeletonRef.current = {
      headNode,
      rightShoulder: rightArmRig.shoulder,
      rightElbow: rightArmRig.elbow,
      rightWrist: rightArmRig.wrist,
      rightFingers: rightArmRig.fingers,
      leftShoulder: leftArmRig.shoulder,
      leftElbow: leftArmRig.elbow,
      leftWrist: leftArmRig.wrist,
      leftFingers: leftArmRig.fingers,
    }
  }

    // Handle Resize
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Animation Loop
    let animId: number

    const render = () => {
      renderer.render(scene, camera)
      animId = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      scene.clear()
    }
  }, [characterId])

  // Pose Application & Synchronization Loop
  useEffect(() => {
    let animId: number

    const updatePose = (timestamp: number) => {
      const skeleton = skeletonRef.current
      if (!skeleton) {
        animId = requestAnimationFrame(updatePose)
        return
      }

      let progress = 0.0

      // Case 1: Video Synchronized Mode (Shared Video Timeline)
      if (videoRef && videoRef.current && videoRef.current.duration > 0) {
        const video = videoRef.current
        progress = Math.min(Math.max(video.currentTime / video.duration, 0.0), 1.0)
      }
      // Case 2: Avatar Animation Clock (Avatar-only mode or fallback)
      else if (playing && activeSignAnim) {
        if (lastTimestampRef.current !== null) {
          const delta = (timestamp - lastTimestampRef.current) / 1000.0
          animTimeRef.current += delta * playbackSpeed
          const duration = activeSignAnim.durationSec || 2.0
          if (animTimeRef.current >= duration) {
            animTimeRef.current = 0.0
            if (onAnimationEnded) onAnimationEnded()
          }
          progress = animTimeRef.current / duration
        }
        lastTimestampRef.current = timestamp
      } else {
        lastTimestampRef.current = timestamp
        progress = 0.0
      }

      // Interpolate Keyframes for active sign
      if (activeSignAnim && activeSignAnim.keyframes.length >= 2) {
        const keyframes = activeSignAnim.keyframes
        let k1 = keyframes[0]
        let k2 = keyframes[keyframes.length - 1]

        for (let i = 0; i < keyframes.length - 1; i++) {
          if (progress >= keyframes[i].t && progress <= keyframes[i + 1].t) {
            k1 = keyframes[i]
            k2 = keyframes[i + 1]
            break
          }
        }

        const span = Math.max(k2.t - k1.t, 0.001)
        const localT = Math.min(Math.max((progress - k1.t) / span, 0), 1)
        // Smooth Hermite easing for natural human motion
        const smoothT = localT * localT * (3 - 2 * localT)

        // Interpolate Right Arm & 5 Fingers
        applyArmPose(
          skeleton.rightShoulder,
          skeleton.rightElbow,
          skeleton.rightWrist,
          skeleton.rightFingers,
          k1.rightArm,
          k2.rightArm,
          smoothT,
          true
        )

        // Interpolate Left Arm & 5 Fingers
        applyArmPose(
          skeleton.leftShoulder,
          skeleton.leftElbow,
          skeleton.leftWrist,
          skeleton.leftFingers,
          k1.leftArm,
          k2.leftArm,
          smoothT,
          false
        )

        // Interpolate Head Rotation
        if (k1.head && k2.head) {
          const headRot = lerpTuple3(k1.head, k2.head, smoothT)
          skeleton.headNode.rotation.set(headRot[0], headRot[1], headRot[2])
        }
      } else {
        // Return arms gently to neutral resting pose
        resetToNeutral(skeleton)
      }

      animId = requestAnimationFrame(updatePose)
    }

    animId = requestAnimationFrame(updatePose)
    return () => cancelAnimationFrame(animId)
  }, [playing, activeSignAnim, playbackSpeed, videoRef, onAnimationEnded])

  // Helper: Apply interpolated arm and 5-finger poses to Three.js rig
  function applyArmPose(
    shoulderNode: THREE.Object3D,
    elbowNode: THREE.Object3D,
    wristNode: THREE.Object3D,
    fingers: any,
    pose1: ArmPose,
    pose2: ArmPose,
    t: number,
    isRight: boolean
  ) {
    const sRot = lerpTuple3(pose1.shoulder, pose2.shoulder, t)
    const eRot = lerpTuple2(pose1.elbow, pose2.elbow, t)
    const wRot = lerpTuple3(pose1.wrist, pose2.wrist, t)

    const side = isRight ? 1 : -1

    shoulderNode.rotation.set(sRot[0], side * sRot[1], side * sRot[2])
    elbowNode.rotation.set(eRot[0], 0, side * eRot[1])
    wristNode.rotation.set(wRot[0], side * wRot[1], side * wRot[2])

    // Apply 5-finger articulation
    const h1 = pose1.hand
    const h2 = pose2.hand

    // Thumb (2 joints)
    if (fingers.thumb[0] && fingers.thumb[1]) {
      const tmcp = lerp(h1.thumb.mcp, h2.thumb.mcp, t)
      const tpip = lerp(h1.thumb.pip, h2.thumb.pip, t)
      const tspread = lerp(h1.thumb.spread || 0, h2.thumb.spread || 0, t)
      fingers.thumb[0].rotation.set(tmcp, side * tspread, side * 0.2)
      fingers.thumb[1].rotation.set(tpip, 0, 0)
    }

    // 4 Fingers: Index, Middle, Ring, Pinky (3 joints each)
    const fingerKeys = ['index', 'middle', 'ring', 'pinky'] as const
    fingerKeys.forEach((key) => {
      const chain = fingers[key]
      if (chain && chain[0] && chain[1] && chain[2]) {
        const f1 = h1[key]
        const f2 = h2[key]
        const mcp = lerp(f1.mcp, f2.mcp, t)
        const pip = lerp(f1.pip, f2.pip, t)
        const dip = lerp(f1.dip, f2.dip, t)
        const spread = lerp(f1.spread || 0, f2.spread || 0, t)

        chain[0].rotation.set(mcp, side * spread, 0)
        chain[1].rotation.set(pip, 0, 0)
        chain[2].rotation.set(dip, 0, 0)
      }
    })
  }

  // Helper: Return avatar to resting pose
  function resetToNeutral(skeleton: any) {
    skeleton.rightShoulder.rotation.set(0.1, -0.1, -0.15)
    skeleton.rightElbow.rotation.set(0.3, 0, 0)
    skeleton.rightWrist.rotation.set(0, 0, 0)

    skeleton.leftShoulder.rotation.set(0.1, 0.1, 0.15)
    skeleton.leftElbow.rotation.set(0.3, 0, 0)
    skeleton.leftWrist.rotation.set(0, 0, 0)

    skeleton.headNode.rotation.set(0, 0, 0)
  }

  return (
    <div className={`asl-3d-avatar-viewport ${compact ? 'compact' : ''}`}>
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="asl-three-canvas-container" />

      {/* Live Sync Status Overlay */}
      <div className="avatar-sync-overlay">
        <div className="sync-badge-group">
          <span className="character-tag-pill">
            <span className="dot live" />
            <strong>{CHARACTER_THEMES[characterId]?.name || 'Maya'}</strong>
          </span>

          {hasValidAnimation ? (
            <span className="sync-status-pill verified">
              <CheckCircle2 size={12} strokeWidth={2.5} />
              Yale ASL Sync Active
            </span>
          ) : (
            <span className="sync-status-pill pending">
              <AlertCircle size={12} strokeWidth={2} />
              Syncing to Video Reference
            </span>
          )}
        </div>

        {animationDescription && (
          <p className="avatar-motion-desc">
            <strong>Motion Target:</strong> {animationDescription}
          </p>
        )}
      </div>
    </div>
  )
}

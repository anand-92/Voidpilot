import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, MeshReflectorMaterial, Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// Suppress THREE.Clock deprecation warning (cosmetic only)
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (args[0]?.toString?.().includes('THREE.Clock')) return
  originalWarn.apply(console, args)
}

interface SceneProps {
  intensity: number
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

const _targetScale = new THREE.Vector3()
const _glowColor = new THREE.Color()

function EntityOrb({ intensity }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    // Slow, ominous rotation
    meshRef.current.rotation.x = time * 0.1
    meshRef.current.rotation.y = time * 0.15

    // Scale based on audio intensity - more dramatic
    const targetScale = 1.8 + intensity * 3
    _targetScale.set(targetScale, targetScale, targetScale)
    meshRef.current.scale.lerp(_targetScale, 0.08)

    // Color shift based on intensity - from deep blue to bright cyan/white
    _glowColor.setHSL(0.58 - intensity * 0.1, 0.9, 0.3 + intensity * 0.5)
    if (materialRef.current) {
      materialRef.current.emissive = _glowColor
      materialRef.current.emissiveIntensity = 0.5 + intensity * 2
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere ref={meshRef} args={[1, 128, 128]} position={[0, 2, 0]}>
        <MeshDistortMaterial
          ref={materialRef}
          color="#0c4a6e"
          speed={2}
          distort={0.3 + intensity * 0.3}
          radius={1}
          metalness={0.9}
          roughness={0.1}
          emissive="#0ea5e9"
          emissiveIntensity={0.5}
        />
      </Sphere>
    </Float>
  )
}

function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[50, 50]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={60}
        roughness={0.5}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#020617"
        metalness={0.8}
        mirror={0.8}
      />
    </mesh>
  )
}

function Lighting({ intensity }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight
        position={[0, 3, 2]}
        intensity={2 + intensity * 5}
        color="#38bdf8"
        distance={20}
        decay={2}
      />
      <pointLight
        position={[-3, 1, -2]}
        intensity={0.5 + intensity * 2}
        color="#818cf8"
        distance={15}
        decay={2}
      />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={1}
        intensity={0.3}
        color="#ffffff"
        castShadow
      />
    </>
  )
}

function CameraRig({ intensity }: SceneProps) {
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    // Subtle camera sway - like you're in awe
    state.camera.position.x = Math.sin(time * 0.1) * 0.3
    state.camera.position.y = 2 + Math.cos(time * 0.15) * 0.1
    state.camera.lookAt(0, 1.5, 0)
  })
  return null
}

function FallbackVisualizer({ intensity }: SceneProps) {
  return (
    <div className="flex items-center justify-center w-full h-full bg-[#020617]">
      <div
        className="rounded-full blur-3xl transition-all duration-500"
        style={{
          width: `${200 + intensity * 400}px`,
          height: `${200 + intensity * 400}px`,
          background: `radial-gradient(circle, rgba(56, 189, 248, ${0.1 + intensity * 0.4}) 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}

export default function Visualizer({ intensity }: SceneProps) {
  const [hasWebGL] = useState(isWebGLAvailable)

  if (!hasWebGL) {
    return (
      <div className="fixed inset-0 z-0">
        <FallbackVisualizer intensity={intensity} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 60 }}
        gl={{ antialias: true, failIfMajorPerformanceCaveat: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 5, 25]} />

        <Lighting intensity={intensity} />
        <EntityOrb intensity={intensity} />
        <ReflectiveFloor />
        <CameraRig intensity={intensity} />

        <Environment preset="night" />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5 + intensity * 2}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

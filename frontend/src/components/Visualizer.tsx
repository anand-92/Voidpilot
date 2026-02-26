import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Points, PointMaterial } from '@react-three/drei'
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

function generateParticlePositions(count: number, spread: number): Float32Array {
  const p = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    p[i * 3] = (Math.random() - 0.5) * spread
    p[i * 3 + 1] = (Math.random() - 0.5) * spread
    p[i * 3 + 2] = (Math.random() - 0.5) * spread
  }
  return p
}

const PARTICLE_POSITIONS = generateParticlePositions(2000, 15)

const _targetScale = new THREE.Vector3()

function OrganicOrb({ intensity }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    meshRef.current.rotation.x = time * 0.2
    meshRef.current.rotation.y = time * 0.3

    const scale = 1.5 + intensity * 2
    _targetScale.set(scale, scale, scale)
    meshRef.current.scale.lerp(_targetScale, 0.1)
  })

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#38bdf8"
          speed={3}
          distort={0.4 + intensity}
          radius={1}
          metalness={0.2}
          roughness={0.1}
          transmission={0.8}
          thickness={2}
        />
      </Sphere>
    </Float>
  )
}

function BackgroundParticles() {

  const ref = useRef<THREE.Points>(null!)
  useFrame((state) => {
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.05
  })

  return (
    <Points ref={ref} positions={PARTICLE_POSITIONS} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#818cf8"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  )
}

function FallbackVisualizer({ intensity }: SceneProps) {
  return (
    <div className="flex items-center justify-center w-full h-full bg-[#020617]">
      <div 
        className="rounded-full bg-sky-500/20 blur-3xl transition-all duration-300"
        style={{ 
          width: `${200 + intensity * 400}px`, 
          height: `${200 + intensity * 400}px`,
          opacity: 0.1 + intensity * 0.5
        }}
      />
      <div 
        className="absolute rounded-full border border-sky-500/30 transition-all duration-300"
        style={{ 
          width: `${150 + intensity * 200}px`, 
          height: `${150 + intensity * 200}px`,
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
      <Canvas camera={{ position: [0, 0, 6], fov: 75 }} gl={{ antialias: true, failIfMajorPerformanceCaveat: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#818cf8" />
        <OrganicOrb intensity={intensity} />
        <BackgroundParticles />
      </Canvas>
    </div>
  )
}

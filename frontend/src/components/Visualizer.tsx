import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface SceneProps {
  intensity: number
}

function OrganicOrb({ intensity }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    meshRef.current.rotation.x = time * 0.2
    meshRef.current.rotation.y = time * 0.3
    
    // Pulse based on intensity
    const scale = 1.5 + (intensity * 2)
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
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
  const points = useMemo(() => {
    const p = new Float32Array(2000 * 3)
    for (let i = 0; i < 2000; i++) {
      p[i * 3] = (Math.random() - 0.5) * 15
      p[i * 3 + 1] = (Math.random() - 0.5) * 15
      p[i * 3 + 2] = (Math.random() - 0.5) * 15
    }
    return p
  }, [])

  const ref = useRef<THREE.Points>(null!)
  useFrame((state) => {
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.05
  })

  return (
    <Points ref={ref} positions={points} stride={3} frustumCulled={false}>
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

export default function Visualizer({ intensity }: SceneProps) {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 6], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#818cf8" />
        <OrganicOrb intensity={intensity} />
        <BackgroundParticles />
      </Canvas>
    </div>
  )
}

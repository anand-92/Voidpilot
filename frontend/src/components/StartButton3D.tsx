import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

interface StartButton3DProps {
    onClick: () => void;
}

export function StartButton3D({ onClick }: StartButton3DProps) {
    const groupRef = useRef<THREE.Group>(null!)
    const [hovered, setHovered] = useState(false)
    const [active, setActive] = useState(false)

    useFrame((state) => {
        if (groupRef.current) {
            // Float animation
            groupRef.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 2) * 0.1

            // Hover scale animation
            const targetScale = active ? 0.9 : (hovered ? 1.05 : 1)
            groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
        }
    })

    return (
        <group
            ref={groupRef}
            // Move significantly closer to the camera (Camera is at Z=8)
            // Positioned downwards so it doesn't block the center
            position={[0, -0.8, 5]}
            onPointerOver={() => {
                setHovered(true)
                document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
                setHovered(false)
                setActive(false)
                document.body.style.cursor = 'default'
            }}
            onPointerDown={() => setActive(true)}
            onPointerUp={() => {
                setActive(false)
                onClick()
            }}
        >
            <pointLight position={[0, 0, 2]} intensity={1.5} color="#bae6fd" distance={20} />

            {/* Changed from a capsule to a sleek RoundedBox */}
            <RoundedBox
                args={[1.8, 0.7, 0.2]} // width, height, depth
                radius={0.15}
                smoothness={4}
                creaseAngle={0.4}
            >
                <meshStandardMaterial
                    color={hovered ? "#38bdf8" : "#0ea5e9"}
                    emissive={hovered ? "#0284c7" : "#0c4a6e"}
                    emissiveIntensity={hovered ? 0.6 : 0.3}
                    roughness={0.5}
                    metalness={0.3}
                />
            </RoundedBox>

            {/* 3D text (adjusted positions and slightly larger to fit the new box shape) */}
            <Text
                position={[0, 0.1, 0.11]}
                fontSize={0.22}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
                START
            </Text>
            <Text
                position={[0, -0.15, 0.11]}
                fontSize={0.10}
                color="#bae6fd"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
                CONVERSATION
            </Text>
        </group>
    )
}

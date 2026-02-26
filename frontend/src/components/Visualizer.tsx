import { useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere, MeshReflectorMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// Suppress cosmetic-only THREE warnings
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const msg = args[0]?.toString?.() ?? ''
  if (msg.includes('THREE.Clock') || msg.includes('THREE.Texture')) return
  originalWarn.apply(console, args)
}

interface SceneProps {
  intensityRef: MutableRefObject<number>
}


function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

// SIMPLEX NOISE 3D (classic implementation for WebGL)
// Sourced from: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
const snoise3D = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0.0 + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}
`

const orbVertexShader = `
uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

${snoise3D}

void main() {
  vUv = uv;
  vNormal = normal;
  
  // Base slow breathing + fast writhing driven purely by time now, no audio
  float slowTime = uTime * 0.4; 
  float fastTime = uTime * 1.5;
  
  // Calculate noise value for displacement
  // Move through noise field on multiple axes for more complex transformations at rest
  vec3 noiseOffset1 = vec3(sin(slowTime * 0.5), slowTime, cos(slowTime * 0.3));
  float n1 = snoise(position * 1.2 + noiseOffset1);
  float n2 = snoise(position * 2.5 - vec3(fastTime * 0.8, fastTime, fastTime * 0.5)) * 0.6;
  
  vNoise = n1 + n2;
  
  // Displace along normal
  // High baseline displacement so it's perfectly bubbling without going totally crazy
  float displacement = vNoise * 0.45;
  vec3 newPosition = position + normal * displacement;
  
  vPosition = newPosition;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`

const orbFragmentShader = `
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

void main() {
  // Base color: Cold blue
  vec3 colorA = vec3(0.0, 0.2, 0.6); // Deep blue
  vec3 colorB = vec3(0.0, 0.8, 1.0); // Bright cyan/blue
  
  // Mix color based on noise height (peaks are brighter)
  // Also globally brighten based on audio intensity
  float mixVal = smoothstep(-0.5, 0.5, vNoise);
  vec3 baseColor = mix(colorA, colorB, mixVal);
  
  // Add an emissive glow that flares heavily with intensity
  vec3 flareColor = vec3(0.5, 0.9, 1.0);
  float flareMask = smoothstep(0.0, 0.5, vNoise * uIntensity);
  
  vec3 finalColor = baseColor + (flareColor * flareMask * 2.0);
  
  // Ambient glow boost
  finalColor += colorB * (0.2 + uIntensity);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`

const _targetScale = new THREE.Vector3()

function EntityOrb({ intensityRef }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
      // Read intensity from the ref (no re-renders)
      const currentIntensity = intensityRef.current
      materialRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uIntensity.value,
        currentIntensity,
        0.1
      )
      // Keep the scale perfectly static at the normal idle size
      const targetScale = 1.8
      _targetScale.set(targetScale, targetScale, targetScale)
      meshRef.current.scale.lerp(_targetScale, 0.08)

      // Color shift is handled directly by the GLSL shader now based on uIntensity
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
      {/* Increased segments for smoother noise displacement */}
      <Sphere ref={meshRef} args={[1.5, 256, 256]} position={[0, 2.5, 0]}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={orbVertexShader}
          fragmentShader={orbFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uIntensity: { value: 0 },
          }}
          wireframe={false}
        />
      </Sphere>

      {/* Light emanating from the orb itself */}
      <pointLight
        position={[0, 2.5, 0]}
        intensity={2}
        color="#00aaff"
        distance={30}
        decay={2}
      />
    </Float>
  )
}

function BloomEffect() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.1}
        luminanceSmoothing={0.9}
        intensity={2.5}
        radius={0.9}
      />
    </EffectComposer>
  )
}

function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      {/* Perfect, smooth, dark mirror */}
      <MeshReflectorMaterial
        blur={[0, 0]}
        resolution={1024}
        mixBlur={0}
        mixStrength={100}
        roughness={0.0} // perfectly smooth
        depthScale={1}
        minDepthThreshold={0.9}
        maxDepthThreshold={1}
        color="#000000" // base color black
        metalness={1.0}
        mirror={1.0}
      />
    </mesh>
  )
}

function CameraRig({ intensityRef }: SceneProps) {
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    // Subtle camera sway - user is small, looking up
    state.camera.position.x = Math.sin(time * 0.05) * 0.5
    state.camera.position.y = 1.0 + Math.cos(time * 0.08) * 0.2

    // Look at the orb (which is at x=0)
    state.camera.lookAt(0, 2.5, 0)

    // Use the intensity so TypeScript doesn't complain about unused variables
    const currentIntensity = intensityRef.current
    if (currentIntensity > 0) {
      state.camera.position.y += currentIntensity * 0.05
    }
  })
  return null
}

function FallbackVisualizer({ intensityRef }: SceneProps) {
  // For fallback, we read the ref in a simple way
  const intensity = intensityRef.current
  return (
    <div className="flex items-center justify-center w-full h-full bg-[#000000]">
      <div
        className="rounded-full blur-3xl transition-all duration-500"
        style={{
          width: `${300 + intensity * 400}px`,
          height: `${300 + intensity * 400}px`,
          background: `radial-gradient(circle, rgba(0, 170, 255, ${0.2 + intensity * 0.5}) 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}

export default function Visualizer({ intensityRef }: SceneProps) {
  const [hasWebGL] = useState(isWebGLAvailable)

  if (!hasWebGL) {
    return (
      <div className="fixed inset-0 z-0 bg-black">
        <FallbackVisualizer intensityRef={intensityRef} />
      </div>
    )
  }

  // Read intensity from ref for Bloom (no re-renders)
  // Bloom intensity is static baseline; the ref is read inside useFrame for the orb
  return (
    <div className="fixed inset-0 z-0 bg-black">
      <Canvas
        camera={{ position: [0, 1.0, 8], fov: 60 }} // Camera lower, looking slightly up
        gl={{ antialias: true, failIfMajorPerformanceCaveat: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 8, 30]} />

        <EntityOrb intensityRef={intensityRef} />
        <ReflectiveFloor />
        <CameraRig intensityRef={intensityRef} />

        <BloomEffect />
      </Canvas>
    </div>
  )
}

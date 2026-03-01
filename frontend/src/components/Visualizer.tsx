import { memo, useRef, useState, useEffect, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere } from '@react-three/drei'
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
  isConnected?: boolean
  start?: () => void
  stop?: () => void
  messages?: Message[]
  inputText?: string
  setInputText?: (text: string) => void
  handleSend?: () => void
  threeJsCode?: string | null
  clearThreeJsCode?: () => void
}

import { type Message } from '../hooks/useGeminiLive'
import { StartButton3D } from './StartButton3D'
import { ChatModal3D } from './ChatModal3D'

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 768px), (pointer: coarse)')
    const onChange = () => setIsMobile(mediaQuery.matches)
    onChange()
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  return isMobile
}


function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

// Dynamic mesh component that renders in the main scene
function GeneratedMesh({ code, onClose }: { code: string; onClose?: () => void }) {
  const groupRef = useRef<THREE.Group>(null!)
  const [meshObj, setMeshObj] = useState<THREE.Object3D | null>(null)
  
  useEffect(() => {
    async function createMesh() {
      try {
        // Create a temporary scene to execute the code
        const tempScene = new THREE.Scene()
        
        // Create a scope with THREE and scene
        const scope = {
          THREE,
          scene: tempScene,
          console,
          Math,
          requestAnimationFrame: (fn: FrameRequestCallback) => setTimeout(fn, 16),
          setTimeout,
          setInterval,
        }
        
        // Extract just the code that adds to scene (skip imports and lighting)
        let execCode = code
        
        // Remove import statements
        execCode = execCode.replace(/import\s+.*?;/g, '')
        
        // Remove light/ambient additions (we have our own lighting)
        execCode = execCode.replace(/scene\.add\(.*?Light.*?\);/gi, '')
        
        // Execute the code
        const keys = Object.keys(scope)
        const values = Object.values(scope)
        const fn = new Function(...keys, execCode)
        fn(...values)
        
        // Find what was added to the scene
        const meshes: THREE.Object3D[] = []
        tempScene.traverse((child) => {
          if ((child as THREE.Object3D).type === 'Mesh' || (child as THREE.Object3D).type === 'Group') {
            meshes.push(child as THREE.Object3D)
          }
        })
        
        const mainObject = meshes[0]
        
        if (mainObject) {
          setMeshObj(mainObject.clone())
        }
      } catch (e) {
        console.error('Failed to create mesh:', e)
      }
    }
    
    createMesh()
  }, [code])
  
  // Animate the mesh
  useEffect(() => {
    if (!groupRef.current) return
    
    let animationId: number
    const animate = () => {
      if (groupRef.current) {
        groupRef.current.rotation.y += 0.01
        groupRef.current.position.y = Math.sin(Date.now() * 0.002) * 0.2
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()
    
    return () => cancelAnimationFrame(animationId)
  }, [meshObj])
  
  return (
    <group ref={groupRef} position={[0, 2.5, 5]}>
      {meshObj && <primitive object={meshObj} />}
      {onClose && (
        <Float speed={2} floatIntensity={0.5}>
          <mesh position={[0, -1.5, 0]} onClick={onClose}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </Float>
      )}
    </group>
  )
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
  // Layered dark palette
  vec3 colorDeep   = vec3(0.01, 0.04, 0.14); // dark navy
  vec3 colorMid    = vec3(0.05, 0.12, 0.35); // indigo
  vec3 colorBright = vec3(0.1, 0.22, 0.55);  // slate-blue
  
  // Layer 1: base gradient from deep valleys to mid-tone peaks
  float layer1 = smoothstep(-0.6, 0.3, vNoise);
  vec3 baseColor = mix(colorDeep, colorMid, layer1);
  
  // Layer 2: brighter ridges on the highest peaks only
  float layer2 = smoothstep(0.2, 0.7, vNoise);
  baseColor = mix(baseColor, colorBright, layer2 * 0.65);
  
  // Layer 3: subtle cool highlight on extreme peaks
  vec3 highlightColor = vec3(0.15, 0.28, 0.6);
  float layer3 = smoothstep(0.5, 1.0, vNoise);
  baseColor += highlightColor * layer3 * 0.35;
  
  // Subtle intensity-reactive glow (cool violet-blue tint)
  vec3 flareColor = vec3(0.12, 0.1, 0.35);
  float flareMask = smoothstep(0.0, 0.6, vNoise * uIntensity);
  baseColor += flareColor * flareMask;
  
  // Faint ambient
  baseColor += colorMid * (0.08 + uIntensity * 0.2);
  
  gl_FragColor = vec4(baseColor, 1.0);
}
`

const _targetScale = new THREE.Vector3()

const EntityOrb = memo(function EntityOrb({ intensityRef, isMobile = false }: SceneProps & { isMobile?: boolean }) {
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
      <Sphere ref={meshRef} args={[1.5, isMobile ? 128 : 256, isMobile ? 128 : 256]} position={[0, 2.5, 0]}>
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
        intensity={1.5}
        color="#1e3a8a"
        distance={24}
        decay={2}
      />
    </Float>
  )
})

function BloomEffect({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.12}
        luminanceSmoothing={0.9}
        intensity={isMobile ? 1.05 : 1.6}
        radius={isMobile ? 0.65 : 0.85}
      />
    </EffectComposer>
  )
}



function CameraRig({ intensityRef, isConnected, isMobile = false }: SceneProps & { isMobile?: boolean }) {
  const lookAtTarget = useRef(new THREE.Vector3(0, 2.5, 0))
  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    const targetX = isMobile ? 0 : (isConnected ? 3.5 : (Math.sin(time * 0.05) * 0.5))
    const targetZ = isMobile ? 9.5 : (isConnected ? 12 : 11)

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.02)
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.02)

    state.camera.position.y = (isMobile ? 1.4 : 1.0) + Math.cos(time * 0.08) * 0.2

    // Use the intensity so TypeScript doesn't complain about unused variables
    const currentIntensity = intensityRef.current
    if (currentIntensity > 0) {
      state.camera.position.y += currentIntensity * 0.05
    }

    const targetLookAtX = isMobile ? 0 : (isConnected ? 3.5 : 0)
    const targetLookAtY = isMobile ? 2.6 : (isConnected ? 2.5 : 1.5)
    lookAtTarget.current.x = THREE.MathUtils.lerp(lookAtTarget.current.x, targetLookAtX, 0.02)
    lookAtTarget.current.y = THREE.MathUtils.lerp(lookAtTarget.current.y, targetLookAtY, 0.02)
    state.camera.lookAt(lookAtTarget.current)
  })
  return null
}

interface MobileOverlayProps {
  isConnected?: boolean
  start?: () => void
  stop?: () => void
  messages?: Message[]
  inputText?: string
  setInputText?: (text: string) => void
  handleSend?: () => void
}

function MobileOverlay({
  isConnected,
  start,
  stop,
  messages,
  inputText,
  setInputText,
  handleSend,
}: MobileOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-5 text-slate-100 pointer-events-none">
      <div className="pointer-events-none">
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          Gemini Live
        </h1>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/60 backdrop-blur">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {isConnected ? (
        <div className="pointer-events-auto w-full rounded-2xl border border-slate-700/60 bg-slate-950/65 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div ref={scrollRef} className="h-[42vh] overflow-y-auto p-3 space-y-3">
            {(messages ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 uppercase tracking-wider">Awaiting input...</p>
            ) : (
              (messages ?? []).map((msg, i) => (
                <div key={i} className={`text-sm leading-relaxed ${msg.role === 'user' || msg.role === 'user_voice' ? 'text-right' : 'text-left'}`}>
                  <span className={`inline-block max-w-[90%] rounded-xl px-3 py-2 ${msg.role === 'user' || msg.role === 'user_voice' ? 'bg-indigo-500/25 text-indigo-200' : 'bg-slate-800/70 text-slate-200'}`}>
                    {msg.content}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-700/60 space-y-2">
            <input
              type="text"
              value={inputText || ''}
              onChange={(e) => setInputText?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend?.()}
              placeholder="Type a message..."
              className="w-full min-h-12 rounded-xl bg-slate-900/80 border border-slate-700 px-4 py-3 text-base outline-none focus:border-sky-500/60"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSend?.()}
                className="min-h-12 rounded-xl bg-indigo-500 text-white font-semibold active:scale-[0.98]"
              >
                Send
              </button>
              <button
                onClick={() => stop?.()}
                className="min-h-12 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold active:scale-[0.98]"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => start?.()}
          className="pointer-events-auto w-full min-h-14 rounded-2xl bg-sky-500 text-white text-lg font-bold shadow-lg active:scale-[0.98]"
        >
          Start conversation
        </button>
      )}
    </div>
  )
}

function FallbackVisualizer({ intensityRef }: SceneProps) {
  const [intensity, setIntensity] = useState(0)

  useEffect(() => {
    let rafId = 0
    const syncIntensity = () => {
      setIntensity(intensityRef.current)
      rafId = requestAnimationFrame(syncIntensity)
    }

    rafId = requestAnimationFrame(syncIntensity)
    return () => cancelAnimationFrame(rafId)
  }, [intensityRef])

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

export default memo(function Visualizer(props: SceneProps) {
  const { intensityRef, isConnected, start, stop, messages, inputText, setInputText, handleSend, threeJsCode, clearThreeJsCode } = props
  const [hasWebGL] = useState(isWebGLAvailable)
  const isMobile = useIsMobile()

  if (!hasWebGL) {
    return (
      <div className="fixed inset-0 z-0 bg-black">
        <FallbackVisualizer intensityRef={intensityRef} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-0 bg-black">
      <Canvas
        camera={{ position: [0, 1.0, 8], fov: 60 }}
        gl={{ antialias: !isMobile, failIfMajorPerformanceCaveat: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
      >
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 8, 30]} />
        <ambientLight intensity={0.5} />

        {/* 3D UI Overlay */}
        {!isMobile && !isConnected && start && (
          <StartButton3D onClick={start} />
        )}

        {!isMobile && isConnected && messages && setInputText && handleSend && stop && (
          <ChatModal3D
            messages={messages}
            inputText={inputText || ''}
            setInputText={setInputText}
            handleSend={handleSend}
            stop={stop}
          />
        )}

        <EntityOrb intensityRef={intensityRef} isMobile={isMobile} />

        {!isMobile && threeJsCode && clearThreeJsCode && (
          <GeneratedMesh 
            code={threeJsCode} 
            onClose={() => clearThreeJsCode()} 
          />
        )}

        <CameraRig intensityRef={intensityRef} isConnected={isConnected} isMobile={isMobile} />

        <BloomEffect isMobile={isMobile} />
      </Canvas>

      {isMobile && (
        <MobileOverlay
          isConnected={isConnected}
          start={start}
          stop={stop}
          messages={messages}
          inputText={inputText}
          setInputText={setInputText}
          handleSend={handleSend}
        />
      )}

      {/* 2D Header overlay */}
      {!isMobile && !isConnected && (
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10 w-full">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-2xl">
            Gemini Live
          </h1>
          <div className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-rose-500 transition-shadow duration-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Disconnected
            </span>
          </div>
        </div>
      )}
    </div>
  )
})

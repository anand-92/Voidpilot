import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
    scrollProgress: number; // 0.0 to 2.0 continuous
}

// Camera waypoints for each section boundary
const WAYPOINTS = [
    { camX: 0, camY: 0, camZ: 8, coreRotY: 0 },        // section 0 (Hero)
    { camX: -3, camY: 1.5, camZ: 4, coreRotY: Math.PI / 2 },  // section 1 (Capabilities)
    { camX: 2, camY: -1, camZ: 1, coreRotY: Math.PI },   // section 2 (Hackathon)
];

function lerpWaypoint(a: typeof WAYPOINTS[0], b: typeof WAYPOINTS[0], t: number) {
    return {
        camX: a.camX + (b.camX - a.camX) * t,
        camY: a.camY + (b.camY - a.camY) * t,
        camZ: a.camZ + (b.camZ - a.camZ) * t,
        coreRotY: a.coreRotY + (b.coreRotY - a.coreRotY) * t,
    };
}

export function ThreeBackground({ scrollProgress }: ThreeBackgroundProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sceneRef = useRef<any>(null);
    const targetParams = useRef(WAYPOINTS[0]);
    const mouseRef = useRef({ x: 0, y: 0, halfW: 0, halfH: 0 });

    // Continuously interpolate camera target based on scroll progress
    const startLoop = () => {
        const renderer = rendererRef.current;
        const s = sceneRef.current;
        if (!renderer || !s) return;
        const { scene, camera, clock, coreGroup, coreMesh, rings } = s;

        renderer.setAnimationLoop(() => {
            const time = clock.getElapsedTime();

            const driftX =
                Math.sin(time * 0.42) * 0.18 +
                Math.sin(time * 0.97 + Math.sin(time * 0.23) * 1.4) * 0.28;
            const driftY =
                Math.cos(time * 0.58 + 0.8) * 0.14 +
                Math.sin(time * 1.21 + Math.cos(time * 0.19) * 1.7) * 0.2;
            const driftZ =
                Math.sin(time * 0.33 + 1.2) * 0.1 +
                Math.cos(time * 0.88 + Math.sin(time * 0.27)) * 0.16;

            coreMesh.material.uniforms.uTime.value = time;
            coreMesh.rotation.y += 0.003;
            coreMesh.rotation.x += 0.001;
            for (let i = 0; i < rings.length; i++) {
                const ring = rings[i];
                const speed = 0.15 + i * 0.02;
                const offset = (i / rings.length) * Math.PI;
                ring.rotation.y = time * speed + offset;
            }

            const tp = targetParams.current;
            coreGroup.rotation.y += (tp.coreRotY - coreGroup.rotation.y) * 0.06;

            const px = mouseRef.current.x * 0.001, py = mouseRef.current.y * 0.001;
            coreGroup.position.x += (px * 2 + driftX - coreGroup.position.x) * 0.05;
            coreGroup.position.y += (-py * 2 + driftY - coreGroup.position.y) * 0.05;
            coreGroup.position.z += (driftZ - coreGroup.position.z) * 0.04;

            // Smooth camera follow with faster lerp for responsiveness
            camera.position.x += (tp.camX - camera.position.x) * 0.06;
            camera.position.y += (tp.camY - camera.position.y) * 0.06;
            camera.position.z += (tp.camZ - camera.position.z) * 0.06;
            camera.position.x += (px - (camera.position.x - tp.camX)) * 0.05;
            camera.position.y += (-py - (camera.position.y - tp.camY)) * 0.05;

            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        });
    }
    useEffect(() => {
        const clamped = Math.max(0, Math.min(2, scrollProgress));
        const idx = Math.min(Math.floor(clamped), WAYPOINTS.length - 2);
        const t = clamped - idx;
        targetParams.current = lerpWaypoint(WAYPOINTS[idx], WAYPOINTS[idx + 1], t);
    }, [scrollProgress]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // StrictMode re-mount guard
        if (rendererRef.current && sceneRef.current) {
            if (!container.contains(rendererRef.current.domElement)) {
                container.appendChild(rendererRef.current.domElement);
            }
            startLoop();
            return () => { rendererRef.current?.setAnimationLoop(null); };
        }

        // --- Setup ---
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2('#020617', 0.032);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 8);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Lights ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const p1 = new THREE.PointLight(0x38bdf8, 5.5, 55);
        p1.position.set(5, 5, 5);
        scene.add(p1);
        const p2 = new THREE.PointLight(0x818cf8, 4, 55);
        p2.position.set(-5, -5, 2);
        scene.add(p2);

        // --- Burning planet core ---
        const coreGroup = new THREE.Group();
        scene.add(coreGroup);
        const planetMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorDeep: { value: new THREE.Color(0x020824) },
                uColorMid: { value: new THREE.Color(0x0a1e5c) },
                uColorHot: { value: new THREE.Color(0x1e3a8a) },
                uColorWhite: { value: new THREE.Color(0x3b82f6) },
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vNormal = normal;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColorDeep;
                uniform vec3 uColorMid;
                uniform vec3 uColorHot;
                uniform vec3 uColorWhite;
                varying vec3 vNormal;
                varying vec3 vPosition;

                // 3D simplex-like noise
                vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
                vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
                vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                float snoise(vec3 v) {
                    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                    vec3 i = floor(v + dot(v, C.yyy));
                    vec3 x0 = v - i + dot(i, C.xxx);
                    vec3 g = step(x0.yzx, x0.xyz);
                    vec3 l = 1.0 - g;
                    vec3 i1 = min(g.xyz, l.zxy);
                    vec3 i2 = max(g.xyz, l.zxy);
                    vec3 x1 = x0 - i1 + C.xxx;
                    vec3 x2 = x0 - i2 + C.yyy;
                    vec3 x3 = x0 - D.yyy;
                    i = mod289(i);
                    vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                    float n_ = 0.142857142857;
                    vec3 ns = n_ * D.wyz - D.xzx;
                    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                    vec4 x_ = floor(j * ns.z);
                    vec4 y_ = floor(j - 7.0 * x_);
                    vec4 x = x_ * ns.x + ns.yyyy;
                    vec4 y = y_ * ns.x + ns.yyyy;
                    vec4 h = 1.0 - abs(x) - abs(y);
                    vec4 b0 = vec4(x.xy, y.xy);
                    vec4 b1 = vec4(x.zw, y.zw);
                    vec4 s0 = floor(b0)*2.0 + 1.0;
                    vec4 s1 = floor(b1)*2.0 + 1.0;
                    vec4 sh = -step(h, vec4(0.0));
                    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                    vec3 p0 = vec3(a0.xy, h.x);
                    vec3 p1 = vec3(a0.zw, h.y);
                    vec3 p2 = vec3(a1.xy, h.z);
                    vec3 p3 = vec3(a1.zw, h.w);
                    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
                    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
                    m = m * m;
                    return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
                }

                float fbm(vec3 p) {
                    float f = 0.0;
                    f += 0.5 * snoise(p); p *= 2.02;
                    f += 0.25 * snoise(p); p *= 2.03;
                    f += 0.125 * snoise(p); p *= 2.01;
                    f += 0.0625 * snoise(p);
                    return f;
                }

                void main() {
                    vec3 pos = vPosition * 2.0;
                    float t = uTime * 0.15;
                    float n = fbm(pos + vec3(t, t * 0.7, -t * 0.3));
                    n = n * 0.5 + 0.5;
                    // Cracks / fissures
                    float cracks = fbm(pos * 3.0 + vec3(-t * 0.5, t * 0.4, t * 0.2));
                    float crackMask = smoothstep(0.0, 0.15, abs(cracks));
                    // Blend lava colors
                    vec3 col = mix(uColorWhite, uColorHot, smoothstep(0.0, 0.3, n));
                    col = mix(col, uColorMid, smoothstep(0.3, 0.6, n));
                    col = mix(col, uColorDeep, smoothstep(0.6, 1.0, n));
                    // Hot cracks glow through dark crust
                    col = mix(uColorWhite * 1.3, col, crackMask);
                    // Rim glow
                    float rim = 1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0);
                    col += vec3(0.1, 0.2, 0.8) * pow(rim, 3.0) * 0.8;
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
        });
        const coreMesh = new THREE.Mesh(
            new THREE.SphereGeometry(1.17, 64, 64),
            planetMat
        );
        coreGroup.add(coreMesh);

        // --- Mandala wind spinner rings ---
        const RING_COUNT = 14;
        const rings: THREE.Mesh[] = [];
        const ringGeom = new THREE.TorusGeometry(1.9, 0.015, 8, 200);
        for (let i = 0; i < RING_COUNT; i++) {
            const t = i / RING_COUNT;
            const hue = 0.58 + t * 0.12;
            const color = new THREE.Color().setHSL(hue, 0.6, 0.7);
            const mat = new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: 0.45,
                blending: THREE.AdditiveBlending, side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeom, mat);
            ring.rotation.x = (i / RING_COUNT) * Math.PI;
            coreGroup.add(ring);
            rings.push(ring);
        }

        // --- Core Light ---
        const coreLight = new THREE.PointLight(0x1e40af, 6, 34);
        coreLight.position.set(0, 0, 0);
        coreGroup.add(coreLight);

        const clock = new THREE.Clock();
        sceneRef.current = { scene, camera, clock, coreGroup, coreMesh, rings };

        mouseRef.current.halfW = window.innerWidth / 2;
        mouseRef.current.halfH = window.innerHeight / 2;
        const onMouseMove = (e: MouseEvent) => { mouseRef.current.x = e.clientX - mouseRef.current.halfW; mouseRef.current.y = e.clientY - mouseRef.current.halfH; };
        window.addEventListener('mousemove', onMouseMove);

        const onResize = () => {
            mouseRef.current.halfW = window.innerWidth / 2;
            mouseRef.current.halfH = window.innerHeight / 2;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        startLoop();

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onResize);
            renderer.setAnimationLoop(null);
        };
    }, []);



    return <div ref={containerRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0" />;
}

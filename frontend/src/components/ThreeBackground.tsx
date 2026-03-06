import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
    currentSection: number;
}

export function ThreeBackground({ currentSection }: ThreeBackgroundProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        clock: THREE.Clock;
        coreGroup: THREE.Group;
        coreMesh: THREE.Mesh;
        cageMesh: THREE.Mesh;
        nodesGroup: THREE.Group;
        nodes: any[];
        linesMesh: THREE.LineSegments;
        gridMat: THREE.ShaderMaterial;
        maxLines: number;
        nodeCount: number;
    } | null>(null);
    const targetParams = useRef({ camX: 0, camY: 0, camZ: 8, coreRotY: 0 });
    const mouseRef = useRef({ x: 0, y: 0, halfW: 0, halfH: 0 });

    // Update camera targets when section changes
    useEffect(() => {
        switch (currentSection) {
            case 0:
                targetParams.current = { camX: 0, camY: 0, camZ: 8, coreRotY: 0 };
                break;
            case 1:
                targetParams.current = { camX: -3, camY: 1.5, camZ: 4, coreRotY: Math.PI / 2 };
                break;
            case 2:
                targetParams.current = { camX: 2, camY: -1, camZ: 1, coreRotY: Math.PI };
                break;
        }
    }, [currentSection]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // If we already have a renderer (StrictMode re-mount), just restart the loop
        if (rendererRef.current && sceneRef.current) {
            // Re-append the canvas if missing
            if (!container.contains(rendererRef.current.domElement)) {
                container.appendChild(rendererRef.current.domElement);
            }
            startLoop();
            return () => {
                rendererRef.current?.setAnimationLoop(null);
            };
        }

        // --- Fresh initialization ---
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2('#020617', 0.04);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 8);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Lights ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const p1 = new THREE.PointLight(0x38bdf8, 2, 50);
        p1.position.set(5, 5, 5);
        scene.add(p1);
        const p2 = new THREE.PointLight(0x818cf8, 2, 50);
        p2.position.set(-5, -5, 2);
        scene.add(p2);

        // --- Core ---
        const coreGroup = new THREE.Group();
        scene.add(coreGroup);

        const coreMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.5, 1),
            new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8, metalness: 0.2, roughness: 0.1,
                transmission: 0.9, thickness: 0.5,
                emissive: 0x0284c7, emissiveIntensity: 0.5
            })
        );
        coreGroup.add(coreMesh);

        const cageMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.8, 1),
            new THREE.MeshBasicMaterial({
                color: 0x818cf8, wireframe: true, transparent: true,
                opacity: 0.3, blending: THREE.AdditiveBlending
            })
        );
        coreGroup.add(cageMesh);

        // --- Nodes ---
        const nodesGroup = new THREE.Group();
        scene.add(nodesGroup);
        const nodeCount = 40;
        const nodes: any[] = [];
        const nodeGeo = new THREE.OctahedronGeometry(0.08, 0);
        const nodeMat = new THREE.MeshBasicMaterial({
            color: 0xbae6fd, transparent: true, opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        for (let i = 0; i < nodeCount; i++) {
            const mesh = new THREE.Mesh(nodeGeo, nodeMat);
            const radius = 2.5 + Math.random() * 6;
            const speed = (Math.random() - 0.5) * 0.015;
            const angle = Math.random() * Math.PI * 2;
            const yOffset = (Math.random() - 0.5) * 10;
            mesh.position.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius);
            nodesGroup.add(mesh);
            nodes.push({ mesh, radius, speed, angle, yOffset });
        }

        // --- Lines ---
        const maxLines = 1000;
        const lineGeo = new THREE.BufferGeometry();
        const linePositions = new Float32Array(maxLines * 6);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        const linesMesh = new THREE.LineSegments(
            lineGeo,
            new THREE.LineBasicMaterial({
                color: 0x6366f1, transparent: true, opacity: 0.15,
                blending: THREE.AdditiveBlending
            })
        );
        scene.add(linesMesh);

        // --- Grid Floor ---
        const gridMat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color('#0ea5e9') },
                color2: { value: new THREE.Color('#6366f1') }
            },
            vertexShader: `
                uniform float time;
                varying vec2 vUv;
                varying vec3 vPosition;
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i = floor(v + dot(v, C.yy));
                    vec2 x0 = v - i + dot(i, C.xx);
                    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod289(i);
                    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m; m = m*m;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                    vec3 g;
                    g.x = a0.x * x0.x + h.x * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    float ns = snoise(vec2(pos.x * 0.8 + time * 0.1, pos.y * 0.8 + time * 0.1));
                    pos.z += ns;
                    vPosition = pos;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    float depthMix = smoothstep(-1.0, 1.5, vPosition.z);
                    vec3 mixedColor = mix(color2, color1, depthMix);
                    vec2 grid = abs(fract(vUv * 50.0 - 0.5) - 0.5);
                    float line = min(grid.x, grid.y) * 40.0;
                    float alpha = 1.0 - min(line, 1.0);
                    float dist = distance(vUv, vec2(0.5));
                    float fade = smoothstep(0.45, 0.1, dist);
                    mixedColor += vec3(smoothstep(0.5, 1.5, vPosition.z) * 0.6);
                    gl_FragColor = vec4(mixedColor, alpha * fade * 0.35);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 150, 150), gridMat);
        gridMesh.rotation.x = -Math.PI / 2.2;
        gridMesh.position.set(0, -4, -5);
        scene.add(gridMesh);

        // Store all scene refs
        const clock = new THREE.Clock();
        sceneRef.current = {
            scene, camera, clock, coreGroup, coreMesh, cageMesh,
            nodesGroup, nodes, linesMesh, gridMat, maxLines, nodeCount
        };

        // Mouse tracking
        mouseRef.current.halfW = window.innerWidth / 2;
        mouseRef.current.halfH = window.innerHeight / 2;

        const onMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = e.clientX - mouseRef.current.halfW;
            mouseRef.current.y = e.clientY - mouseRef.current.halfH;
        };
        window.addEventListener('mousemove', onMouseMove);

        const onResize = () => {
            mouseRef.current.halfW = window.innerWidth / 2;
            mouseRef.current.halfH = window.innerHeight / 2;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        // Start the animation
        startLoop();

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onResize);
            renderer.setAnimationLoop(null);
            // DO NOT dispose or remove canvas here — StrictMode will re-mount
            // and we want to reuse the same renderer/context
        };
    }, []);

    function startLoop() {
        const renderer = rendererRef.current;
        const s = sceneRef.current;
        if (!renderer || !s) return;

        const { scene, camera, clock, coreGroup, coreMesh, cageMesh, nodesGroup, nodes, linesMesh, gridMat, maxLines, nodeCount } = s;

        renderer.setAnimationLoop(() => {
            const time = clock.getElapsedTime();
            gridMat.uniforms.time.value = time;

            coreMesh.rotation.y += 0.005;
            coreMesh.rotation.x += 0.002;
            cageMesh.rotation.y -= 0.003;
            cageMesh.rotation.z += 0.001;

            const tp = targetParams.current;
            coreGroup.rotation.y += (tp.coreRotY - coreGroup.rotation.y) * 0.03;

            const px = mouseRef.current.x * 0.001;
            const py = mouseRef.current.y * 0.001;
            coreGroup.position.x += (px * 2 - coreGroup.position.x) * 0.05;
            coreGroup.position.y += (-py * 2 - coreGroup.position.y) * 0.05;

            // Nodes & Lines
            let lIdx = 0;
            const posArr = linesMesh.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < nodeCount; i++) {
                const n = nodes[i];
                n.angle += n.speed;
                n.mesh.position.set(
                    Math.cos(n.angle) * n.radius,
                    n.yOffset + Math.sin(time * 2 + i) * 0.5,
                    Math.sin(n.angle) * n.radius
                );
                n.mesh.rotation.x += 0.02;
                n.mesh.rotation.y += 0.02;

                for (let j = i + 1; j < nodeCount; j++) {
                    if (lIdx >= maxLines * 6 - 6) break;
                    const o = nodes[j];
                    if (n.mesh.position.distanceTo(o.mesh.position) < 4.5) {
                        posArr[lIdx++] = n.mesh.position.x;
                        posArr[lIdx++] = n.mesh.position.y;
                        posArr[lIdx++] = n.mesh.position.z;
                        posArr[lIdx++] = o.mesh.position.x;
                        posArr[lIdx++] = o.mesh.position.y;
                        posArr[lIdx++] = o.mesh.position.z;
                    }
                }
            }
            for (let i = lIdx; i < maxLines * 6; i++) posArr[i] = 0;
            linesMesh.geometry.attributes.position.needsUpdate = true;
            nodesGroup.rotation.y = time * 0.05;

            // Camera lerp
            camera.position.x += (tp.camX - camera.position.x) * 0.02;
            camera.position.y += (tp.camY - camera.position.y) * 0.02;
            camera.position.z += (tp.camZ - camera.position.z) * 0.02;
            camera.position.x += (px - (camera.position.x - tp.camX)) * 0.05;
            camera.position.y += (-py - (camera.position.y - tp.camY)) * 0.05;

            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        });
    }

    return (
        <div
            ref={containerRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        />
    );
}

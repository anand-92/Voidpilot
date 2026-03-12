import React, { useEffect, useRef } from 'react';
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

export const ThreeBackground = React.memo(function ThreeBackground({ scrollProgress }: ThreeBackgroundProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sceneRef = useRef<any>(null);
    const mouseRef = useRef({ x: 0, y: 0, halfW: 0, halfH: 0 });
    const scrollProgressRef = useRef(scrollProgress);

    // Keep ref in sync without triggering re-renders
    useEffect(() => {
        scrollProgressRef.current = scrollProgress;
    }, [scrollProgress]);

    // Continuously interpolate camera target based on scroll progress
    const startLoop = () => {
        const renderer = rendererRef.current;
        const s = sceneRef.current;
        if (!renderer || !s) return;
        const { scene, camera, clock, coreGroup, coreMesh, cageMesh, gridMat } = s;

        renderer.setAnimationLoop(() => {
            const time = clock.getElapsedTime();
            gridMat.uniforms.time.value = time;

            // Read scroll progress directly from ref (no re-render needed)
            const clamped = Math.max(0, Math.min(2, scrollProgressRef.current));
            const idx = Math.min(Math.floor(clamped), WAYPOINTS.length - 2);
            const t = clamped - idx;
            const target = lerpWaypoint(WAYPOINTS[idx], WAYPOINTS[idx + 1], t);

            const driftX =
                Math.sin(time * 0.42) * 0.18 +
                Math.sin(time * 0.97 + Math.sin(time * 0.23) * 1.4) * 0.28;
            const driftY =
                Math.cos(time * 0.58 + 0.8) * 0.14 +
                Math.sin(time * 1.21 + Math.cos(time * 0.19) * 1.7) * 0.2;
            const driftZ =
                Math.sin(time * 0.33 + 1.2) * 0.1 +
                Math.cos(time * 0.88 + Math.sin(time * 0.27)) * 0.16;

            coreMesh.rotation.y += 0.005;
            coreMesh.rotation.x += 0.002;
            cageMesh.rotation.y -= 0.003;
            cageMesh.rotation.z += 0.001;

            coreGroup.rotation.y += (target.coreRotY - coreGroup.rotation.y) * 0.06;

            const px = mouseRef.current.x * 0.001, py = mouseRef.current.y * 0.001;
            coreGroup.position.x += (px * 2 + driftX - coreGroup.position.x) * 0.05;
            coreGroup.position.y += (-py * 2 + driftY - coreGroup.position.y) * 0.05;
            coreGroup.position.z += (driftZ - coreGroup.position.z) * 0.04;

            // Smooth camera follow with faster lerp for responsiveness
            camera.position.x += (target.camX - camera.position.x) * 0.06;
            camera.position.y += (target.camY - camera.position.y) * 0.06;
            camera.position.z += (target.camZ - camera.position.z) * 0.06;
            camera.position.x += (px - (camera.position.x - target.camX)) * 0.05;
            camera.position.y += (-py - (camera.position.y - target.camY)) * 0.05;

            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        });
    }

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

        const renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: false, // Disable antialias for performance
            powerPreference: 'high-performance'
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(window.innerWidth, window.innerHeight);
        // Cap at 1.5 for high-DPI displays to reduce GPU load
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- Lights ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        // Reduced from 4 point lights to 2 for performance
        const p1 = new THREE.PointLight(0x38bdf8, 4, 40);
        p1.position.set(5, 5, 5);
        scene.add(p1);
        const p2 = new THREE.PointLight(0x818cf8, 3, 40);
        p2.position.set(-5, -5, 2);
        scene.add(p2);

        // --- Core ---
        const coreGroup = new THREE.Group();
        scene.add(coreGroup);
        const coreMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.5, 1),
            new THREE.MeshBasicMaterial({
                color: 0x60a5fa,
            })
        );
        coreGroup.add(coreMesh);
        const cageMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.8, 1),
            new THREE.MeshBasicMaterial({ color: 0xc4b5fd, wireframe: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
        );
        coreGroup.add(cageMesh);

        // --- Core Light (makes act like a bulb) ---
        const coreLight = new THREE.PointLight(0x38bdf8, 6, 25);
        coreLight.position.set(0, 0, 0);
        coreGroup.add(coreLight);

        // --- Grid Floor ---
        const gridMat = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 }, color1: { value: new THREE.Color('#38bdf8') }, color2: { value: new THREE.Color('#818cf8') } },
            vertexShader: `
                uniform float time; varying vec2 vUv;
                void main(){
                    vUv=uv;
                    vec3 pos=position;
                    // Simplified wave - no noise, just simple sine
                    pos.z+=sin(pos.x*0.5+time*0.3)*0.3;
                    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;uniform vec3 color2;varying vec2 vUv;
                void main(){
                    vec3 c=mix(color2,color1,vUv.y);
                    vec2 grid=abs(fract(vUv*30.-.5)-.5);
                    float line=min(grid.x,grid.y)*30.;
                    float alpha=1.-min(line,1.);
                    float dist=distance(vUv,vec2(.5));
                    float fade=smoothstep(.45,.1,dist);
                    gl_FragColor=vec4(c,alpha*fade*.4);
                }
            `,
            transparent: true, side: THREE.DoubleSide
        });
        // Reduced from 150x150 to 50x50 for performance
        const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 50, 50), gridMat);
        gridMesh.rotation.x = -Math.PI / 2.2;
        gridMesh.position.set(0, -4, -5);
        scene.add(gridMesh);

        const clock = new THREE.Clock();
        sceneRef.current = { scene, camera, clock, coreGroup, coreMesh, cageMesh, gridMat };

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

        // Pause animation when tab is hidden to save CPU
        const onVisibilityChange = () => {
            if (document.hidden) {
                renderer.setAnimationLoop(null);
            } else {
                startLoop();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        startLoop();

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            renderer.setAnimationLoop(null);
        };
    }, []);



    return <div ref={containerRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0" />;
});

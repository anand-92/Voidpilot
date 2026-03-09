import type { SVGProps } from "react";
import { motion } from "framer-motion";

export function GeminiLiveLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Gem Faces with low opacity fills for 3D depth */}
      <motion.path
        d="M 6 4 L 14 4 L 10 10 Z"
        fill="currentColor"
        fillOpacity="0.1"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.path
        d="M 6 4 L 2 10 L 10 10 Z"
        fill="currentColor"
        fillOpacity="0.04"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
      />
      <motion.path
        d="M 14 4 L 18 10 L 10 10 Z"
        fill="currentColor"
        fillOpacity="0.04"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      />
      <motion.path
        d="M 2 10 L 10 22 L 10 10 Z"
        fill="currentColor"
        fillOpacity="0.08"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
      />
      <motion.path
        d="M 18 10 L 10 22 L 10 10 Z"
        fill="currentColor"
        fillOpacity="0.12"
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      />

      {/* Gem Wireframe Outlines */}
      <motion.path
        d="M 6 4 L 14 4 L 18 10 L 10 22 L 2 10 Z"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      <motion.path
        d="M 2 10 L 18 10"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
      />

      {/* Animated Broadcast Arcs */}
      <motion.path
        d="M 22 7 A 6 6 0 0 1 22 17"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.path
        d="M 26 4 A 10 10 0 0 1 26 20"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
    </motion.svg>
  );
}

export function IconOverviewOrbit(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="3"
        fill="currentColor"
        fillOpacity="0.1"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <g transform="rotate(-24 12 12)">
        <path
          d="M 3 12 A 9 4 0 1 1 21 12 A 9 4 0 1 1 3 12"
          strokeDasharray="2 4"
          strokeOpacity="0.4"
        />
        <circle r="1.5" fill="currentColor" stroke="none">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M 3 12 A 9 4 0 1 1 21 12 A 9 4 0 1 1 3 12"
          />
        </circle>
        <circle r="1" fill="currentColor" fillOpacity="0.5" stroke="none">
          <animateMotion
            dur="6s"
            repeatCount="indefinite"
            path="M 3 12 A 9 4 0 1 1 21 12 A 9 4 0 1 1 3 12"
          />
        </circle>
      </g>
    </motion.svg>
  );
}

export function IconCapabilitiesConverge(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Input Paths */}
      <path d="M 2 4 C 7 4 8 12 11 12" strokeOpacity="0.3" />
      <path d="M 2 12 L 11 12" strokeOpacity="0.3" />
      <path d="M 2 20 C 7 20 8 12 11 12" strokeOpacity="0.3" />

      {/* Converging Particles */}
      <circle r="1" fill="currentColor" stroke="none">
        <animateMotion dur="2s" repeatCount="indefinite" path="M 2 4 C 7 4 8 12 11 12" />
      </circle>
      <circle r="1" fill="currentColor" stroke="none">
        <animateMotion dur="2s" repeatCount="indefinite" begin="-0.6s" path="M 2 12 L 11 12" />
      </circle>
      <circle r="1" fill="currentColor" stroke="none">
        <animateMotion dur="2s" repeatCount="indefinite" begin="-1.2s" path="M 2 20 C 7 20 8 12 11 12" />
      </circle>

      {/* Central Node */}
      <motion.circle
        cx="11"
        cy="12"
        r="2"
        fill="currentColor"
        fillOpacity="0.2"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Output Beam & Arrow */}
      <motion.path
        d="M 13 12 L 22 12"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M 19 9 L 22 12 L 19 15"
        animate={{ x: [0, 2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function IconHackathonLaunch(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Rocket Body */}
      <motion.path
        d="M 12 2 L 15 8 L 15 14 L 9 14 L 9 8 Z"
        fill="currentColor"
        fillOpacity="0.05"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      {/* Fins */}
      <motion.path
        d="M 9 12 L 4 16 L 9 14 Z"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      />
      <motion.path
        d="M 15 12 L 20 16 L 15 14 Z"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      />
      {/* Window */}
      <motion.circle
        cx="12"
        cy="8"
        r="1.5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
      />
      {/* Exhaust Flames */}
      <motion.path
        d="M 10 14 L 12 20 L 14 14 Z"
        fill="currentColor"
        fillOpacity="0.2"
        style={{ originX: "12px", originY: "14px" }}
        animate={{ scaleY: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Sparks */}
      <motion.circle
        cx="12"
        cy="20"
        r="0.5"
        fill="currentColor"
        stroke="none"
        animate={{ y: [0, 6], opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.circle
        cx="12"
        cy="20"
        r="0.5"
        fill="currentColor"
        stroke="none"
        animate={{ y: [0, 5], x: [0, 3], opacity: [1, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
      />
      <motion.circle
        cx="12"
        cy="20"
        r="0.5"
        fill="currentColor"
        stroke="none"
        animate={{ y: [0, 5], x: [0, -3], opacity: [1, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
      />
    </motion.svg>
  );
}

export function IconVoiceWaveform(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Outer Waveforms */}
      <motion.path
        animate={{ d: ["M 3 12 C 7 4 17 4 21 12", "M 3 12 C 7 10 17 10 21 12", "M 3 12 C 7 4 17 4 21 12"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        animate={{ d: ["M 3 12 C 7 20 17 20 21 12", "M 3 12 C 7 14 17 14 21 12", "M 3 12 C 7 20 17 20 21 12"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Inner Waveforms */}
      <motion.path
        animate={{ d: ["M 6 12 C 9 7 15 7 18 12", "M 6 12 C 9 11 15 11 18 12", "M 6 12 C 9 7 15 7 18 12"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        strokeOpacity="0.5"
      />
      <motion.path
        animate={{ d: ["M 6 12 C 9 17 15 17 18 12", "M 6 12 C 9 13 15 13 18 12", "M 6 12 C 9 17 15 17 18 12"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        strokeOpacity="0.5"
      />

      {/* Central Source Dot */}
      <motion.circle
        cx="12"
        cy="12"
        r="1.5"
        fill="currentColor"
        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function IconScene3D(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Dashed Depth Lines (Back) */}
      <motion.path
        animate={{ d: ["M 12 4 L 12 11", "M 12 7 L 12 11", "M 12 4 L 12 11"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        strokeDasharray="2 3"
        strokeOpacity="0.5"
      />
      <path d="M 20 18 L 12 11" strokeDasharray="2 3" strokeOpacity="0.5" />
      <path d="M 4 18 L 12 11" strokeDasharray="2 3" strokeOpacity="0.5" />

      {/* Front Face Triangle */}
      <motion.path
        animate={{ d: ["M 12 4 L 20 18 L 4 18 Z", "M 12 7 L 20 18 L 4 18 Z", "M 12 4 L 20 18 L 4 18 Z"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        fill="currentColor"
        fillOpacity="0.05"
      />

      {/* Back Vertex Dot */}
      <motion.circle
        cx="12"
        cy="11"
        r="1.5"
        fill="currentColor"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function IconIterationLoop(props: SVGProps<SVGSVGElement>) {
  const infinityPath = "M 12 12 C 17 5 22 5 22 12 C 22 19 17 19 12 12 C 7 5 2 5 2 12 C 2 19 7 19 12 12 Z";
  
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Infinity Path */}
      <motion.path
        d={infinityPath}
        strokeOpacity="0.3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      {/* Racing Particles */}
      <circle r="1.5" fill="currentColor" stroke="none">
        <animateMotion dur="3s" repeatCount="indefinite" path={infinityPath} />
      </circle>
      <circle r="1" fill="currentColor" fillOpacity="0.4" stroke="none">
        <animateMotion dur="3s" repeatCount="indefinite" begin="-0.3s" path={infinityPath} />
      </circle>
    </motion.svg>
  );
}

export function IconLiveAgent(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Synapse Lines */}
      <path d="M 9.17 9.17 L 5 5" strokeOpacity="0.4" />
      <path d="M 14.83 9.17 L 19 5" strokeOpacity="0.4" />
      <path d="M 9.17 14.83 L 5 19" strokeOpacity="0.4" />
      <path d="M 14.83 14.83 L 19 19" strokeOpacity="0.4" />

      {/* Firing Particles along synapses */}
      <circle r="1" fill="currentColor" stroke="none">
        <animateMotion dur="1.5s" repeatCount="indefinite" path="M 9.17 9.17 L 5 5" />
      </circle>
      <circle r="1" fill="currentColor" stroke="none">
        <animateMotion dur="1.5s" repeatCount="indefinite" begin="-0.75s" path="M 14.83 14.83 L 19 19" />
      </circle>

      {/* Corner Nodes */}
      <motion.circle cx="5" cy="5" r="1.5" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
      <motion.circle cx="19" cy="5" r="1.5" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
      <motion.circle cx="5" cy="19" r="1.5" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
      <motion.circle cx="19" cy="19" r="1.5" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }} />

      {/* Central Brain/Node */}
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.1" />
      <motion.circle
        cx="12"
        cy="12"
        r="1.5"
        fill="currentColor"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function IconStoryteller(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Fanned out multimedia cards */}
      <motion.rect
        x="6" y="6" width="10" height="13" rx="1"
        fill="currentColor" fillOpacity="0.05"
        style={{ originX: "11px", originY: "19px" }}
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: -15, opacity: 0.5 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.rect
        x="6" y="6" width="10" height="13" rx="1"
        fill="currentColor" fillOpacity="0.05"
        style={{ originX: "11px", originY: "19px" }}
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: -7.5, opacity: 0.8 }}
        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
      />
      <motion.rect
        x="6" y="6" width="10" height="13" rx="1"
        fill="currentColor" fillOpacity="0.1"
        style={{ originX: "11px", originY: "19px" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      />

      {/* Play Button on front card */}
      <motion.path
        d="M 9.5 10 L 13.5 12.5 L 9.5 15 Z"
        fill="currentColor"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Twinkling Sparkle */}
      <motion.path
        d="M 21 2 Q 21 5 18 5 Q 21 5 21 8 Q 21 5 24 5 Q 21 5 21 2 Z"
        fill="currentColor"
        stroke="none"
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5], rotate: [0, 15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function IconUINavigator(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Trailing Dotted Path */}
      <path d="M 2 19 Q 4 15 6 15" strokeDasharray="1 3" strokeOpacity="0.5" />

      {/* Target Reticle */}
      <motion.g
        style={{ originX: "18px", originY: "6px" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="18" cy="6" r="3" strokeDasharray="2 2" />
      </motion.g>

      {/* Reticle Crosshairs */}
      <motion.g
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M 18 1 L 18 3" />
        <path d="M 18 9 L 18 11" />
        <path d="M 13 6 L 15 6" />
        <path d="M 21 6 L 23 6" />
      </motion.g>

      {/* AI Cursor */}
      <motion.path
        d="M 6 15 L 6 5 L 14 9 L 10 10 Z"
        fill="currentColor"
        fillOpacity="0.2"
        initial={{ x: -8, y: 8, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ duration: 1, type: "spring", bounce: 0.4 }}
      />
    </motion.svg>
  );
}

export function CustomIconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <motion.g
        animate={{ y: [0, 2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M 12 4 L 12 16" />
        <path d="M 7 11 L 12 16 L 17 11" />
      </motion.g>
      <path d="M 6 20 L 18 20" />
    </motion.svg>
  );
}

export function CustomIconTrophy(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M 8 4 L 16 4" />
      <path d="M 7 4 L 17 4 L 16 11 C 16 13 14 15 12 15 C 10 15 8 13 8 11 Z" fill="currentColor" fillOpacity="0.05" />
      <path d="M 12 15 L 12 19" />
      <path d="M 9 19 L 15 19" />
      <path d="M 7 5 C 4 5 4 9 7 9" />
      <path d="M 17 5 C 20 5 20 9 17 9" />
    </motion.svg>
  );
}

export function IconWalkthroughVoid(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Outer ring */}
      <motion.circle
        cx="12" cy="12" r="10"
        strokeDasharray="4 4"
        strokeOpacity="0.3"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{ originX: "12px", originY: "12px" }}
      />
      {/* Middle ring */}
      <motion.circle
        cx="12" cy="12" r="6"
        strokeDasharray="3 3"
        animate={{ rotate: -360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{ originX: "12px", originY: "12px" }}
      />
      {/* Inner pulse */}
      <motion.circle
        cx="12" cy="12" r="3"
        fill="currentColor"
        fillOpacity="0.15"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Core dot */}
      <motion.circle
        cx="12" cy="12" r="1.5"
        fill="currentColor"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function IconBrainstorm(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      {/* Brain outline */}
      <motion.path
        d="M 12 2 C 8 2 5 5 5 8 C 5 10 6 11.5 7 12.5 C 6 13.5 5 15 5 17 C 5 20 8 22 12 22 C 16 22 19 20 19 17 C 19 15 18 13.5 17 12.5 C 18 11.5 19 10 19 8 C 19 5 16 2 12 2 Z"
        fill="currentColor"
        fillOpacity="0.08"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      {/* Brain center line */}
      <motion.path
        d="M 12 4 L 12 20"
        strokeOpacity="0.3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      {/* Left folds */}
      <motion.path
        d="M 12 8 C 10 8 8 7 7 8"
        strokeOpacity="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      />
      <motion.path
        d="M 12 14 C 10 14 8 13 6 14"
        strokeOpacity="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      />
      {/* Right folds */}
      <motion.path
        d="M 12 8 C 14 8 16 7 17 8"
        strokeOpacity="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      />
      <motion.path
        d="M 12 14 C 14 14 16 13 18 14"
        strokeOpacity="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      />
      {/* Idea sparks */}
      <motion.circle
        cx="6"
        cy="3"
        r="1"
        fill="currentColor"
        stroke="none"
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="18"
        cy="3"
        r="1"
        fill="currentColor"
        stroke="none"
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.circle
        cx="12"
        cy="1"
        r="0.8"
        fill="currentColor"
        stroke="none"
        animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
    </motion.svg>
  );
}

export function CustomIconCode(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M 9 8 L 5 12 L 9 16" />
      <path d="M 15 8 L 19 12 L 15 16" />
      <path d="M 14 4 L 10 20" strokeOpacity="0.5" />
    </motion.svg>
  );
}

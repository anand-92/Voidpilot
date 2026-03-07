import type { SVGProps } from "react";
import { motion } from "framer-motion";

export function GeminiShield(props: SVGProps<SVGSVGElement>) {
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
      {/* Outer shield */}
      <motion.path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner glowing shield */}
      <motion.path
        d="M12 17.5s4.5-2 4.5-6.5V7l-4.5-1.5L7.5 7v4c0 4.5 4.5 6.5 4.5 6.5z"
        animate={{ opacity: [0.1, 0.6, 0.1], scale: [0.95, 1, 0.95] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "center" }}
      />
    </motion.svg>
  );
}

export function GeminiClose(props: SVGProps<SVGSVGElement>) {
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
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: "center" }}
      >
        <motion.path
          d="M6 6l12 12"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.path
          d="M18 6L6 18"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        />
      </motion.g>
    </motion.svg>
  );
}

export function GeminiTerminal(props: SVGProps<SVGSVGElement>) {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9l3 3-3 3" />
      <motion.path
        d="M11 15h4"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
    </motion.svg>
  );
}

export function GeminiCheck(props: SVGProps<SVGSVGElement>) {
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
        r="9"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.path
        d="M8 12l3 3 5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

export function GeminiStar(props: SVGProps<SVGSVGElement>) {
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
      <motion.path
        d="M12 2 C 12 7, 17 12, 22 12 C 17 12, 12 17, 12 22 C 12 17, 7 12, 2 12 C 7 12, 12 7, 12 2 Z"
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "center" }}
      />
      <motion.path
        d="M5 3 C 5 4, 6 5, 7 5 C 6 5, 5 6, 5 7 C 5 6, 4 5, 3 5 C 4 5, 5 4, 5 3 Z"
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        style={{ transformOrigin: "5px 5px" }}
      />
      <motion.path
        d="M19 17 C 19 18, 20 19, 21 19 C 20 19, 19 20, 19 21 C 19 20, 18 19, 17 19 C 18 19, 19 18, 19 17 Z"
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ transformOrigin: "19px 19px" }}
      />
    </motion.svg>
  );
}

export function GeminiIrisOpen(props: SVGProps<SVGSVGElement>) {
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
      <path d="M2 12 C 7 5, 17 5, 22 12 C 17 19, 7 19, 2 12 Z" />
      <circle cx="12" cy="12" r="3" />
      <motion.circle
        cx="12"
        cy="12"
        r="1"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "center" }}
      />
    </motion.svg>
  );
}

export function GeminiIrisClosed(props: SVGProps<SVGSVGElement>) {
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
      <path d="M2 12 C 7 19, 17 19, 22 12" />
      <path d="M2 12h20" />
      <path d="M3 3l18 18" opacity="0.4" />
      <path d="M7 15l-1 3 M12 16v3 M17 15l1 3" />
    </motion.svg>
  );
}

export function GeminiDisplay(props: SVGProps<SVGSVGElement>) {
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
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 22h8 M12 18v4" />
      <motion.line
        x1="4"
        x2="20"
        y1="5"
        y2="5"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
        animate={{ y1: [5, 17, 5], y2: [5, 17, 5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </motion.svg>
  );
}

export function GeminiCaret(props: SVGProps<SVGSVGElement>) {
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
      <motion.path
        d="M6 9l6 6 6-6"
        animate={{ y: [0, 3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function GeminiReticle(props: SVGProps<SVGSVGElement>) {
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
        r="8"
        strokeDasharray="4 6"
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "center" }}
      />
      <path d="M12 6v-2 M12 20v-2 M6 12H4 M20 12h-2" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </motion.svg>
  );
}

export function GeminiCrop(props: SVGProps<SVGSVGElement>) {
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
      <path d="M2 6V2h4 M22 6V2h-4 M2 18v4h4 M22 18v4h-4" />
      <motion.rect
        x="5"
        y="5"
        width="14"
        height="14"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, -16] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </motion.svg>
  );
}

export function GeminiWand(props: SVGProps<SVGSVGElement>) {
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
      <path d="M5 19L16 8 M3 21l3-3" />
      <motion.path
        d="M17 3 L17.5 4.5 L19 5 L17.5 5.5 L17 7 L16.5 5.5 L15 5 L16.5 4.5 Z"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "17px 5px" }}
      />
      <motion.path
        d="M21 9 L21.5 10 L23 10.5 L21.5 11 L21 12.5 L20.5 11 L19 10.5 L20.5 10 Z"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        style={{ transformOrigin: "21px 10.5px" }}
      />
      <motion.path
        d="M11 4 L11.5 5 L13 5.5 L11.5 6 L11 7.5 L10.5 6 L9 5.5 L10.5 5 Z"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ transformOrigin: "11px 5.5px" }}
      />
    </motion.svg>
  );
}

export function GeminiPulse(props: SVGProps<SVGSVGElement>) {
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
      <motion.path
        d="M2 12h4l2.5-5 3 10 3-10 2.5 5h5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
      />
    </motion.svg>
  );
}

export function GeminiBroadcast(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="18" r="1" fill="currentColor" />
      <motion.path
        d="M9 14a4 4 0 0 1 6 0"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
      />
      <motion.path
        d="M6 10a9 9 0 0 1 12 0"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.path
        d="M3 6a14 14 0 0 1 18 0"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
      />
    </motion.svg>
  );
}

export function GeminiBolt(props: SVGProps<SVGSVGElement>) {
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
      <motion.path
        d="M13 2L3 14h9l-2 8 11-12h-9l2-8z"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M13 2L3 14h9l-2 8 11-12h-9l2-8z"
        strokeWidth="4"
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(4px)" }}
      />
    </motion.svg>
  );
}

export function GeminiMicOn(props: SVGProps<SVGSVGElement>) {
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
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M12 18v4 M8 22h8" />
      <motion.path
        d="M19 10v2a7 7 0 0 1-14 0v-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M22 10v2a10 10 0 0 1-20 0v-2"
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
    </motion.svg>
  );
}

export function GeminiMicOff(props: SVGProps<SVGSVGElement>) {
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
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 18v4 M8 22h8" />
      <path d="M3 3l18 18" strokeWidth="1.5" opacity="0.6" />
    </motion.svg>
  );
}

export function GeminiChat(props: SVGProps<SVGSVGElement>) {
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
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <motion.circle
        cx="8"
        cy="12"
        r="1"
        fill="currentColor"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="1"
        fill="currentColor"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.circle
        cx="16"
        cy="12"
        r="1"
        fill="currentColor"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </motion.svg>
  );
}

export function GeminiSend(props: SVGProps<SVGSVGElement>) {
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
        animate={{ x: [0, 3, 0], y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
      </motion.g>
    </motion.svg>
  );
}

export function GeminiArrowRight(props: SVGProps<SVGSVGElement>) {
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
      <motion.path
        d="M5 12h14 M12 5l7 7-7 7"
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function GeminiArrowLeft(props: SVGProps<SVGSVGElement>) {
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
      <motion.path
        d="M19 12H5 M12 19l-7-7 7-7"
        animate={{ x: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

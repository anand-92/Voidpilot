import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface DropDownSignProps {
  show: boolean
  onComplete?: () => void
}

export function DropDownSign({ show, onComplete }: DropDownSignProps) {
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Auto-dismiss: when sign becomes visible, schedule its exit after 2.5s
  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => {
      onCompleteRef.current?.()
    }, 2500)
    return () => clearTimeout(timer)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: "-100%", rotateX: -45, opacity: 0 }}
          animate={{
            y: "0%",
            rotateX: [0, 15, -10, 5, 0],
            opacity: 1,
            transition: {
              y: { type: "spring", stiffness: 150, damping: 12 },
              rotateX: { duration: 1.5, ease: "easeOut" }
            }
          }}
          exit={{
            y: "-120%",
            opacity: 0,
            transition: { duration: 0.6, ease: "easeInOut" }
          }}
          className="pointer-events-none fixed left-1/2 top-4 z-[100] -translate-x-1/2 origin-top"
          style={{ perspective: "1000px" }}
        >
          {/* CSS hinge chains */}
          <div className="absolute -top-3 left-[30%] h-3 w-1 bg-stone-600 rounded-sm" />
          <div className="absolute -top-3 left-[70%] h-3 w-1 bg-stone-600 rounded-sm" />

          <div className="relative overflow-visible">
            {/* Neon glow behind */}
            <div className="absolute inset-0 bg-blue-500/25 blur-[50px] mix-blend-screen rounded-2xl" />

            <img
              src="/assets/brainstorm/entry-sign.png"
              alt="Logging in now. The room is open! Agents Active"
              className="relative z-10 w-[380px] md:w-[480px] max-w-[90vw] object-contain"
              style={{ filter: "drop-shadow(0 0 18px rgba(59, 130, 246, 0.5))" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

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
              rotateX: { duration: 1.5, ease: "easeOut" },
            },
          }}
          exit={{
            y: "-120%",
            opacity: 0,
            transition: { duration: 0.6, ease: "easeInOut" },
          }}
          className="pointer-events-none fixed left-1/2 top-4 z-[100] -translate-x-1/2 origin-top"
          style={{ perspective: "1000px" }}
        >
          <div className="relative w-[340px] md:w-[440px] max-w-[90vw]">
            {/* Outer neon glow */}
            <div
              className="absolute -inset-3 rounded-lg opacity-40 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(34,211,238,0.5) 0%, transparent 70%)",
              }}
            />

            {/* Pixel-art wooden frame */}
            <div
              className="relative rounded-sm"
              style={{
                border: "4px solid #8B6914",
                boxShadow:
                  "inset 0 0 0 2px #5C4200, inset 0 0 0 4px #3D2B00, 0 0 0 2px #3D2B00, 4px 4px 0 0 #2A1D00, -4px 4px 0 0 #2A1D00",
                imageRendering: "pixelated",
              }}
            >
              {/* Neon bar at top */}
              <div
                className="h-2 w-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 5%, #22d3ee 15%, #67e8f9 50%, #22d3ee 85%, transparent 95%)",
                  boxShadow:
                    "0 0 12px 4px rgba(34,211,238,0.6), 0 0 30px 8px rgba(34,211,238,0.25)",
                }}
              />

              {/* Inner dark panel */}
              <div className="bg-[#1a0f0a] px-4 py-3 md:px-5 md:py-4">
                <div className="flex items-start gap-3">
                  {/* Toast mascot */}
                  <img
                    src="/assets/brainstorm/toast-mascot.png"
                    alt=""
                    className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 mt-0.5"
                    style={{
                      imageRendering: "pixelated",
                      filter: "drop-shadow(0 0 6px rgba(34,211,238,0.3))",
                    }}
                  />

                  {/* Text content */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <p
                      className="font-mono font-bold text-sm md:text-base leading-tight tracking-wide uppercase"
                      style={{
                        color: "#22d3ee",
                        textShadow:
                          "0 0 8px rgba(34,211,238,0.9), 0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.25)",
                      }}
                    >
                      Logging in now.
                      <br />
                      The room is open!
                    </p>

                    {/* AGENTS ACTIVE badge */}
                    <span
                      className="font-mono text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mt-1 self-start px-2 py-0.5 rounded-sm"
                      style={{
                        color: "#a5f3fc",
                        background: "rgba(34,211,238,0.1)",
                        border: "1px solid rgba(34,211,238,0.25)",
                        textShadow:
                          "0 0 6px rgba(34,211,238,0.7), 0 0 12px rgba(34,211,238,0.3)",
                      }}
                    >
                      Agents Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom frame accent */}
              <div
                className="h-1 w-full"
                style={{
                  background:
                    "linear-gradient(90deg, #5C4200, #8B6914, #5C4200)",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

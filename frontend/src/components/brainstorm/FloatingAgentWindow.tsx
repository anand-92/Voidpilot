import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Minus, Maximize2, Minimize2, GripHorizontal } from 'lucide-react'
import { AgentVisualizer, IMG_W, IMG_H } from './AgentVisualizer'

interface FloatingAgentWindowProps {
  intensityRef: React.MutableRefObject<number>
  isGenerating: boolean
  isConnected: boolean
}

const ROOM_ASPECT = IMG_W / IMG_H
const TITLE_BAR_H = 28
const WIDTH_PRESETS = [300, 440, 600, 800] as const
type SizeIndex = 0 | 1 | 2 | 3

export function FloatingAgentWindow({
  intensityRef,
  isGenerating,
  isConnected,
}: FloatingAgentWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [sizeIdx, setSizeIdx] = useState<SizeIndex>(0)
  const constraintRef = useRef<HTMLDivElement>(null)

  const w = WIDTH_PRESETS[sizeIdx]
  const canvasH = Math.round(w / ROOM_ASPECT)
  const totalH = canvasH + TITLE_BAR_H

  return (
    <>
      <div ref={constraintRef} className="pointer-events-none fixed inset-0 z-[45]" />

      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={constraintRef}
        dragElastic={0}
        initial={{ x: 16, y: 16 }}
        className="fixed z-[45] select-none"
        style={{ touchAction: 'none' }}
      >
        {isMinimized ? (
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/70 px-3 py-2 shadow-2xl backdrop-blur-2xl transition-colors hover:border-orange-500/30"
          >
            <Maximize2 className="size-3.5 text-orange-400" />
            <span className="text-xs font-medium text-stone-300">Agents</span>
          </button>
        ) : (
          <div
            className="overflow-hidden rounded-2xl shadow-2xl"
            style={{ width: w, height: totalH }}
          >
            {/* Title bar */}
            <div
              className="flex shrink-0 items-center justify-between bg-white/[0.03] px-2"
              style={{ height: TITLE_BAR_H }}
            >
              <div className="flex items-center gap-1.5">
                <GripHorizontal className="size-3 text-stone-600" />
                <span className="text-[10px] font-medium tracking-wide text-stone-500 uppercase">Agents</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setSizeIdx(((sizeIdx + 1) % WIDTH_PRESETS.length) as SizeIndex)}
                  className="flex size-5 items-center justify-center rounded transition-colors hover:bg-white/[0.08]"
                  aria-label="Cycle size"
                >
                  {sizeIdx === WIDTH_PRESETS.length - 1 ? (
                    <Minimize2 className="size-2.5 text-stone-500" />
                  ) : (
                    <Maximize2 className="size-2.5 text-stone-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="flex size-5 items-center justify-center rounded transition-colors hover:bg-white/[0.08]"
                  aria-label="Minimize"
                >
                  <Minus className="size-2.5 text-stone-500" />
                </button>
              </div>
            </div>

            {/* Canvas — exact room aspect ratio, zero gaps */}
            <AgentVisualizer
              intensityRef={intensityRef}
              isGenerating={isGenerating}
              isConnected={isConnected}
              className="block w-full"
              style={{ width: w, height: canvasH }}
            />
          </div>
        )}
      </motion.div>
    </>
  )
}

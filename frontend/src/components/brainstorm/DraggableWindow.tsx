import { useState, type ReactNode } from 'react'
import { Rnd } from 'react-rnd'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DraggableWindowProps {
  title: string
  children: ReactNode
  defaultState: { x: number; y: number; w: number | string; h: number | string }
  isMinimized: boolean
  isMaximized: boolean
  onMinimize: () => void
  onMaximize: () => void
  onRestore: () => void
  zIndex: number
  onFocus: () => void
  maxWidth?: number
  maxHeight?: number
  lockAspectRatio?: number | boolean
}

const resizeHandleClasses = {
  bottomRight: "absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all rounded-br-2xl",
  bottomLeft: "absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all rounded-bl-2xl",
  topRight: "absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all rounded-tr-2xl",
  topLeft: "absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all rounded-tl-2xl",
  top: "absolute top-0 left-4 right-4 h-1.5 cursor-n-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all",
  bottom: "absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all",
  left: "absolute top-4 bottom-4 left-0 w-1.5 cursor-w-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all",
  right: "absolute top-4 bottom-4 right-0 w-1.5 cursor-e-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] transition-all"
}

export function DraggableWindow({
  title,
  children,
  defaultState,
  isMinimized,
  isMaximized,
  onMinimize,
  onMaximize,
  onRestore,
  zIndex,
  onFocus,
  maxWidth,
  maxHeight,
  lockAspectRatio,
}: DraggableWindowProps) {
  const [pos, setPos] = useState({ x: defaultState.x, y: defaultState.y })
  const [size, setSize] = useState({ width: defaultState.w, height: defaultState.h })
  const [savedPos, setSavedPos] = useState({ x: defaultState.x, y: defaultState.y })
  const [savedSize, setSavedSize] = useState({ width: defaultState.w, height: defaultState.h })
  const [isHoveringHeader, setIsHoveringHeader] = useState(false)

  const handleMaximize = () => {
    if (!isMaximized) {
      setSavedPos(pos)
      setSavedSize(size)
      onMaximize()
    }
  }

  const handleRestore = () => {
    setPos(savedPos)
    setSize(savedSize)
    onRestore()
  }
  
  if (isMinimized) {
    return null
  }

  const clampPosition = (x: number, y: number, w: number, h: number) => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 9999
    const vh = typeof window !== 'undefined' ? window.innerHeight : 9999
    return {
      x: Math.max(0, Math.min(x, vw - w)),
      y: Math.max(0, Math.min(y, vh - h)),
    }
  }

  return (
    <Rnd
      size={isMaximized ? { width: '100%', height: '100%' } : size}
      position={isMaximized ? { x: 0, y: 0 } : pos}
      onDragStart={onFocus}
      onDrag={(_e, d) => {
        if (isMaximized) return
        const el = d.node
        const w = el.offsetWidth
        const h = el.offsetHeight
        const clamped = clampPosition(d.x, d.y, w, h)
        setPos(clamped)
      }}
      onDragStop={(_e, d) => {
        if (isMaximized) return
        const el = d.node
        const w = el.offsetWidth
        const h = el.offsetHeight
        setPos(clampPosition(d.x, d.y, w, h))
      }}
      onResizeStart={onFocus}
      onResize={(_e, _direction, ref, _delta, position) => {
        if (!isMaximized) {
          setSize({ width: ref.style.width, height: ref.style.height })
          setPos(position)
        }
      }}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      minWidth={200}
      minHeight={120}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      lockAspectRatio={lockAspectRatio}
      resizeHandleClasses={resizeHandleClasses}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl bg-black/80 backdrop-blur-2xl transition-all duration-300 border",
        isHoveringHeader 
          ? "border-amber-500/50 shadow-[0_0_25px_rgba(59,130,246,0.35)]" 
          : "border-blue-600/40 shadow-[0_0_20px_rgba(37,99,235,0.25)]",
        "focus-within:border-orange-500/50 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
      )}
      style={{ zIndex }}
      onMouseDown={onFocus}
      dragHandleClassName="drag-handle"
    >
      {/* Title bar */}
      <div
        className="drag-handle relative flex shrink-0 items-center justify-between bg-white/[0.03] px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-white/[0.06] transition-colors"
        onMouseEnter={() => setIsHoveringHeader(true)}
        onMouseLeave={() => setIsHoveringHeader(false)}
      >
        <div className="flex items-center gap-2 z-10 w-8">
          {/* Left spacer to balance the buttons on the right so it stays perfectly centered */}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold tracking-widest text-stone-400 uppercase font-mono">{title}</span>
        </div>
        <div className="flex items-center gap-1 z-10">
          <button
            type="button"
            onClick={isMaximized ? handleRestore : handleMaximize}
            className="flex size-6 items-center justify-center rounded transition-colors hover:bg-white/[0.1] border border-transparent hover:border-white/[0.1]"
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Plus className="size-3 text-stone-300" style={{ shapeRendering: 'crispEdges' }} />
          </button>
          <button
            type="button"
            onClick={isMaximized ? handleRestore : onMinimize}
            className="flex size-6 items-center justify-center rounded transition-colors hover:bg-white/[0.1] border border-transparent hover:border-white/[0.1]"
            aria-label={isMaximized ? 'Restore' : 'Minimize'}
          >
            <Minus className="size-3 text-stone-300" style={{ shapeRendering: 'crispEdges' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {children}
      </div>
    </Rnd>
  )
}


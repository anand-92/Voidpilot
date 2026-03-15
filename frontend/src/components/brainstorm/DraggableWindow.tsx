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
  bounds?: string
}

const resizeHandleClasses = {
  bottomRight: "absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all rounded-br-2xl",
  bottomLeft: "absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all rounded-bl-2xl",
  topRight: "absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all rounded-tr-2xl",
  topLeft: "absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all rounded-tl-2xl",
  top: "absolute top-0 left-4 right-4 h-1.5 cursor-n-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all",
  bottom: "absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all",
  left: "absolute top-4 bottom-4 left-0 w-1.5 cursor-w-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all",
  right: "absolute top-4 bottom-4 right-0 w-1.5 cursor-e-resize hover:bg-orange-500/50 hover:shadow-[0_0_8px_2px_rgba(249,115,22,0.5)] transition-all"
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
  bounds = "parent"
}: DraggableWindowProps) {
  const [pos, setPos] = useState({ x: defaultState.x, y: defaultState.y })
  const [size, setSize] = useState({ width: defaultState.w, height: defaultState.h })
  const [isHoveringHeader, setIsHoveringHeader] = useState(false)
  
  if (isMinimized) {
    return null // Rendered elsewhere in a minimized stack
  }

  return (
    <Rnd
      bounds={bounds}
      size={isMaximized ? { width: '100%', height: '100%' } : size}
      position={isMaximized ? { x: 0, y: 0 } : pos}
      onDragStart={onFocus}
      onDragStop={(_e, d) => {
        if (!isMaximized) setPos({ x: d.x, y: d.y })
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
      resizeHandleClasses={resizeHandleClasses}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl bg-black/80 backdrop-blur-2xl transition-all duration-300 border",
        isHoveringHeader 
          ? "border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.35)]" 
          : "border-blue-600/40 shadow-[0_0_20px_rgba(37,99,235,0.25)]",
        "focus-within:border-orange-500/50 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.2)]"
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
            onClick={isMaximized ? onRestore : onMaximize}
            className="flex size-6 items-center justify-center rounded transition-colors hover:bg-white/[0.1] border border-transparent hover:border-white/[0.1]"
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Plus className="size-3 text-stone-300" style={{ shapeRendering: 'crispEdges' }} />
          </button>
          <button
            type="button"
            onClick={isMaximized ? onRestore : onMinimize}
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


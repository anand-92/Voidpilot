import { useEffect, useRef } from 'react'
import { getCachedSprite } from './pixelOffice/spriteCache'
import { DESK_SPRITE, CHAIR_SPRITE, PC_SPRITE, PLANT_SPRITE } from './pixelOffice/spriteData'
import type { FurnitureInstance } from './pixelOffice/types'
import { TILE_SIZE } from './pixelOffice/types'

interface AgentVisualizerProps {
  intensityRef: React.MutableRefObject<number>
  isGenerating: boolean
  isConnected: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Spritesheet layout (sneaky-toast-spritesheet.png) ───────
// Row 0: IDLE — 3 frames    (y=0)
// Row 1: WALK — 8 frames    (y=16)
// Row 2: HIDE — 12 frames   (y=32)
// Row 3: HIDDEN — 4 frames  (y=48)
const FRAME_SIZE = 16
const ANIMS = {
  idle: { row: 0, frames: 4, speed: 0.35 },
  walk: { row: 1, frames: 8, speed: 0.12 },
  hide: { row: 2, frames: 15, speed: 0.08 },
  hidden: { row: 3, frames: 4, speed: 0.3 },
} as const
type AnimKey = keyof typeof ANIMS

const ZOOM = 5
const COLS = 10
const ROWS = 6

interface ToastAgent {
  name: string
  label: string
  color: string
  anim: AnimKey
  frame: number
  frameTimer: number
  x: number
  y: number
  targetX: number
  targetY: number
  facingRight: boolean
  seatX: number
  seatY: number
  isActive: boolean
  wanderTimer: number
}

function createAgent(name: string, label: string, color: string, seatCol: number, seatRow: number): ToastAgent {
  const sx = seatCol * TILE_SIZE + TILE_SIZE / 2
  const sy = seatRow * TILE_SIZE + TILE_SIZE / 2
  return {
    name, label, color,
    anim: 'idle', frame: 0, frameTimer: 0,
    x: sx, y: sy, targetX: sx, targetY: sy,
    facingRight: true,
    seatX: sx, seatY: sy,
    isActive: false,
    wanderTimer: 2 + Math.random() * 3,
  }
}

function createFurniture(): FurnitureInstance[] {
  return [
    // Left desk + chair + PC
    { sprite: DESK_SPRITE, x: 1 * TILE_SIZE, y: 1 * TILE_SIZE, zY: 3 * TILE_SIZE },
    { sprite: CHAIR_SPRITE, x: 2 * TILE_SIZE, y: 3 * TILE_SIZE, zY: 3.5 * TILE_SIZE },
    { sprite: PC_SPRITE, x: 1 * TILE_SIZE, y: 0.5 * TILE_SIZE, zY: 1 * TILE_SIZE },
    // Right desk + chair + PC
    { sprite: DESK_SPRITE, x: 6 * TILE_SIZE, y: 1 * TILE_SIZE, zY: 3 * TILE_SIZE },
    { sprite: CHAIR_SPRITE, x: 7 * TILE_SIZE, y: 3 * TILE_SIZE, zY: 3.5 * TILE_SIZE },
    { sprite: PC_SPRITE, x: 6 * TILE_SIZE, y: 0.5 * TILE_SIZE, zY: 1 * TILE_SIZE },
    // Plants
    { sprite: PLANT_SPRITE, x: 0, y: 3 * TILE_SIZE, zY: 4.5 * TILE_SIZE },
    { sprite: PLANT_SPRITE, x: 9 * TILE_SIZE, y: 3 * TILE_SIZE, zY: 4.5 * TILE_SIZE },
    { sprite: PLANT_SPRITE, x: 4.5 * TILE_SIZE, y: 0, zY: 1.5 * TILE_SIZE },
  ]
}

export function AgentVisualizer({ intensityRef, isGenerating, isConnected, className, style }: AgentVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const geminiRef = useRef(createAgent('Gemini', 'Voice', '#fbbf24', 2, 3))
  const flashRef = useRef(createAgent('Flash', 'Worker', '#60a5fa', 7, 3))
  const furnitureRef = useRef(createFurniture())
  const spriteImgRef = useRef<HTMLImageElement | null>(null)
  const lastTimeRef = useRef(0)
  const rafRef = useRef(0)

  // Load spritesheet
  useEffect(() => {
    const img = new Image()
    img.src = '/assets/sneaky-toast-clean.png'
    img.onload = () => { spriteImgRef.current = img }
    return () => { spriteImgRef.current = null }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateAgent = (agent: ToastAgent, dt: number, shouldBeActive: boolean) => {
      // State transitions
      if (shouldBeActive && !agent.isActive) {
        agent.isActive = true
        agent.targetX = agent.seatX
        agent.targetY = agent.seatY
        agent.anim = 'walk'
        agent.frame = 0
      } else if (!shouldBeActive && agent.isActive) {
        agent.isActive = false
        agent.anim = 'idle'
        agent.frame = 0
        agent.wanderTimer = 2 + Math.random() * 4
      }

      // Animation frame update
      const animDef = ANIMS[agent.anim]
      agent.frameTimer += dt
      if (agent.frameTimer >= animDef.speed) {
        agent.frameTimer -= animDef.speed
        agent.frame = (agent.frame + 1) % animDef.frames
      }

      // Movement
      const dx = agent.targetX - agent.x
      const dy = agent.targetY - agent.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 2) {
        const speed = 48 * dt
        let nextX = agent.x + (dx / dist) * Math.min(speed, dist)
        let nextY = agent.y + (dy / dist) * Math.min(speed, dist)

        // --- Collision Detection ---
        const agentRadius = 6 // collision radius for the agent

        // 1. Furniture Collision
        let collided = false
        const furnitureItems = furnitureRef.current
        for (const f of furnitureItems) {
           // We approximate furniture bounding boxes based on the sprite bounds.
           // TILE_SIZE is 16.
           let fw = 16, fh = 16
           if (f.sprite === DESK_SPRITE) { fw = 32; fh = 20 }
           else if (f.sprite === CHAIR_SPRITE) { fw = 16; fh = 16 }
           else if (f.sprite === PC_SPRITE) { fw = 16; fh = 16 }
           else if (f.sprite === PLANT_SPRITE) { fw = 16; fh = 24 }

           // f.x, f.y are top-left-ish coordinates in the pixel-office coordinate system
           // Adjusting the bounding box to match the visual footprint
           const fLeft = f.x
           const fRight = f.x + fw
           const fTop = f.y
           const fBottom = f.y + fh

           // Simple AABB vs Circle collision check
           // Find the closest point on the AABB to the circle center
           const closestX = Math.max(fLeft, Math.min(nextX, fRight))
           const closestY = Math.max(fTop, Math.min(nextY, fBottom))

           // Calculate distance from circle center to this closest point
           const distanceX = nextX - closestX
           const distanceY = nextY - closestY
           const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY)

           if (distanceSquared < (agentRadius * agentRadius)) {
               collided = true
               // Basic sliding response: move away from the closest point
               const distToClosest = Math.sqrt(distanceSquared) || 1
               const overlap = agentRadius - distToClosest
               nextX += (distanceX / distToClosest) * overlap
               nextY += (distanceY / distToClosest) * overlap
           }
        }

        // 2. Agent-to-Agent Collision
        const otherAgent = agent === geminiRef.current ? flashRef.current : geminiRef.current;
        const distToOtherX = nextX - otherAgent.x;
        const distToOtherY = nextY - otherAgent.y;
        const distToOtherSq = distToOtherX * distToOtherX + distToOtherY * distToOtherY;
        const combinedRadii = agentRadius * 2; // both have same radius

        if (distToOtherSq > 0 && distToOtherSq < combinedRadii * combinedRadii) {
            collided = true;
            const distToOther = Math.sqrt(distToOtherSq) || 1;
            const overlap = combinedRadii - distToOther;
            
            // Push this agent away from the other agent
            nextX += (distToOtherX / distToOther) * overlap;
            nextY += (distToOtherY / distToOther) * overlap;
        }

        // Keep inside bounds
        const s = TILE_SIZE
        const roomW = COLS * s
        const roomH = ROWS * s
        nextX = Math.max(agentRadius, Math.min(roomW - agentRadius, nextX))
        nextY = Math.max(agentRadius, Math.min(roomH - agentRadius, nextY))


        // If we are stuck against an object and our target is far, pick a new target to avoid infinite sliding loops
        // Only if not actively heading to seat
        if (!agent.isActive && collided && dist > 10 && agent.wanderTimer > 0) {
            agent.wanderTimer -= dt * 5; // fast forward wander timer when stuck
            if (agent.wanderTimer <= 0) {
                 agent.targetX = agent.x;
                 agent.targetY = agent.y;
            }
        }

        agent.x = nextX
        agent.y = nextY
        agent.facingRight = dx > 0
        if (agent.anim !== 'walk') {
          agent.anim = 'walk'
          agent.frame = 0
        }
      } else {
        agent.x = agent.targetX
        agent.y = agent.targetY
        if (agent.isActive) {
          if (agent.anim !== 'hide') {
            agent.anim = 'hide'
            agent.frame = 0
          }
          // Lock on the "typing" animation (hide = working at desk)
        } else {
          // Wander
          if (agent.anim === 'walk') {
            agent.anim = 'idle'
            agent.frame = 0
          }
          agent.wanderTimer -= dt
          if (agent.wanderTimer <= 0) {
            const tc = Math.max(0, Math.min(COLS - 1, Math.floor(agent.x / TILE_SIZE) + Math.floor(Math.random() * 5) - 2))
            const tr = Math.max(1, Math.min(ROWS - 1, Math.floor(agent.y / TILE_SIZE) + Math.floor(Math.random() * 3) - 1))
            agent.targetX = tc * TILE_SIZE + TILE_SIZE / 2
            agent.targetY = tr * TILE_SIZE + TILE_SIZE / 2
            agent.wanderTimer = 3 + Math.random() * 5
          }
        }
      }
    }

    const drawAgent = (agent: ToastAgent, ox: number, oy: number) => {
      const img = spriteImgRef.current
      if (!img) return

      const animDef = ANIMS[agent.anim]
      const sx = agent.frame * FRAME_SIZE
      const sy = animDef.row * FRAME_SIZE
      const drawSize = FRAME_SIZE * ZOOM
      const drawX = ox + agent.x * ZOOM - drawSize / 2
      const drawY = oy + agent.y * ZOOM - drawSize

      ctx.save()
      if (!agent.facingRight) {
        // Flip horizontally
        ctx.translate(drawX + drawSize / 2, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, -drawSize / 2, drawY, drawSize, drawSize)
      } else {
        ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, drawX, drawY, drawSize, drawSize)
      }
      ctx.restore()

      // Name label
      ctx.font = `bold ${Math.max(9, ZOOM * 3)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillStyle = agent.color
      ctx.fillText(agent.name, ox + agent.x * ZOOM, oy + agent.y * ZOOM + 4 * ZOOM)
      ctx.font = `${Math.max(7, ZOOM * 2.5)}px monospace`
      ctx.fillStyle = '#888'
      ctx.fillText(agent.label, ox + agent.x * ZOOM, oy + agent.y * ZOOM + 4 * ZOOM + ZOOM * 3.5)
    }

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      const gemini = geminiRef.current
      const flash = flashRef.current

      updateAgent(gemini, dt, isConnected)
      updateAgent(flash, dt, isGenerating)

      // Resize canvas
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.imageSmoothingEnabled = false

      ctx.clearRect(0, 0, rect.width, rect.height)

      const s = TILE_SIZE * ZOOM
      const roomW = COLS * s
      const roomH = (ROWS + 2.5) * s // +1 for the wall strip

      // Center the room
      const ox = Math.round((rect.width - roomW) / 2)
      const oy = Math.round((rect.height - roomH) / 2) + s // s is offset for the wall

      // Floor tiles
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#3a3524' : '#342f20'
          ctx.fillRect(ox + c * s, oy + r * s, s, s)
        }
      }
      // Wall strip
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(ox + c * s, oy - s, s, s)
      }

      // Draw furniture (z-sorted)
      const furniture = furnitureRef.current
      const sortedFurn = [...furniture].sort((a, b) => a.zY - b.zY)
      for (const f of sortedFurn) {
        const cached = getCachedSprite(f.sprite, ZOOM)
        ctx.drawImage(cached, ox + f.x * ZOOM, oy + f.y * ZOOM)
      }

      // Draw agents (sorted by Y)
      const agents = [gemini, flash].sort((a, b) => a.y - b.y)
      for (const a of agents) {
        drawAgent(a, ox, oy)
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isConnected, isGenerating, intensityRef])

  return (
    <div className={className || "relative w-full rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-sm overflow-hidden"}
      style={style || { height: `${(ROWS + 2) * TILE_SIZE * ZOOM + 40}px` }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}

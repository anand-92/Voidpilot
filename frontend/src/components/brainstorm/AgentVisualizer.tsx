import { useEffect, useRef, useCallback } from 'react'

interface AgentVisualizerProps {
  intensityRef: React.MutableRefObject<number>
  isGenerating: boolean
  isConnected: boolean
  className?: string
  style?: React.CSSProperties
}

const FRAME_SIZE = 16
const ANIMS = {
  idle: { row: 0, frames: 4, speed: 0.35 },
  walk: { row: 1, frames: 8, speed: 0.12 },
  hide: { row: 2, frames: 15, speed: 0.08 },
  hidden: { row: 3, frames: 4, speed: 0.3 },
} as const
const SCAN_ANIM = { frames: 6, speed: 0.25 }
type AnimKey = keyof typeof ANIMS | 'scan'

export const IMG_W = 2754
export const IMG_H = 1536
const SPRITE_FRACTION = 0.07

const AGENT_DIALOGUE = {
  Gemini: {
    active: ["Listening...", "I can help with that", "Let me think...", "Analyzing...", "On it!"],
    idle: ["Just chilling", "Zzz...", "Nice room", "Ready when you are", "Waiting for input..."]
  },
  Flash: {
    active: ["Generating...", "Writing code...", "Almost done...", "Compiling...", "Working on it!"],
    idle: ["Waiting for task", "Need anything?", "Taking a break", "All caught up", "Standing by"]
  }
} as const

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
  homeX: number
  homeY: number
  isActive: boolean
  wanderTimer: number
  bubbleText: string | null
  bubbleTimer: number
  activeTimer: number
}

function createAgent(name: string, label: string, color: string, homeX: number, homeY: number): ToastAgent {
  return {
    name, label, color,
    anim: 'idle', frame: 0, frameTimer: 0,
    x: homeX, y: homeY, targetX: homeX, targetY: homeY,
    facingRight: true,
    homeX, homeY,
    isActive: false,
    wanderTimer: 0.5 + Math.random() * 1.5,
    bubbleText: null,
    bubbleTimer: Math.random() * 5,
    activeTimer: 0,
  }
}

function isWalkable(maskData: Uint8ClampedArray | null, x: number, y: number): boolean {
  if (!maskData) return true
  const px = Math.round(x)
  const py = Math.round(y)
  if (px < 0 || px >= IMG_W || py < 0 || py >= IMG_H) return false
  const idx = (py * IMG_W + px) * 4
  return maskData[idx] > 128
}

function findNearestWalkable(maskData: Uint8ClampedArray, x: number, y: number): { x: number; y: number } {
  if (isWalkable(maskData, x, y)) return { x, y }
  for (let r = 10; r <= 400; r += 10) {
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2
      const tx = x + Math.cos(angle) * r
      const ty = y + Math.sin(angle) * r
      if (isWalkable(maskData, tx, ty)) return { x: tx, y: ty }
    }
  }
  return { x, y }
}

export function AgentVisualizer({ intensityRef, isGenerating, isConnected, className, style }: AgentVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const geminiRef = useRef(createAgent('Gemini', 'Voice', '#fbbf24', 700, 1200))
  const flashRef = useRef(createAgent('Flash', 'Worker', '#60a5fa', 850, 1200))
  const spriteImgRef = useRef<HTMLImageElement | null>(null)
  const scanSpriteRef = useRef<HTMLImageElement | null>(null)
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const maskDataRef = useRef<Uint8ClampedArray | null>(null)
  const lastTimeRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const sprite = new Image()
    sprite.src = '/assets/sneaky-toast-clean.png'
    sprite.onload = () => { spriteImgRef.current = sprite }

    const scanSprite = new Image()
    scanSprite.src = '/assets/toast-scanning-sprite.png'
    scanSprite.onload = () => { scanSpriteRef.current = scanSprite }

    const bg = new Image()
    bg.src = '/assets/cozy-room/background.jpg'
    bg.onload = () => { bgImgRef.current = bg }

    const mask = new Image()
    mask.src = '/assets/cozy-room/mask.jpg'
    mask.onload = () => {
      const offscreen = document.createElement('canvas')
      offscreen.width = mask.width
      offscreen.height = mask.height
      const mctx = offscreen.getContext('2d')!
      mctx.drawImage(mask, 0, 0)
      maskDataRef.current = mctx.getImageData(0, 0, mask.width, mask.height).data
    }

    return () => {
      spriteImgRef.current = null
      scanSpriteRef.current = null
      bgImgRef.current = null
      maskDataRef.current = null
    }
  }, [])

  const updateAgent = useCallback((agent: ToastAgent, dt: number, shouldBeActive: boolean, otherAgent: ToastAgent) => {
    if (shouldBeActive && !agent.isActive) {
      agent.isActive = true
      agent.activeTimer = 0
      agent.targetX = agent.homeX
      agent.targetY = agent.homeY
      agent.anim = 'walk'
      agent.frame = 0
    } else if (!shouldBeActive && agent.isActive) {
      agent.isActive = false
      agent.activeTimer = 0
      agent.anim = 'idle'
      agent.frame = 0
      agent.wanderTimer = 0.5 + Math.random() * 1.5
    }

    if (agent.isActive) {
      agent.activeTimer += dt
    }

    if (agent.anim === 'scan') {
      agent.frameTimer += dt
      if (agent.frameTimer >= SCAN_ANIM.speed) {
        agent.frameTimer -= SCAN_ANIM.speed
        agent.frame = (agent.frame + 1) % SCAN_ANIM.frames
      }
    } else {
      const animDef = ANIMS[agent.anim as keyof typeof ANIMS]
      agent.frameTimer += dt
      if (agent.frameTimer >= animDef.speed) {
        agent.frameTimer -= animDef.speed
        agent.frame = (agent.frame + 1) % animDef.frames
      }
    }

    agent.bubbleTimer -= dt
    if (agent.bubbleTimer <= 0) {
      if (agent.bubbleText) {
        agent.bubbleText = null
        agent.bubbleTimer = 2 + Math.random() * 5
      } else {
        const dialogMap = AGENT_DIALOGUE[agent.name as keyof typeof AGENT_DIALOGUE]
        if (dialogMap) {
          const list = shouldBeActive ? dialogMap.active : dialogMap.idle
          if (shouldBeActive || Math.random() > 0.6) {
            agent.bubbleText = list[Math.floor(Math.random() * list.length)]
            agent.bubbleTimer = 3 + Math.random() * 3
          } else {
            agent.bubbleTimer = 3 + Math.random() * 5
          }
        }
      }
    }

    const mask = maskDataRef.current
    const dx = agent.targetX - agent.x
    const dy = agent.targetY - agent.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 4) {
      const speed = 200 * dt
      const stepX = (dx / dist) * Math.min(speed, dist)
      const stepY = (dy / dist) * Math.min(speed, dist)
      const nextX = agent.x + stepX
      const nextY = agent.y + stepY

      if (isWalkable(mask, nextX, nextY)) {
        agent.x = nextX
        agent.y = nextY
      } else if (isWalkable(mask, agent.x + stepX, agent.y)) {
        agent.x += stepX
      } else if (isWalkable(mask, agent.x, agent.y + stepY)) {
        agent.y += stepY
      } else {
        agent.targetX = agent.x
        agent.targetY = agent.y
        agent.wanderTimer = 0.5
      }

      agent.facingRight = dx > 0
      if (agent.anim !== 'walk') {
        agent.anim = 'walk'
        agent.frame = 0
      }
    } else {
      agent.x = agent.targetX
      agent.y = agent.targetY
      if (agent.isActive) {
        const scanDuration = SCAN_ANIM.frames * SCAN_ANIM.speed * 3
        if (agent.activeTimer < scanDuration) {
          if (agent.anim !== 'scan') {
            agent.anim = 'scan'
            agent.frame = 0
            agent.frameTimer = 0
          }
        } else {
          if (agent.anim !== 'hide') {
            agent.anim = 'hide'
            agent.frame = 0
          }
        }
      } else {
        if (agent.anim === 'walk') {
          agent.anim = 'idle'
          agent.frame = 0
        }
        agent.wanderTimer -= dt
        if (agent.wanderTimer <= 0) {
          for (let attempt = 0; attempt < 20; attempt++) {
            const tx = agent.x + (Math.random() * 1600 - 800)
            const ty = agent.y + (Math.random() * 800 - 400)
            if (isWalkable(mask, tx, ty)) {
              agent.targetX = tx
              agent.targetY = ty
              break
            }
          }
          agent.wanderTimer = 0.5 + Math.random() * 2
        }
      }
    }

    const adx = agent.x - otherAgent.x
    const ady = agent.y - otherAgent.y
    const adist = Math.sqrt(adx * adx + ady * ady)
    const minDist = 60
    if (adist > 0 && adist < minDist) {
      const push = (minDist - adist) / 2
      agent.x += (adx / adist) * push
      agent.y += (ady / adist) * push
    }

    if (mask && !isWalkable(mask, agent.x, agent.y)) {
      const safe = findNearestWalkable(mask, agent.x, agent.y)
      agent.x = safe.x
      agent.y = safe.y
      agent.targetX = safe.x
      agent.targetY = safe.y
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawAgent = (agent: ToastAgent, scale: number, ox: number, oy: number, bgDrawH: number) => {
      const drawSize = bgDrawH * SPRITE_FRACTION
      const drawX = ox + agent.x * scale - drawSize / 2
      const drawY = oy + agent.y * scale - drawSize

      if (agent.anim === 'scan') {
        const sImg = scanSpriteRef.current
        if (!sImg) return
        const sx = agent.frame * FRAME_SIZE
        ctx.save()
        if (!agent.facingRight) {
          ctx.translate(drawX + drawSize / 2, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(sImg, sx, 0, FRAME_SIZE, FRAME_SIZE, -drawSize / 2, drawY, drawSize, drawSize)
        } else {
          ctx.drawImage(sImg, sx, 0, FRAME_SIZE, FRAME_SIZE, drawX, drawY, drawSize, drawSize)
        }
        ctx.restore()
      } else {
        const img = spriteImgRef.current
        if (!img) return
        const animDef = ANIMS[agent.anim as keyof typeof ANIMS]
        const sx = agent.frame * FRAME_SIZE
        const sy = animDef.row * FRAME_SIZE
        ctx.save()
        if (!agent.facingRight) {
          ctx.translate(drawX + drawSize / 2, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, -drawSize / 2, drawY, drawSize, drawSize)
        } else {
          ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, drawX, drawY, drawSize, drawSize)
        }
        ctx.restore()
      }

      const fontSize = Math.max(9, 12 * scale)
      ctx.font = `bold ${fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.fillStyle = agent.color
      ctx.fillText(agent.name, ox + agent.x * scale, oy + agent.y * scale + drawSize * 0.25)
      ctx.font = `${fontSize * 0.8}px monospace`
      ctx.fillStyle = '#888'
      ctx.fillText(agent.label, ox + agent.x * scale, oy + agent.y * scale + drawSize * 0.25 + fontSize * 1.2)

      if (agent.bubbleText) {
        const bFontSize = Math.max(8, 10 * scale)
        ctx.font = `bold ${bFontSize}px monospace`
        const metrics = ctx.measureText(agent.bubbleText)
        const padX = 8 * scale
        const padY = 6 * scale
        const bw = metrics.width + padX * 2
        const bh = bFontSize + padY * 2
        const bx = ox + agent.x * scale - bw / 2
        const by = drawY - bh - 8 * scale

        ctx.save()
        ctx.fillStyle = 'rgba(20, 20, 30, 0.85)'
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = scale

        const radius = 6 * scale
        ctx.beginPath()
        ctx.moveTo(bx + radius, by)
        ctx.lineTo(bx + bw - radius, by)
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius)
        ctx.lineTo(bx + bw, by + bh - radius)
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh)
        const tx = bx + bw / 2
        ctx.lineTo(tx + 4 * scale, by + bh)
        ctx.lineTo(tx, by + bh + 4 * scale)
        ctx.lineTo(tx - 4 * scale, by + bh)
        ctx.lineTo(bx + radius, by + bh)
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius)
        ctx.lineTo(bx, by + radius)
        ctx.quadraticCurveTo(bx, by, bx + radius, by)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#f3f4f6'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(agent.bubbleText, bx + bw / 2, by + bh / 2 + 1)
        ctx.restore()
      }
    }

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      const gemini = geminiRef.current
      const flash = flashRef.current
      updateAgent(gemini, dt, isConnected, flash)
      updateAgent(flash, dt, isGenerating, gemini)

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
      ctx.clearRect(0, 0, rect.width, rect.height)

      const bg = bgImgRef.current
      if (bg) {
        const imgAspect = IMG_W / IMG_H
        const containerAspect = rect.width / rect.height
        let drawW: number, drawH: number, ox: number, oy: number

        if (containerAspect > imgAspect) {
          drawW = rect.width
          drawH = rect.width / imgAspect
          ox = 0
          oy = (rect.height - drawH) / 2
        } else {
          drawH = rect.height
          drawW = rect.height * imgAspect
          ox = (rect.width - drawW) / 2
          oy = 0
        }

        ctx.imageSmoothingEnabled = true
        ctx.drawImage(bg, ox, oy, drawW, drawH)

        ctx.imageSmoothingEnabled = false
        const scale = drawW / IMG_W
        const agents = [gemini, flash].sort((a, b) => a.y - b.y)
        for (const a of agents) {
          drawAgent(a, scale, ox, oy, drawH)
        }
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isConnected, isGenerating, intensityRef, updateAgent])

  return (
    <div className={className || "relative w-full rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-sm overflow-hidden"}
      style={style || { aspectRatio: `${IMG_W}/${IMG_H}` }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}

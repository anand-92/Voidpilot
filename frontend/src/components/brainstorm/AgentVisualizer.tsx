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
  walk: { row: 1, frames: 8, speed: 0.14 },
  hide: { row: 2, frames: 15, speed: 0.08 },
  hidden: { row: 3, frames: 4, speed: 0.3 },
} as const
const SCAN_ANIM = { frames: 6, speed: 0.25 }
type AnimKey = keyof typeof ANIMS | 'scan'

export const IMG_W = 2754
export const IMG_H = 1536
const SPRITE_FRACTION = 0.105

let walkableBounds = { minX: 0, maxX: IMG_W - 1, minY: 0, maxY: IMG_H - 1 }

const WALKING_PHRASES = [
  "Rising to the occasion!",
  "Let's get this bread.",
  "I'm on a roll... wait, I'm toast.",
  "Bread-y for anything!",
  "Just loafing around.",
  "Looking for the butter side of life.",
  "I'm feeling extra crispy today.",
  "Just crumbs for thought.",
  "Scanning for jam... I mean, data.",
  "Assistant duties: Buttering up the user.",
  "A balanced diet is toast in both hands.",
  "Everything I do is 'well-done'.",
  "I'm the upper crust of AI.",
  "Wheat's up?",
  "Toasting to a job well done.",
  "Just a sliver of your time?",
  "Don't be sourdough!",
  "Rye-ing to help you out.",
  "Keeping it light and fluffy.",
  "Freshly baked and ready to serve!",
]

const SLEEPING_PHRASES = [
  "Zzz... buttery dreams...",
  "Zzz... warm and toasty...",
  "Zzz... don't flip me yet...",
  "Zzz... bed of crumbs...",
  "Zzz... golden brown...",
]

const ACTIVE_PHRASES = {
  Gemini: [
    "Polishing my vocabulary...",
    "Drafting the perfect response!",
    "Parsing your thoughts...",
    "I've got just the words!",
  ],
  Flash: [
    "Baking the pixels...",
    "Crunching the data crumbs...",
    "Processing the ingredients...",
    "Whipping up something special!",
  ],
} as const

function pickUnique(list: readonly string[], exclude: string | null): string {
  if (list.length <= 1) return list[0]
  for (let i = 0; i < 10; i++) {
    const pick = list[Math.floor(Math.random() * list.length)]
    if (pick !== exclude) return pick
  }
  return list[0] === exclude ? list[1] : list[0]
}

const SPEECH_COOLDOWN = 30

function trySetBubble(agent: ToastAgent, list: readonly string[], otherAgent: ToastAgent, minTimer: number): void {
  if (agent.speechCooldown > 0) return
  agent.bubbleText = pickUnique(list, otherAgent.bubbleText)
  agent.bubbleMinTimer = minTimer
}

function forceSetBubble(agent: ToastAgent, list: readonly string[], otherAgent: ToastAgent): void {
  agent.speechCooldown = 0
  agent.bubbleMinTimer = 0
  agent.bubbleText = pickUnique(list, otherAgent.bubbleText)
}

function clearBubble(agent: ToastAgent): void {
  if (agent.bubbleText) {
    agent.bubbleText = null
    agent.speechCooldown = SPEECH_COOLDOWN
  }
  agent.bubbleMinTimer = 0
}

const LANDMARKS = {
  rug: { cx: 820, cy: 1150, rx: 250, ry: 120 },
  deskChair: { x: 420, y: 960 },
  cat: { x: 780, y: 1000, stopRadius: 140 },
} as const

type IdleBehavior = 'none' | 'wandering' | 'nap_walk' | 'sleeping' | 'think_desk' | 'thinking' | 'visit_cat' | 'admiring_cat'

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
  bubbleText: string | null
  activeTimer: number
  idleBehavior: IdleBehavior
  behaviorTimer: number
  moveSpeed: number
  napTimer: number
  blockedTimer: number
  hardStopCooldown: number
  bubbleMinTimer: number
  idleCooldown: number
  speechCooldown: number
  moveStartTime: number
  stuckX: number
  stuckY: number
}

function createAgent(name: string, label: string, color: string, homeX: number, homeY: number, moveSpeed: number, napDelay: number): ToastAgent {
  return {
    name, label, color,
    anim: 'idle', frame: 0, frameTimer: 0,
    x: homeX, y: homeY, targetX: homeX, targetY: homeY,
    facingRight: true,
    homeX, homeY,
    isActive: false,
    bubbleText: null,
    activeTimer: 0,
    idleBehavior: 'none',
    behaviorTimer: 0,
    moveSpeed,
    napTimer: napDelay,
    blockedTimer: 0,
    hardStopCooldown: 0,
    bubbleMinTimer: 0,
    idleCooldown: 0,
    speechCooldown: 0,
    moveStartTime: 0,
    stuckX: -1,
    stuckY: -1,
  }
}

function pickRugSpot(mask: Uint8ClampedArray | null): { x: number; y: number } {
  const { cx, cy, rx, ry } = LANDMARKS.rug
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random())
    const tx = cx + Math.cos(angle) * rx * r
    const ty = cy + Math.sin(angle) * ry * r
    if (isWalkable(mask, tx, ty)) return { x: tx, y: ty }
  }
  return { x: cx, y: cy + ry }
}

function pickCatEdge(mask: Uint8ClampedArray | null): { x: number; y: number } {
  const { x: catX, y: catY, stopRadius } = LANDMARKS.cat
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2
    const tx = catX + Math.cos(angle) * stopRadius
    const ty = catY + Math.sin(angle) * stopRadius
    if (isWalkable(mask, tx, ty)) return { x: tx, y: ty }
  }
  return { x: catX + stopRadius, y: catY }
}

function pickRandomWalkable(mask: Uint8ClampedArray | null): { x: number; y: number } {
  if (!mask) return { x: Math.random() * IMG_W, y: Math.random() * IMG_H }
  const { minX, maxX, minY, maxY } = walkableBounds
  for (let i = 0; i < 200; i++) {
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    if (isWalkable(mask, x, y)) return { x, y }
  }
  return { x: LANDMARKS.rug.cx, y: LANDMARKS.rug.cy }
}

function pickBiasedWalkable(mask: Uint8ClampedArray | null, otherX: number): { x: number; y: number } {
  const { minX, maxX, minY, maxY } = walkableBounds
  const midX = (minX + maxX) / 2
  const preferRight = otherX < midX
  for (let i = 0; i < 300; i++) {
    let x: number
    if (Math.random() < 0.8) {
      x = preferRight
        ? midX + Math.random() * (maxX - midX)
        : minX + Math.random() * (midX - minX)
    } else {
      x = minX + Math.random() * (maxX - minX)
    }
    const y = minY + Math.random() * (maxY - minY)
    if (isWalkable(mask, x, y)) return { x, y }
  }
  return pickRandomWalkable(mask)
}

function pickWeightedBehavior(): 'wandering' | 'think_desk' | 'visit_cat' {
  const roll = Math.random()
  if (roll < 0.75) return 'wandering'
  if (roll < 0.9) return 'think_desk'
  return 'visit_cat'
}

const FEET_HALF_W = 12

function isWalkablePixel(maskData: Uint8ClampedArray | null, x: number, y: number): boolean {
  if (!maskData) return true
  const px = Math.round(x)
  const py = Math.round(y)
  if (px < 0 || px >= IMG_W || py < 0 || py >= IMG_H) return false
  const idx = (py * IMG_W + px) * 4
  return maskData[idx] > 128
}

function isWalkable(maskData: Uint8ClampedArray | null, x: number, y: number): boolean {
  if (!maskData) return true
  return (
    isWalkablePixel(maskData, x, y) &&
    isWalkablePixel(maskData, x - FEET_HALF_W, y) &&
    isWalkablePixel(maskData, x + FEET_HALF_W, y)
  )
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

function dist2d(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

const PERSONAL_SPACE = 200
const PERSONAL_SPACE_WALK = 180

function pickDistantWalkable(
  mask: Uint8ClampedArray | null,
  agentX: number, agentY: number,
  other: ToastAgent,
): { x: number; y: number } {
  for (let i = 0; i < 300; i++) {
    const spot = pickBiasedWalkable(mask, other.x)
    const selfDist = dist2d(spot.x, spot.y, agentX, agentY)
    const otherPosDist = dist2d(spot.x, spot.y, other.x, other.y)
    const otherTargetDist = dist2d(spot.x, spot.y, other.targetX, other.targetY)
    const stuckDist = other.stuckX >= 0 ? dist2d(spot.x, spot.y, other.stuckX, other.stuckY) : 999
    if (selfDist >= 150 && otherPosDist >= PERSONAL_SPACE && otherTargetDist >= PERSONAL_SPACE && stuckDist >= 150) return spot
  }
  for (let i = 0; i < 100; i++) {
    const spot = pickBiasedWalkable(mask, other.x)
    if (dist2d(spot.x, spot.y, agentX, agentY) >= 150 && dist2d(spot.x, spot.y, other.x, other.y) >= PERSONAL_SPACE) return spot
  }
  return pickRandomWalkable(mask)
}

function pickOppositeWalkable(
  mask: Uint8ClampedArray | null,
  agentX: number, agentY: number,
  otherX: number, otherY: number,
): { x: number; y: number } {
  const awayDx = agentX - otherX
  const awayDy = agentY - otherY
  const awayLen = Math.sqrt(awayDx * awayDx + awayDy * awayDy) || 1
  for (let i = 0; i < 200; i++) {
    const spread = (Math.random() - 0.5) * Math.PI * 0.6
    const baseAngle = Math.atan2(awayDy / awayLen, awayDx / awayLen) + spread
    const r = 250 + Math.random() * 500
    const tx = agentX + Math.cos(baseAngle) * r
    const ty = agentY + Math.sin(baseAngle) * r
    if (isWalkable(mask, tx, ty) && dist2d(tx, ty, otherX, otherY) >= PERSONAL_SPACE) return { x: tx, y: ty }
  }
  return pickRandomWalkable(mask)
}

export function AgentVisualizer({ intensityRef, isGenerating, isConnected, className, style }: AgentVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const geminiRef = useRef(createAgent('Gemini', 'Voice', '#3b82f6', 600, 1200, 1.0, 30))
  const flashRef = useRef(createAgent('Flash', 'Worker', '#60a5fa', 1000, 1200, 1.2, 37))
  const spriteImgRef = useRef<HTMLImageElement | null>(null)
  const scanSpriteRef = useRef<HTMLImageElement | null>(null)
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const maskDataRef = useRef<Uint8ClampedArray | null>(null)
  const lastTimeRef = useRef(0)
  const rafRef = useRef(0)
  const frameCountRef = useRef(0)

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
      const data = mctx.getImageData(0, 0, mask.width, mask.height).data
      maskDataRef.current = data

      let bMinX = IMG_W, bMaxX = 0, bMinY = IMG_H, bMaxY = 0
      for (let y = 0; y < IMG_H; y += 8) {
        for (let x = 0; x < IMG_W; x += 8) {
          const idx = (y * IMG_W + x) * 4
          if (data[idx] > 128) {
            if (x < bMinX) bMinX = x
            if (x > bMaxX) bMaxX = x
            if (y < bMinY) bMinY = y
            if (y > bMaxY) bMaxY = y
          }
        }
      }
      if (bMaxX > bMinX) {
        walkableBounds = { minX: bMinX, maxX: bMaxX, minY: bMinY, maxY: bMaxY }
      }
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
      agent.moveStartTime = performance.now()
      agent.stuckX = -1
      agent.stuckY = -1
      agent.anim = 'walk'
      agent.frame = 0
      agent.idleBehavior = 'none'
      agent.behaviorTimer = 0
      agent.hardStopCooldown = 0
      const phrases = ACTIVE_PHRASES[agent.name as keyof typeof ACTIVE_PHRASES]
      if (phrases) forceSetBubble(agent, phrases, otherAgent)
    } else if (!shouldBeActive && agent.isActive) {
      agent.isActive = false
      agent.activeTimer = 0
      agent.anim = 'idle'
      agent.frame = 0
      agent.idleBehavior = 'none'
      agent.behaviorTimer = 0
      agent.idleCooldown = 5 + Math.random() * 3
      agent.napTimer = agent.name === 'Gemini' ? 30 : 37
      agent.blockedTimer = 0
      agent.hardStopCooldown = 0
      agent.bubbleText = null
      agent.bubbleMinTimer = 0
      agent.speechCooldown = 0
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

    if (agent.bubbleMinTimer > 0) agent.bubbleMinTimer -= dt
    if (agent.speechCooldown > 0) agent.speechCooldown -= dt

    const mask = maskDataRef.current
    const dx = agent.targetX - agent.x
    const dy = agent.targetY - agent.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (agent.hardStopCooldown > 0) {
      agent.hardStopCooldown -= dt
      if (agent.anim !== 'idle') {
        agent.anim = 'idle'
        agent.frame = 0
      }
      if (agent.hardStopCooldown <= 0) {
        agent.hardStopCooldown = 0
        agent.stuckX = -1
        agent.stuckY = -1
        const spot = pickDistantWalkable(mask, agent.x, agent.y, otherAgent)
        agent.targetX = spot.x
        agent.targetY = spot.y
        agent.moveStartTime = performance.now()
        if (!agent.isActive) {
          agent.idleBehavior = 'wandering'
          trySetBubble(agent, WALKING_PHRASES, otherAgent, 5)
        }
      }
    } else if (dist > 4) {
      const speed = 100 * agent.moveSpeed * dt
      const stepX = (dx / dist) * Math.min(speed, dist)
      const stepY = (dy / dist) * Math.min(speed, dist)
      const nextX = agent.x + stepX
      const nextY = agent.y + stepY

      if (!isWalkable(mask, nextX, nextY)) {
        agent.targetX = agent.x
        agent.targetY = agent.y
        agent.anim = 'idle'
        agent.frame = 0
        agent.hardStopCooldown = 5.0
        agent.stuckX = agent.x
        agent.stuckY = agent.y
        if (!agent.isActive) {
          agent.idleBehavior = 'none'
          if (agent.bubbleMinTimer <= 0) clearBubble(agent)
        }
      } else {
        const od = Math.sqrt((nextX - otherAgent.x) ** 2 + (nextY - otherAgent.y) ** 2)
        if (od < PERSONAL_SPACE_WALK) {
          agent.blockedTimer += dt
          if (agent.blockedTimer > 2) {
            agent.blockedTimer = 0
            const spot = pickDistantWalkable(mask, agent.x, agent.y, otherAgent)
            agent.targetX = spot.x
            agent.targetY = spot.y
            agent.moveStartTime = performance.now()
            if (!agent.isActive) {
              agent.idleBehavior = 'wandering'
              trySetBubble(agent, WALKING_PHRASES, otherAgent, 5)
            }
          }
        } else {
          agent.x = nextX
          agent.y = nextY
          agent.blockedTimer = 0
        }
        agent.facingRight = dx > 0
        if (agent.anim !== 'walk') {
          agent.anim = 'walk'
          agent.frame = 0
        }
      }
    } else {
      if (isWalkable(mask, agent.targetX, agent.targetY)) {
        agent.x = agent.targetX
        agent.y = agent.targetY
      }
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
        const b = agent.idleBehavior

        if (b === 'wandering') {
          agent.idleBehavior = 'none'
          agent.anim = 'idle'
          agent.frame = 0
          if (agent.bubbleMinTimer <= 0) clearBubble(agent)
          agent.idleCooldown = 5 + Math.random() * 3
        } else if (b === 'nap_walk') {
          agent.idleBehavior = 'sleeping'
          agent.behaviorTimer = 15
          agent.anim = 'hidden'
          agent.frame = 0
          trySetBubble(agent, SLEEPING_PHRASES, otherAgent, 15)
        } else if (b === 'sleeping') {
          agent.behaviorTimer -= dt
          if (agent.behaviorTimer <= 0) {
            agent.idleBehavior = 'none'
            agent.anim = 'idle'
            agent.frame = 0
            clearBubble(agent)
            agent.idleCooldown = 5 + Math.random() * 3
            agent.napTimer = 28 + Math.random() * 4
          }
        } else if (b === 'thinking') {
          agent.behaviorTimer -= dt
          if (agent.anim !== 'scan') {
            agent.anim = 'scan'
            agent.frame = 0
            agent.frameTimer = 0
          }
          if (agent.behaviorTimer <= 0) {
            agent.idleBehavior = 'none'
            agent.anim = 'idle'
            agent.frame = 0
            if (agent.bubbleMinTimer <= 0) clearBubble(agent)
            agent.idleCooldown = 5 + Math.random() * 3
          }
        } else if (b === 'admiring_cat') {
          agent.behaviorTimer -= dt
          if (agent.anim !== 'idle') {
            agent.anim = 'idle'
            agent.facingRight = LANDMARKS.cat.x > agent.x
          }
          if (agent.behaviorTimer <= 0) {
            agent.idleBehavior = 'none'
            if (agent.bubbleMinTimer <= 0) clearBubble(agent)
            agent.idleCooldown = 5 + Math.random() * 3
          }
        } else if (b === 'think_desk') {
          agent.idleBehavior = 'thinking'
          agent.behaviorTimer = 3 + Math.random() * 3
          trySetBubble(agent, WALKING_PHRASES, otherAgent, 5)
        } else if (b === 'visit_cat') {
          agent.idleBehavior = 'admiring_cat'
          agent.behaviorTimer = 3 + Math.random() * 2
          trySetBubble(agent, WALKING_PHRASES, otherAgent, 5)
        } else {
          if (agent.anim === 'walk') {
            agent.anim = 'idle'
            agent.frame = 0
          }
          if (agent.idleCooldown > 0) {
            agent.idleCooldown -= dt
            if (agent.bubbleMinTimer > 0) {
              agent.bubbleMinTimer -= dt
              if (agent.bubbleMinTimer <= 0) {
                clearBubble(agent)
              }
            }
          } else {
            agent.napTimer -= dt
            if (agent.napTimer <= 0) {
              agent.idleBehavior = 'nap_walk'
              trySetBubble(agent, WALKING_PHRASES, otherAgent, 5)
              const spot = pickRugSpot(mask)
              agent.targetX = spot.x
              agent.targetY = spot.y
              agent.moveStartTime = performance.now()
            } else {
              const nextBehavior = pickWeightedBehavior()
              agent.idleBehavior = nextBehavior
              trySetBubble(agent, WALKING_PHRASES, otherAgent, 5)
              if (nextBehavior === 'wandering') {
                const spot = pickDistantWalkable(mask, agent.x, agent.y, otherAgent)
                agent.targetX = spot.x
                agent.targetY = spot.y
              } else if (nextBehavior === 'think_desk') {
                const { x, y } = LANDMARKS.deskChair
                const safe = mask ? findNearestWalkable(mask, x, y) : { x, y }
                agent.targetX = safe.x
                agent.targetY = safe.y
              } else {
                const spot = pickCatEdge(mask)
                agent.targetX = spot.x
                agent.targetY = spot.y
              }
              agent.moveStartTime = performance.now()
            }
          }
        }
      }
    }

    const adx = agent.x - otherAgent.x
    const ady = agent.y - otherAgent.y
    const adist = Math.sqrt(adx * adx + ady * ady)
    const minDist = PERSONAL_SPACE
    if (adist > 0 && adist < minDist) {
      const push = (minDist - adist) / 2
      const pushX = (adx / adist) * push
      const pushY = (ady / adist) * push
      const newX = agent.x + pushX
      const newY = agent.y + pushY
      if (isWalkable(mask, newX, newY)) {
        agent.x = newX
        agent.y = newY
      }
    }

    agent.x = Math.max(0, Math.min(agent.x, IMG_W - 1))
    agent.y = Math.max(0, Math.min(agent.y, IMG_H - 1))

    if (mask && !isWalkable(mask, agent.x, agent.y)) {
      const safe = findNearestWalkable(mask, agent.x, agent.y)
      agent.x = safe.x
      agent.y = safe.y
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const wrapText = (text: string, font: string, maxW: number): string[] => {
      ctx.font = font
      const words = text.split(' ')
      const lines: string[] = []
      let line = ''
      for (const word of words) {
        const test = line ? `${line} ${word}` : word
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line)
          line = word
        } else {
          line = test
        }
      }
      if (line) lines.push(line)
      return lines
    }

    const drawAgentSprite = (agent: ToastAgent, scale: number, ox: number, oy: number, bgDrawH: number) => {
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
    }

    const PIXEL_FONT = "'Press Start 2P', monospace"

    const bubbleRectsRef: { bx: number; bw: number; by: number; bh: number }[] = []

    const drawBubble = (agent: ToastAgent, otherAgent: ToastAgent, scale: number, ox: number, oy: number, bgDrawH: number) => {
      if (!agent.bubbleText) return
      const drawSize = bgDrawH * SPRITE_FRACTION
      const baseDrawY = oy + agent.y * scale - drawSize
      const centerX = ox + agent.x * scale

      const yBoost = agent.y < otherAgent.y ? Math.max(10, 18 * scale) : 0
      const drawY = baseDrawY - yBoost

      const bFontSize = Math.max(7, 9 * scale)
      const font = `${bFontSize}px ${PIXEL_FONT}`
      const maxTextW = Math.max(100, 170 * scale)
      const lines = wrapText(agent.bubbleText, font, maxTextW)

      const padX = Math.max(8, 12 * scale)
      const padY = Math.max(10, 14 * scale)
      const lineH = Math.ceil(bFontSize * 1.8)

      let maxLineW = 0
      ctx.font = font
      for (const l of lines) {
        const w = ctx.measureText(l).width
        if (w > maxLineW) maxLineW = w
      }

      const bw = Math.min(maxLineW + padX * 2, maxTextW + padX * 2)
      const bh = lineH * lines.length + padY * 2
      const tailH = Math.max(4, 6 * scale)
      const tailW = Math.max(4, 6 * scale)
      const outline = Math.max(1.5, 2 * scale)
      const minGap = Math.max(30, 50 * scale)

      let bx = centerX - bw / 2
      for (const prev of bubbleRectsRef) {
        const overlapL = bx < prev.bx + prev.bw + minGap
        const overlapR = bx + bw > prev.bx - minGap
        if (overlapL && overlapR) {
          const pushLeft = prev.bx - minGap - bw
          const pushRight = prev.bx + prev.bw + minGap
          if (Math.abs(pushLeft + bw / 2 - centerX) < Math.abs(pushRight + bw / 2 - centerX)) {
            bx = pushLeft
          } else {
            bx = pushRight
          }
        }
      }

      const by = drawY - bh - tailH - Math.max(6, 10 * scale)
      const tailCenterX = centerX

      ctx.save()
      ctx.lineWidth = outline
      ctx.strokeStyle = '#111118'
      ctx.fillStyle = 'rgba(255, 255, 252, 0.68)'
      ctx.lineJoin = 'miter'

      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + bw, by)
      ctx.lineTo(bx + bw, by + bh)
      const clampedTail = Math.max(bx + tailW + 2, Math.min(tailCenterX, bx + bw - tailW - 2))
      ctx.lineTo(clampedTail + tailW, by + bh)
      ctx.lineTo(clampedTail, by + bh + tailH)
      ctx.lineTo(clampedTail - tailW, by + bh)
      ctx.lineTo(bx, by + bh)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#1a1a28'
      ctx.font = font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const textCenterX = bx + bw / 2
      const textStartY = by + padY
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], textCenterX, textStartY + i * lineH)
      }
      ctx.restore()

      bubbleRectsRef.push({ bx, bw, by, bh })
    }

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      const gemini = geminiRef.current
      const flash = flashRef.current
      updateAgent(gemini, dt, isConnected, flash)
      updateAgent(flash, dt, isGenerating, gemini)

      frameCountRef.current++
      if (frameCountRef.current % 10 === 0) {
        const proximity = dist2d(gemini.x, gemini.y, flash.x, flash.y)
        if (proximity < PERSONAL_SPACE_WALK && proximity > 0) {
          const isGeminiWalking = gemini.anim === 'walk' && !gemini.isActive && gemini.hardStopCooldown <= 0
          const isFlashWalking = flash.anim === 'walk' && !flash.isActive && flash.hardStopCooldown <= 0
          let yielder: ToastAgent | null = null
          let other: ToastAgent | null = null
          if (isGeminiWalking && isFlashWalking) {
            yielder = gemini.moveStartTime > flash.moveStartTime ? gemini : flash
            other = yielder === gemini ? flash : gemini
          } else if (isGeminiWalking) {
            yielder = gemini; other = flash
          } else if (isFlashWalking) {
            yielder = flash; other = gemini
          }
          if (yielder && other) {
            yielder.targetX = yielder.x
            yielder.targetY = yielder.y
            yielder.anim = 'idle'
            yielder.frame = 0
            yielder.hardStopCooldown = 2.0
            yielder.idleBehavior = 'none'
            const mask = maskDataRef.current
            const spot = pickOppositeWalkable(mask, yielder.x, yielder.y, other.x, other.y)
            yielder.targetX = spot.x
            yielder.targetY = spot.y
          }
        }
      }

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
          drawAgentSprite(a, scale, ox, oy, drawH)
        }
        bubbleRectsRef.length = 0
        for (const a of agents) {
          const other = a === gemini ? flash : gemini
          drawBubble(a, other, scale, ox, oy, drawH)
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

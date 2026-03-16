import { useEffect, useRef, useCallback, useState } from 'react'

const BOARD_W = 360
const BOARD_H = 640

const TOAST_SRC_SIZE = 16
const TOAST_SCALE = 1.5
const TOAST_W = Math.round(34 * TOAST_SCALE)
const TOAST_H = Math.round(24 * TOAST_SCALE)
const TOAST_X = Math.round(BOARD_W / 8)

const PIPE_W = 64
const PIPE_H = 512
const LIP_W = 76
const LIP_H = 28

const GRAVITY = 0.4
const JUMP_VEL = -6
const TERMINAL_VEL = 6
const FPS = 60

const LEVEL_THRESHOLD = 10
const LEVEL_ANNOUNCE_DURATION = 2.0
const LEVEL_FADE_OUT = 0.5
const MIN_SPAWN = 800

interface LevelConfig {
  gap: number
  speed: number
  interval: number
  subtitle: string
}

const LEVELS: LevelConfig[] = [
  { gap: 220, speed: -2.5, interval: 2200, subtitle: '' },
  { gap: 220, speed: -3.5, interval: 2200, subtitle: 'Faster pipes!' },
  { gap: 220, speed: -3.5, interval: 1600, subtitle: 'More frequent!' },
  { gap: 150, speed: -3.5, interval: 1600, subtitle: 'Tight gaps!' },
  { gap: 150, speed: -4.5, interval: 1600, subtitle: 'Faster!' },
  { gap: 150, speed: -5.5, interval: 1600, subtitle: 'Even faster?!!' },
  { gap: 150, speed: -7.0, interval: 1200, subtitle: 'God Mode!!!' },
]

type TransitionPhase = 'none' | 'draining' | 'announcing'

function getLevelIndex(score: number): number {
  return Math.floor(score / LEVEL_THRESHOLD)
}

function getLevelConfig(levelIdx: number): LevelConfig {
  if (levelIdx < LEVELS.length) return LEVELS[levelIdx]
  const extra = levelIdx - LEVELS.length + 1
  const base = LEVELS[LEVELS.length - 1]
  return {
    gap: base.gap,
    speed: base.speed - extra * 0.5,
    interval: Math.max(MIN_SPAWN, base.interval - extra * 100),
    subtitle: `LV ${levelIdx + 1}!`,
  }
}

const PIPE_BODY = '#75BF30'
const PIPE_DARK = '#3A7A10'
const PIPE_LIGHT = '#8AD440'
const PIPE_OUTLINE = '#2A5A08'

const STAR_COUNT = 120
const STAR_PARALLAX = 0.5

const LS_KEY = 'flappy-toast-highscore'

const PIXEL_FONT = "'Press Start 2P', monospace"

interface Star {
  x: number
  y: number
  r: number
  brightness: number
  speed: number
}

interface Pipe {
  x: number
  y: number
  width: number
  height: number
  isTop: boolean
  passed: boolean
}

function createStars(): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < STAR_COUNT; i++) {
    const depth = Math.random()
    stars.push({
      x: Math.random() * BOARD_W,
      y: Math.random() * BOARD_H,
      r: 0.4 + depth * 1.4,
      brightness: 0.3 + depth * 0.7,
      speed: (0.1 + depth * 0.4) * STAR_PARALLAX,
    })
  }
  return stars
}

export function FlappyToast({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [highScore, setHighScore] = useState(() => {
    const stored = localStorage.getItem(LS_KEY)
    return stored ? parseInt(stored, 10) : 0
  })
  const gameRef = useRef({
    toastY: BOARD_H / 2,
    velY: 0,
    pipes: [] as Pipe[],
    score: 0,
    gameOver: false,
    started: false,
    frameId: 0,
    pipeTimer: 0,
    lastTime: 0,
    stars: createStars(),
    starOffset: 0,
    level: 0,
    transitionPhase: 'none' as TransitionPhase,
    announceTimer: 0,
    drainSpeed: -2.5,
  })
  const toastImgRef = useRef<HTMLImageElement | null>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const img = new Image()
    img.src = '/assets/sneaky-toast-clean.png'
    img.onload = () => { toastImgRef.current = img }
    return () => { toastImgRef.current = null }
  }, [])

  const placePipes = useCallback(() => {
    const g = gameRef.current
    const cfg = getLevelConfig(g.level)
    const randomY = -PIPE_H / 4 - Math.random() * (PIPE_H / 2)
    g.pipes.push({
      x: BOARD_W, y: randomY,
      width: PIPE_W, height: PIPE_H,
      isTop: true, passed: false,
    })
    g.pipes.push({
      x: BOARD_W, y: randomY + PIPE_H + cfg.gap,
      width: PIPE_W, height: PIPE_H,
      isTop: false, passed: false,
    })
  }, [])

  const resetGame = useCallback(() => {
    const g = gameRef.current
    g.toastY = BOARD_H / 2
    g.velY = 0
    g.pipes = []
    g.score = 0
    g.gameOver = false
    g.started = true
    g.pipeTimer = 0
    g.lastTime = performance.now()
    g.starOffset = 0
    g.level = 0
    g.transitionPhase = 'none'
    g.announceTimer = 0
    g.drainSpeed = getLevelConfig(0).speed
    forceUpdate(n => n + 1)
  }, [])

  const flap = useCallback(() => {
    const g = gameRef.current
    if (g.gameOver) {
      resetGame()
      return
    }
    if (!g.started) {
      g.started = true
      g.lastTime = performance.now()
    }
    g.velY = JUMP_VEL
  }, [resetGame])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        flap()
      }
      if (e.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flap, onClose])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = BOARD_W
    canvas.height = BOARD_H

    const collision = (
      ax: number, ay: number, aw: number, ah: number,
      bx: number, by: number, bw: number, bh: number,
    ) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

    const loop = () => {
      const g = gameRef.current
      g.frameId = requestAnimationFrame(loop)

      const now = performance.now()
      if (!g.started || g.gameOver) {
        g.lastTime = now
      }

      ctx.clearRect(0, 0, BOARD_W, BOARD_H)

      // Galaxy starfield background
      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, BOARD_W, BOARD_H)
      if (g.started && !g.gameOver) g.starOffset += STAR_PARALLAX
      for (const s of g.stars) {
        const sx = ((s.x - g.starOffset * s.speed) % BOARD_W + BOARD_W) % BOARD_W
        ctx.beginPath()
        ctx.arc(sx, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 210, 255, ${s.brightness})`
        ctx.fill()
      }

      if (g.started && !g.gameOver) {
        const dt = 1 / FPS
        const nextLevel = getLevelIndex(Math.floor(g.score))
        const activeCfg = getLevelConfig(g.level)

        // Toast physics always active
        g.velY += GRAVITY
        if (g.velY > TERMINAL_VEL) g.velY = TERMINAL_VEL
        g.toastY += g.velY
        g.toastY = Math.max(g.toastY, 0)
        if (g.toastY > BOARD_H) g.gameOver = true

        // Detect level-up: enter draining phase
        if (g.transitionPhase === 'none' && nextLevel > g.level) {
          g.transitionPhase = 'draining'
          g.drainSpeed = activeCfg.speed
          g.pipeTimer = 0
        }

        if (g.transitionPhase === 'draining') {
          // Keep moving existing pipes at old speed, no new spawns
          for (let i = g.pipes.length - 1; i >= 0; i--) {
            const p = g.pipes[i]
            p.x += g.drainSpeed

            if (!p.passed && TOAST_X > p.x + p.width) {
              p.passed = true
              g.score += 0.5
            }
            if (collision(TOAST_X, g.toastY, TOAST_W, TOAST_H, p.x, p.y, p.width, p.height)) {
              g.gameOver = true
            }
            if (p.x + p.width < 0) {
              g.pipes.splice(i, 1)
            }
          }

          // Once all pipes have cleared, start announcing
          if (g.pipes.length === 0) {
            g.transitionPhase = 'announcing'
            g.level = nextLevel
            g.announceTimer = LEVEL_ANNOUNCE_DURATION + LEVEL_FADE_OUT
          }
        } else if (g.transitionPhase === 'announcing') {
          g.announceTimer -= dt
          if (g.announceTimer <= 0) {
            g.transitionPhase = 'none'
            g.announceTimer = 0
            g.pipeTimer = 0
          }
        } else {
          // Normal gameplay
          g.pipeTimer += 1000 / FPS
          if (g.pipeTimer >= activeCfg.interval) {
            g.pipeTimer -= activeCfg.interval
            placePipes()
          }

          for (let i = g.pipes.length - 1; i >= 0; i--) {
            const p = g.pipes[i]
            p.x += activeCfg.speed

            if (!p.passed && TOAST_X > p.x + p.width) {
              p.passed = true
              g.score += 0.5
            }
            if (collision(TOAST_X, g.toastY, TOAST_W, TOAST_H, p.x, p.y, p.width, p.height)) {
              g.gameOver = true
            }
            if (p.x + p.width < 0) {
              g.pipes.splice(i, 1)
            }
          }
        }

        if (g.gameOver) {
          const finalScore = Math.floor(g.score)
          if (finalScore > highScore) {
            setHighScore(finalScore)
            localStorage.setItem(LS_KEY, String(finalScore))
          }
          forceUpdate(n => n + 1)
        }
      }

      // Draw classic green pipes
      for (const p of g.pipes) {
        const lipX = p.x - (LIP_W - PIPE_W) / 2
        const lipY = p.isTop ? p.y + p.height - LIP_H : p.y

        // Pipe body
        ctx.fillStyle = PIPE_BODY
        ctx.fillRect(p.x, p.y, p.width, p.height)
        // Left highlight
        ctx.fillStyle = PIPE_LIGHT
        ctx.fillRect(p.x + 3, p.y, 8, p.height)
        // Right shadow
        ctx.fillStyle = PIPE_DARK
        ctx.fillRect(p.x + p.width - 8, p.y, 8, p.height)
        // Body outline
        ctx.strokeStyle = PIPE_OUTLINE
        ctx.lineWidth = 2
        ctx.strokeRect(p.x, p.y, p.width, p.height)

        // Lip / cap
        ctx.fillStyle = PIPE_BODY
        ctx.fillRect(lipX, lipY, LIP_W, LIP_H)
        ctx.fillStyle = PIPE_LIGHT
        ctx.fillRect(lipX + 3, lipY, 10, LIP_H)
        ctx.fillStyle = PIPE_DARK
        ctx.fillRect(lipX + LIP_W - 10, lipY, 10, LIP_H)
        ctx.strokeStyle = PIPE_OUTLINE
        ctx.lineWidth = 2
        ctx.strokeRect(lipX, lipY, LIP_W, LIP_H)
      }

      // Draw toast with tilt
      const tiltDeg = g.velY < 0 ? -20 : Math.min(g.velY * 4, 60)
      const tiltRad = (tiltDeg * Math.PI) / 180
      const img = toastImgRef.current
      ctx.save()
      ctx.translate(TOAST_X + TOAST_W / 2, g.toastY + TOAST_H / 2)
      ctx.rotate(tiltRad)
      if (img) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          img,
          0, 0, TOAST_SRC_SIZE, TOAST_SRC_SIZE,
          -TOAST_W / 2, -TOAST_H / 2, TOAST_W, TOAST_H,
        )
      } else {
        ctx.fillStyle = '#f5c542'
        ctx.fillRect(-TOAST_W / 2, -TOAST_H / 2, TOAST_W, TOAST_H)
      }
      ctx.restore()

      // HUD
      ctx.font = `16px ${PIXEL_FONT}`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      if (g.gameOver) {
        ctx.textAlign = 'center'
        ctx.font = `14px ${PIXEL_FONT}`
        ctx.fillText('GAME OVER', BOARD_W / 2, BOARD_H / 2 - 40)
        ctx.font = `12px ${PIXEL_FONT}`
        ctx.fillText(`Score: ${Math.floor(g.score)}`, BOARD_W / 2, BOARD_H / 2)
        ctx.fillText(`Best: ${Math.max(highScore, Math.floor(g.score))}`, BOARD_W / 2, BOARD_H / 2 + 30)
        ctx.font = `9px ${PIXEL_FONT}`
        ctx.fillStyle = '#aaa'
        ctx.fillText('SPACE to retry', BOARD_W / 2, BOARD_H / 2 + 70)
      } else if (!g.started) {
        ctx.textAlign = 'center'
        ctx.font = `12px ${PIXEL_FONT}`
        ctx.fillText('FLAPPY TOAST', BOARD_W / 2, BOARD_H / 2 - 50)
        ctx.font = `9px ${PIXEL_FONT}`
        ctx.fillStyle = '#aaa'
        ctx.fillText('SPACE or CLICK', BOARD_W / 2, BOARD_H / 2 - 10)
        ctx.fillText('to flap', BOARD_W / 2, BOARD_H / 2 + 10)
        if (highScore > 0) {
          ctx.fillStyle = '#f5c542'
          ctx.fillText(`Best: ${highScore}`, BOARD_W / 2, BOARD_H / 2 + 50)
        }
      } else {
        // Score top-left
        ctx.fillText(String(Math.floor(g.score)), 12, 12)

        // Level top-right
        ctx.textAlign = 'right'
        ctx.font = `9px ${PIXEL_FONT}`
        ctx.fillStyle = '#8AD440'
        ctx.fillText(`LV ${g.level + 1}`, BOARD_W - 12, 14)

        // Level transition announcement (draining teaser + announcing with fade)
        const showAnnounce = g.transitionPhase === 'announcing' || g.transitionPhase === 'draining'
        if (showAnnounce) {
          const displayLevel = g.transitionPhase === 'draining'
            ? getLevelIndex(Math.floor(g.score))
            : g.level
          const displayCfg = getLevelConfig(displayLevel)
          let alpha = 1
          if (g.transitionPhase === 'announcing') {
            if (g.announceTimer <= LEVEL_FADE_OUT) {
              alpha = Math.max(0, g.announceTimer / LEVEL_FADE_OUT)
            } else {
              const elapsed = (LEVEL_ANNOUNCE_DURATION + LEVEL_FADE_OUT) - g.announceTimer
              alpha = Math.min(1, elapsed / 0.3)
            }
          } else {
            alpha = 0.5
          }
          ctx.textAlign = 'center'
          ctx.font = `18px ${PIXEL_FONT}`
          ctx.fillStyle = `rgba(138, 212, 64, ${alpha})`
          ctx.fillText(`LEVEL ${displayLevel + 1}`, BOARD_W / 2, BOARD_H / 2 - 20)
          if (displayCfg.subtitle) {
            ctx.font = `8px ${PIXEL_FONT}`
            ctx.fillStyle = `rgba(200, 210, 255, ${alpha * 0.7})`
            ctx.fillText(displayCfg.subtitle, BOARD_W / 2, BOARD_H / 2 + 15)
          }
        }
      }
    }

    const game = gameRef.current
    game.frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(game.frameId)
  }, [placePipes, highScore])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          width={BOARD_W}
          height={BOARD_H}
          onClick={flap}
          className="rounded-2xl border-2 border-white/20 shadow-2xl cursor-pointer"
          style={{ imageRendering: 'pixelated' }}
        />
        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-black/60 px-4 py-2 font-mono text-xs text-stone-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          ESC to close
        </button>
      </div>
    </div>
  )
}

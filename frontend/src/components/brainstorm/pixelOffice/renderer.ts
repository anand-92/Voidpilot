/** Mini office renderer — draws floor, furniture, and characters on canvas */
import { getCachedSprite } from './spriteCache'
import { getCharacterSprites, BUBBLE_WORKING_SPRITE, BUBBLE_LISTENING_SPRITE } from './spriteData'
import type { Character, FurnitureInstance, SpriteData } from './types'
import { CharacterState, TILE_SIZE } from './types'

const CHARACTER_SITTING_OFFSET = 6

function getCharacterSpriteFrame(ch: Character): SpriteData {
  const sprites = getCharacterSprites(ch.palette)
  if (ch.state === CharacterState.TYPE) {
    return sprites.typing[ch.dir][ch.frame % 2]
  }
  return sprites.walk[ch.dir][ch.frame % 4]
}

interface ZDrawable {
  zY: number
  draw: (ctx: CanvasRenderingContext2D) => void
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  cols: number,
  rows: number,
  furniture: FurnitureInstance[],
  characters: Character[],
  zoom: number,
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const mapW = cols * TILE_SIZE * zoom
  const mapH = rows * TILE_SIZE * zoom
  const offsetX = Math.floor((canvasWidth - mapW) / 2)
  const offsetY = Math.floor((canvasHeight - mapH) / 2)

  // Draw floor tiles
  const s = TILE_SIZE * zoom
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Alternating floor pattern
      ctx.fillStyle = (r + c) % 2 === 0 ? '#3a3524' : '#342f20'
      ctx.fillRect(offsetX + c * s, offsetY + r * s, s, s)
    }
  }

  // Dark wall strip at top
  for (let c = 0; c < cols; c++) {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(offsetX + c * s, offsetY - s, s, s)
  }

  // Z-sorted drawables
  const drawables: ZDrawable[] = []

  // Furniture
  for (const f of furniture) {
    const cached = getCachedSprite(f.sprite, zoom)
    const fx = offsetX + f.x * zoom
    const fy = offsetY + f.y * zoom
    drawables.push({
      zY: f.zY,
      draw: (c) => c.drawImage(cached, fx, fy),
    })
  }

  // Characters
  for (const ch of characters) {
    const spriteData = getCharacterSpriteFrame(ch)
    const cached = getCachedSprite(spriteData, zoom)
    const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET : 0
    const drawX = Math.round(offsetX + ch.x * zoom - cached.width / 2)
    const drawY = Math.round(offsetY + (ch.y + sittingOffset) * zoom - cached.height)
    const charZY = ch.y + TILE_SIZE / 2 + 0.5

    drawables.push({
      zY: charZY,
      draw: (c) => c.drawImage(cached, drawX, drawY),
    })

    // Speech bubbles
    if (ch.bubbleType) {
      const bubbleSprite = ch.bubbleType === 'working' ? BUBBLE_WORKING_SPRITE : BUBBLE_LISTENING_SPRITE
      const bubbleCached = getCachedSprite(bubbleSprite, zoom)
      const bx = Math.round(offsetX + ch.x * zoom - bubbleCached.width / 2)
      const by = Math.round(
        offsetY + (ch.y + sittingOffset - 24) * zoom - bubbleCached.height - zoom,
      )
      drawables.push({
        zY: charZY + 100, // always on top
        draw: (c) => c.drawImage(bubbleCached, bx, by),
      })
    }
  }

  drawables.sort((a, b) => a.zY - b.zY)
  for (const d of drawables) {
    d.draw(ctx)
  }

  // Agent name labels below characters
  for (const ch of characters) {
    const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET : 0
    const labelX = offsetX + ch.x * zoom
    const labelY = offsetY + (ch.y + sittingOffset) * zoom + 4 * zoom
    ctx.font = `bold ${Math.max(8, zoom * 3)}px monospace`
    ctx.textAlign = 'center'
    ctx.fillStyle = ch.palette === 0 || ch.palette === 1 ? '#3b82f6' : '#60a5fa'
    ctx.fillText(ch.name, labelX, labelY)
    ctx.font = `${Math.max(6, zoom * 2.5)}px monospace`
    ctx.fillStyle = '#888'
    ctx.fillText(ch.role, labelX, labelY + zoom * 3.5)
  }
}

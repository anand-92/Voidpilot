/** Character & furniture sprite data — ported from pixel-agents */
import type { CharacterSprites, SpriteData } from './types'
import { Direction as Dir } from './types'

const _ = '' // transparent

// ── Character Palettes ──────────────────────────────────────
const PALETTES = [
  { skin: '#FFCC99', shirt: '#4488CC', pants: '#334466', hair: '#553322', shoes: '#222222' },
  { skin: '#FFCC99', shirt: '#CC4444', pants: '#333333', hair: '#FFD700', shoes: '#222222' },
  { skin: '#DEB887', shirt: '#44AA66', pants: '#334444', hair: '#222222', shoes: '#333333' },
  { skin: '#FFCC99', shirt: '#AA55CC', pants: '#443355', hair: '#AA4422', shoes: '#222222' },
  { skin: '#DEB887', shirt: '#CCAA33', pants: '#444433', hair: '#553322', shoes: '#333333' },
  { skin: '#FFCC99', shirt: '#FF8844', pants: '#443322', hair: '#111111', shoes: '#222222' },
] as const

type PalKey = 'hair' | 'skin' | 'shirt' | 'pants' | 'shoes'
type Cell = PalKey | '#FFFFFF' | typeof _

const H: Cell = 'hair', K: Cell = 'skin', S: Cell = 'shirt', P: Cell = 'pants', O: Cell = 'shoes'
const E: Cell = '#FFFFFF'

function resolve(template: Cell[][], pi: number): SpriteData {
  const p = PALETTES[pi % PALETTES.length]
  return template.map(row => row.map(c => {
    if (c === _) return ''
    if (c === '#FFFFFF') return '#FFFFFF'
    return p[c as PalKey]
  }))
}
function flip(template: Cell[][]): Cell[][] { return template.map(r => [...r].reverse()) }
function flipS(sprite: SpriteData): SpriteData { return sprite.map(r => [...r].reverse()) }

// ── Down Walk (standing frame) ──────────────────────────────
const WALK_D_STAND: Cell[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,_,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,E,K,K,E,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,S,S,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,S,S,_,_,_,_],
  [_,_,_,_,K,S,S,S,S,S,S,K,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  [_,_,_,_,_,P,P,P,P,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,_,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,_,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,_,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,O,O,_,_,O,O,_,_,_,_,_],
  [_,_,_,_,_,O,O,_,_,O,O,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

const WALK_D_STEP: Cell[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,_,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,E,K,K,E,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,S,S,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,S,S,_,_,_,_],
  [_,_,_,_,K,S,S,S,S,S,S,K,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  [_,_,_,_,_,P,P,P,P,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,P,P,P,P,_,_,_,_,_],
  [_,_,_,_,P,P,_,_,_,_,P,P,_,_,_,_],
  [_,_,_,_,P,P,_,_,_,_,P,P,_,_,_,_],
  [_,_,_,_,O,O,_,_,_,_,_,O,O,_,_,_],
  [_,_,_,_,O,O,_,_,_,_,_,O,O,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// ── Down Type (sitting, arms on keyboard) ───────────────────
const TYPE_D_1: Cell[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,_,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,E,K,K,E,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,S,S,_,_,_,_],
  [_,_,_,K,K,S,S,S,S,S,S,K,K,_,_,_],
  [_,_,_,_,K,S,S,S,S,S,S,K,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  [_,_,_,_,_,P,P,P,P,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,P,P,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,_,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,O,O,_,_,O,O,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

const TYPE_D_2: Cell[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,_,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,H,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,E,K,K,E,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,S,S,S,S,S,S,S,S,_,_,_,_],
  [_,_,_,_,K,S,S,S,S,S,S,K,K,_,_,_],
  [_,_,_,_,K,S,S,S,S,S,S,_,K,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  [_,_,_,_,_,P,P,P,P,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,P,P,P,P,_,_,_,_,_],
  [_,_,_,_,_,P,P,_,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,O,O,_,_,O,O,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// ── Right Walk ──────────────────────────────────────────────
const WALK_R_STAND: Cell[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,E,K,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,K,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,K,S,S,S,S,K,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,P,P,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,_,P,P,_,_,_,_,_],
  [_,_,_,_,_,_,O,O,_,O,O,_,_,_,_,_],
  [_,_,_,_,_,_,O,O,_,O,O,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

const WALK_R_STEP: Cell[][] = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,_,H,H,H,H,H,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,E,K,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,K,K,_,_,_,_,_],
  [_,_,_,_,_,_,K,K,K,K,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,S,S,S,S,S,S,_,_,_,_,_],
  [_,_,_,_,_,K,S,S,S,S,K,_,_,_,_,_],
  [_,_,_,_,_,_,S,S,S,S,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,P,P,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  [_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_],
  [_,_,_,_,_,P,P,_,_,_,P,P,_,_,_,_],
  [_,_,_,_,_,P,P,_,_,_,P,P,_,_,_,_],
  [_,_,_,_,_,O,O,_,_,_,_,O,O,_,_,_],
  [_,_,_,_,_,O,O,_,_,_,_,O,O,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

// ── Build character sprites for a palette index ─────────────
const spriteCache = new Map<number, CharacterSprites>()

export function getCharacterSprites(paletteIndex: number): CharacterSprites {
  const cached = spriteCache.get(paletteIndex)
  if (cached) return cached

  const r = (t: Cell[][]) => resolve(t, paletteIndex)
  const rf = (t: Cell[][]) => resolve(flip(t), paletteIndex)

  const sprites: CharacterSprites = {
    walk: {
      [Dir.DOWN]: [r(WALK_D_STEP), r(WALK_D_STAND), flipS(r(WALK_D_STEP)), r(WALK_D_STAND)],
      [Dir.UP]: [r(WALK_D_STEP), r(WALK_D_STAND), flipS(r(WALK_D_STEP)), r(WALK_D_STAND)],
      [Dir.RIGHT]: [r(WALK_R_STEP), r(WALK_R_STAND), flipS(r(WALK_R_STEP)), r(WALK_R_STAND)],
      [Dir.LEFT]: [rf(WALK_R_STEP), rf(WALK_R_STAND), flipS(rf(WALK_R_STEP)), rf(WALK_R_STAND)],
    },
    typing: {
      [Dir.DOWN]: [r(TYPE_D_1), r(TYPE_D_2)],
      [Dir.UP]: [r(TYPE_D_1), r(TYPE_D_2)],
      [Dir.RIGHT]: [r(TYPE_D_1), r(TYPE_D_2)],
      [Dir.LEFT]: [rf(TYPE_D_1), rf(TYPE_D_2)],
    },
  }
  spriteCache.set(paletteIndex, sprites)
  return sprites
}

// ── Furniture Sprites ───────────────────────────────────────

export const DESK_SPRITE: SpriteData = (() => {
  const W = '#8B6914', L = '#A07828', S = '#B8922E', D = '#6B4E0A'
  const rows: string[][] = []
  rows.push(new Array(32).fill(_))
  rows.push([_, ...new Array(30).fill(W), _])
  for (let r = 0; r < 4; r++) rows.push([_, W, ...new Array(28).fill(r < 1 ? L : S), W, _])
  rows.push([_, D, ...new Array(28).fill(W), D, _])
  for (let r = 0; r < 6; r++) rows.push([_, W, ...new Array(28).fill(S), W, _])
  rows.push([_, W, ...new Array(28).fill(L), W, _])
  for (let r = 0; r < 6; r++) rows.push([_, W, ...new Array(28).fill(S), W, _])
  rows.push([_, D, ...new Array(28).fill(W), D, _])
  for (let r = 0; r < 4; r++) rows.push([_, W, ...new Array(28).fill(r > 2 ? L : S), W, _])
  rows.push([_, ...new Array(30).fill(W), _])
  for (let r = 0; r < 4; r++) {
    const row = new Array(32).fill(_) as string[]
    row[1] = D; row[2] = D; row[29] = D; row[30] = D
    rows.push(row)
  }
  rows.push(new Array(32).fill(_))
  rows.push(new Array(32).fill(_))
  return rows
})()

export const CHAIR_SPRITE: SpriteData = (() => {
  const W = '#8B6914', D = '#6B4E0A', B = '#5C3D0A', S = '#A07828'
  return [
    [_,_,_,_,_,D,D,D,D,D,D,_,_,_,_,_],
    [_,_,_,_,D,B,B,B,B,B,B,D,_,_,_,_],
    [_,_,_,_,D,B,S,S,S,S,B,D,_,_,_,_],
    [_,_,_,_,D,B,S,S,S,S,B,D,_,_,_,_],
    [_,_,_,_,D,B,S,S,S,S,B,D,_,_,_,_],
    [_,_,_,_,D,B,S,S,S,S,B,D,_,_,_,_],
    [_,_,_,_,D,B,S,S,S,S,B,D,_,_,_,_],
    [_,_,_,_,D,B,S,S,S,S,B,D,_,_,_,_],
    [_,_,_,_,D,B,S,S,S,S,B,D,_,_,_,_],
    [_,_,_,_,D,B,B,B,B,B,B,D,_,_,_,_],
    [_,_,_,_,_,D,D,D,D,D,D,_,_,_,_,_],
    [_,_,_,_,_,_,D,W,W,D,_,_,_,_,_,_],
    [_,_,_,_,_,_,D,W,W,D,_,_,_,_,_,_],
    [_,_,_,_,_,D,D,D,D,D,D,_,_,_,_,_],
    [_,_,_,_,_,D,_,_,_,_,D,_,_,_,_,_],
    [_,_,_,_,_,D,_,_,_,_,D,_,_,_,_,_],
  ]
})()

export const PC_SPRITE: SpriteData = (() => {
  const F = '#555555', S = '#3A3A5C', B = '#6688CC', D = '#444444'
  return [
    [_,_,_,F,F,F,F,F,F,F,F,F,F,_,_,_],
    [_,_,_,F,S,S,S,S,S,S,S,S,F,_,_,_],
    [_,_,_,F,S,B,B,B,B,B,B,S,F,_,_,_],
    [_,_,_,F,S,B,B,B,B,B,B,S,F,_,_,_],
    [_,_,_,F,S,B,B,B,B,B,B,S,F,_,_,_],
    [_,_,_,F,S,B,B,B,B,B,B,S,F,_,_,_],
    [_,_,_,F,S,B,B,B,B,B,B,S,F,_,_,_],
    [_,_,_,F,S,B,B,B,B,B,B,S,F,_,_,_],
    [_,_,_,F,S,S,S,S,S,S,S,S,F,_,_,_],
    [_,_,_,F,F,F,F,F,F,F,F,F,F,_,_,_],
    [_,_,_,_,_,_,_,D,D,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,D,D,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,D,D,D,D,_,_,_,_,_,_],
    [_,_,_,_,_,D,D,D,D,D,D,_,_,_,_,_],
    [_,_,_,_,_,D,D,D,D,D,D,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

export const PLANT_SPRITE: SpriteData = (() => {
  const G = '#3D8B37', D = '#2D6B27', T = '#6B4E0A', P = '#B85C3A', R = '#8B4422'
  return [
    [_,_,_,_,_,_,G,G,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,G,G,G,G,_,_,_,_,_,_,_],
    [_,_,_,_,G,G,D,G,G,G,_,_,_,_,_,_],
    [_,_,_,G,G,D,G,G,D,G,G,_,_,_,_,_],
    [_,_,G,G,G,G,G,G,G,G,G,G,_,_,_,_],
    [_,G,G,D,G,G,G,G,G,G,D,G,G,_,_,_],
    [_,G,G,G,G,D,G,G,D,G,G,G,G,_,_,_],
    [_,_,G,G,G,G,G,G,G,G,G,G,_,_,_,_],
    [_,_,_,G,G,G,D,G,G,G,G,_,_,_,_,_],
    [_,_,_,_,G,G,G,G,G,G,_,_,_,_,_,_],
    [_,_,_,_,_,G,G,G,G,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,T,T,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,T,T,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,T,T,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,R,R,R,R,R,_,_,_,_,_,_],
    [_,_,_,_,R,P,P,P,P,P,R,_,_,_,_,_],
    [_,_,_,_,R,P,P,P,P,P,R,_,_,_,_,_],
    [_,_,_,_,R,P,P,P,P,P,R,_,_,_,_,_],
    [_,_,_,_,R,P,P,P,P,P,R,_,_,_,_,_],
    [_,_,_,_,R,P,P,P,P,P,R,_,_,_,_,_],
    [_,_,_,_,R,P,P,P,P,P,R,_,_,_,_,_],
    [_,_,_,_,_,R,P,P,P,R,_,_,_,_,_,_],
    [_,_,_,_,_,_,R,R,R,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

// ── Speech Bubble ───────────────────────────────────────────
export const BUBBLE_WORKING_SPRITE: SpriteData = (() => {
  const B = '#555566', F = '#EEEEFF', A = '#CCA700'
  return [
    [B,B,B,B,B,B,B,B,B,B,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,A,F,A,F,A,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,B,B,B,B,B,B,B,B,B,B],
    [_,_,_,_,B,B,B,_,_,_,_],
    [_,_,_,_,_,B,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

export const BUBBLE_LISTENING_SPRITE: SpriteData = (() => {
  const B = '#555566', F = '#EEEEFF', G = '#44BB66'
  return [
    [_,B,B,B,B,B,B,B,B,B,_],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,G,F,B],
    [B,F,F,F,F,F,F,G,F,F,B],
    [B,F,F,G,F,F,G,F,F,F,B],
    [B,F,F,F,G,G,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [_,B,B,B,B,B,B,B,B,B,_],
    [_,_,_,_,B,B,B,_,_,_,_],
    [_,_,_,_,_,B,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

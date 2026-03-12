/** Ported from pixel-agents — core types for the mini office scene */

export const TILE_SIZE = 16

/** 2D array of hex color strings (or '' for transparent). [row][col] */
export type SpriteData = string[][]

export const CharacterState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
} as const
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState]

export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const
export type Direction = (typeof Direction)[keyof typeof Direction]

export interface Character {
  id: number
  name: string
  role: string
  state: CharacterState
  dir: Direction
  x: number
  y: number
  tileCol: number
  tileRow: number
  palette: number
  frame: number
  frameTimer: number
  wanderTimer: number
  isActive: boolean
  bubbleType: 'working' | 'listening' | null
  bubbleTimer: number
}

export interface FurnitureInstance {
  sprite: SpriteData
  x: number
  y: number
  zY: number
}

export interface CharacterSprites {
  walk: Record<Direction, SpriteData[]>
  typing: Record<Direction, SpriteData[]>
}

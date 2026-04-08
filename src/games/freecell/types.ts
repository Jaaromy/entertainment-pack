import { Card } from '@/shared/types'

export type GameStatus = 'playing' | 'won'

export type CardLocation =
  | { area: 'tableau'; pile: number; cardIndex: number }
  | { area: 'freecell'; cell: number }
  | { area: 'foundation'; pile: number }

export interface Selection {
  location: CardLocation
  cards: Card[]
}

export interface FreeCellState {
  tableau: Card[][]
  freeCells: (Card | null)[]
  foundations: Card[][]
  moves: number
  seed: number
  status: GameStatus
}

export interface FreeCellWithHistory {
  readonly states: readonly FreeCellState[]
  readonly index: number
}

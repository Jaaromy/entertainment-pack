import { Card, Suit, Rank } from '@/shared/types'
import { RED_SUITS } from '@/shared/constants'
import { createShuffledDeck } from '@/shared/deck'
import { FreeCellState, GameStatus } from './types'
import {
  TABLEAU_SIZE,
  FREE_CELL_COUNT,
  FOUNDATION_SIZE,
  DECK_SIZE,
  AUTO_MOVE_THRESHOLD,
} from './constants'

export function createInitialState(seed: number): FreeCellState {
  const deck = createShuffledDeck(seed)

  // Deal into 8 piles: piles 0-3 get 7 cards, piles 4-7 get 6 cards
  const tableau: Card[][] = Array.from({ length: TABLEAU_SIZE }, () => [])
  for (let i = 0; i < DECK_SIZE; i++) {
    const pileIndex = i % TABLEAU_SIZE
    const card = { ...deck[i], faceUp: true }
    tableau[pileIndex].push(card)
  }

  return {
    tableau,
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    moves: 0,
    seed,
    status: 'playing',
  }
}

export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) {
    return card.rank === 1 // Ace
  }
  const topCard = foundation[foundation.length - 1]
  return card.suit === topCard.suit && card.rank === topCard.rank + 1
}

export function canPlaceOnTableau(card: Card, tableau: Card[]): boolean {
  if (tableau.length === 0) {
    return true // Empty pile accepts any card
  }
  const topCard = tableau[tableau.length - 1]
  // Descending rank
  if (card.rank >= topCard.rank) {
    return false
  }
  // Alternating color
  const cardIsRed = RED_SUITS.includes(card.suit)
  const topIsRed = RED_SUITS.includes(topCard.suit)
  return cardIsRed !== topIsRed
}

export function countFreeCells(state: FreeCellState): number {
  return state.freeCells.filter((c) => c === null).length
}

export function countEmptyTableauPiles(state: FreeCellState): number {
  return state.tableau.filter((pile) => pile.length === 0).length
}

export function maxMovableCards(
  state: FreeCellState,
  targetIsEmpty: boolean,
): number {
  const emptyFreeCells = countFreeCells(state)
  const emptyTableau = countEmptyTableauPiles(state)
  const effectiveEmpty = targetIsEmpty ? emptyTableau - 1 : emptyTableau
  return (emptyFreeCells + 1) * Math.pow(2, Math.max(0, effectiveEmpty))
}

export function moveToFreeCell(
  state: FreeCellState,
  fromArea: 'tableau' | 'foundation',
  fromIndex: number,
): FreeCellState | null {
  // Find first empty free cell
  const cellIndex = state.freeCells.findIndex((c) => c === null)
  if (cellIndex === -1) {
    return null // No empty free cells
  }

  let card: Card | null = null

  if (fromArea === 'tableau') {
    const pile = state.tableau[fromIndex]
    if (pile.length === 0) return null
    card = pile[pile.length - 1]
  } else if (fromArea === 'foundation') {
    const pile = state.foundations[fromIndex]
    if (pile.length === 0) return null
    card = pile[pile.length - 1]
  } else {
    return null
  }

  if (!card) return null

  const newState: FreeCellState = {
    ...state,
    tableau: state.tableau.map((p) => [...p]),
    freeCells: [...state.freeCells],
    foundations: state.foundations.map((p) => [...p]),
    moves: state.moves + 1,
  }

  if (fromArea === 'tableau') {
    newState.tableau[fromIndex] = newState.tableau[fromIndex].slice(0, -1)
  } else {
    newState.foundations[fromIndex] = newState.foundations[fromIndex].slice(0, -1)
  }

  newState.freeCells[cellIndex] = card

  return newState
}

export function moveFromFreeCell(
  state: FreeCellState,
  cellIndex: number,
  toArea: 'tableau' | 'foundation',
  toPile: number,
): FreeCellState | null {
  const card = state.freeCells[cellIndex]
  if (!card) return null

  let valid = false

  if (toArea === 'tableau') {
    valid = canPlaceOnTableau(card, state.tableau[toPile])
  } else if (toArea === 'foundation') {
    valid = canPlaceOnFoundation(card, state.foundations[toPile])
  }

  if (!valid) return null

  const newState: FreeCellState = {
    ...state,
    tableau: state.tableau.map((p) => [...p]),
    freeCells: [...state.freeCells],
    foundations: state.foundations.map((p) => [...p]),
    moves: state.moves + 1,
  }

  newState.freeCells[cellIndex] = null

  if (toArea === 'tableau') {
    newState.tableau[toPile] = [...newState.tableau[toPile], card]
  } else {
    newState.foundations[toPile] = [...newState.foundations[toPile], card]
  }

  return updateStatus(newState)
}

export function moveTableauToTableau(
  state: FreeCellState,
  fromPile: number,
  cardIndex: number,
  toPile: number,
): FreeCellState | null {
  if (fromPile === toPile) return null
  if (cardIndex < 0 || cardIndex >= state.tableau[fromPile].length) return null

  const srcPile = state.tableau[fromPile]
  const destPile = state.tableau[toPile]

  // Extract sequence
  const sequence = srcPile.slice(cardIndex)
  if (sequence.length === 0) return null

  // Validate sequence is valid (descending, alternating color)
  for (let i = 1; i < sequence.length; i++) {
    if (!canPlaceOnTableau(sequence[i], [sequence[i - 1]])) {
      return null
    }
  }

  // Check destination
  if (destPile.length > 0) {
    if (!canPlaceOnTableau(sequence[0], destPile)) {
      return null
    }
  }

  // Check supermove limit
  const targetIsEmpty = destPile.length === 0
  const maxCards = maxMovableCards(state, targetIsEmpty)
  if (sequence.length > maxCards) {
    return null
  }

  const newState: FreeCellState = {
    ...state,
    tableau: state.tableau.map((p) => [...p]),
    moves: state.moves + 1,
  }

  newState.tableau[fromPile] = srcPile.slice(0, cardIndex)
  newState.tableau[toPile] = [...destPile, ...sequence]

  return newState
}

export function moveTableauToFoundation(
  state: FreeCellState,
  fromPile: number,
  foundationIndex: number,
): FreeCellState | null {
  const pile = state.tableau[fromPile]
  if (pile.length === 0) return null

  const card = pile[pile.length - 1]
  if (!canPlaceOnFoundation(card, state.foundations[foundationIndex])) {
    return null
  }

  const newState: FreeCellState = {
    ...state,
    tableau: state.tableau.map((p) => [...p]),
    foundations: state.foundations.map((p) => [...p]),
    moves: state.moves + 1,
  }

  newState.tableau[fromPile] = pile.slice(0, -1)
  newState.foundations[foundationIndex] = [
    ...state.foundations[foundationIndex],
    card,
  ]

  return updateStatus(newState)
}

export function moveFreeCellToFoundation(
  state: FreeCellState,
  cellIndex: number,
  foundationIndex: number,
): FreeCellState | null {
  const card = state.freeCells[cellIndex]
  if (!card) return null

  if (!canPlaceOnFoundation(card, state.foundations[foundationIndex])) {
    return null
  }

  const newState: FreeCellState = {
    ...state,
    freeCells: [...state.freeCells],
    foundations: state.foundations.map((p) => [...p]),
    moves: state.moves + 1,
  }

  newState.freeCells[cellIndex] = null
  newState.foundations[foundationIndex] = [
    ...state.foundations[foundationIndex],
    card,
  ]

  return updateStatus(newState)
}

export function findFoundationTarget(state: FreeCellState, card: Card): number {
  for (let i = 0; i < FOUNDATION_SIZE; i++) {
    if (canPlaceOnFoundation(card, state.foundations[i])) {
      return i
    }
  }
  return -1
}

export function autoMoveToFoundation(state: FreeCellState): FreeCellState {
  let current = state

  // Keep trying to move safe cards until no more moves possible
  while (true) {
    let moved = false

    // Try free cells
    for (let i = 0; i < FREE_CELL_COUNT; i++) {
      if (current.freeCells[i] === null) continue
      const card = current.freeCells[i]!
      const foundationIndex = findFoundationTarget(current, card)
      if (foundationIndex !== -1 && isSafeToAutoMove(current, card)) {
        const result = moveFreeCellToFoundation(current, i, foundationIndex)
        if (result) {
          current = result
          moved = true
          break
        }
      }
    }

    if (moved) continue

    // Try tableau tops
    for (let i = 0; i < TABLEAU_SIZE; i++) {
      const pile = current.tableau[i]
      if (pile.length === 0) continue
      const card = pile[pile.length - 1]
      const foundationIndex = findFoundationTarget(current, card)
      if (foundationIndex !== -1 && isSafeToAutoMove(current, card)) {
        const result = moveTableauToFoundation(current, i, foundationIndex)
        if (result) {
          current = result
          moved = true
          break
        }
      }
    }

    if (!moved) break
  }

  return current
}

function isSafeToAutoMove(state: FreeCellState, card: Card): boolean {
  // Get min rank of opposite color in foundations
  const cardIsRed = RED_SUITS.includes(card.suit)
  let minOppositeRank = Infinity

  for (let i = 0; i < FOUNDATION_SIZE; i++) {
    const foundation = state.foundations[i]
    if (foundation.length === 0) continue
    const topCard = foundation[foundation.length - 1]
    const topIsRed = RED_SUITS.includes(topCard.suit)

    if (cardIsRed !== topIsRed) {
      minOppositeRank = Math.min(minOppositeRank, topCard.rank)
    }
  }

  // Safe if rank <= min_opposite + AUTO_MOVE_THRESHOLD
  if (minOppositeRank === Infinity) {
    // No opposite color cards in foundations yet — only Aces are safe
    return card.rank === 1
  }

  return card.rank <= minOppositeRank + AUTO_MOVE_THRESHOLD
}

function updateStatus(state: FreeCellState): FreeCellState {
  // Check if won: all foundations have 13 cards
  const won = state.foundations.every((f) => f.length === 13)
  return { ...state, status: won ? 'won' : 'playing' }
}

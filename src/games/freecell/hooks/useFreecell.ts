import { useEffect, useState, useRef } from 'react'
import { FreeCellState, CardLocation, FreeCellWithHistory } from '../types'
import {
  moveToFreeCell,
  moveFromFreeCell,
  moveTableauToTableau,
  moveTableauToFoundation,
} from '../gameLogic'
import {
  createGame,
  currentState,
  pushState,
  undo as undoState,
  canUndo as canUndoState,
  newGame,
} from '../gameReducer'
import {
  loadFreeCellGame,
  saveFreeCellGame,
  recordFreeCellResult,
} from '../storage'

export interface UseFreeCellReturn {
  state: FreeCellState
  canUndo: boolean
  onDrop(src: CardLocation, destArea: 'tableau' | 'freecell' | 'foundation', destPile: number): void
  doUndo(): void
  startNewGame(seed?: number): void
}

export function useFreecell(): UseFreeCellReturn {
  const gameRef = useRef<FreeCellWithHistory | null>(null)
  const [gameState, setGameState] = useState<FreeCellState | null>(null)
  const winRecordedRef = useRef(false)

  // Initialize game on mount
  useEffect(() => {
    const saved = loadFreeCellGame()
    if (saved && saved.status === 'playing') {
      gameRef.current = { states: [saved], index: 0 }
    } else {
      // Generate a new seed from timestamp
      const seed = Date.now() % 1000000
      gameRef.current = createGame(seed)
    }
    setGameState(currentState(gameRef.current))
  }, [])

  // Record win when status changes to 'won'
  useEffect(() => {
    if (!gameState || gameState.status !== 'won' || winRecordedRef.current) {
      return
    }
    winRecordedRef.current = true
    recordFreeCellResult(true)
  }, [gameState])

  function commit(newState: FreeCellState): void {
    if (!gameRef.current) return
    gameRef.current = pushState(gameRef.current, newState)
    setGameState(currentState(gameRef.current))
    saveFreeCellGame(currentState(gameRef.current))
  }

  function handleDrop(
    src: CardLocation,
    destArea: 'tableau' | 'freecell' | 'foundation',
    destPile: number,
  ): void {
    if (!gameState) return
    const destLocation: CardLocation =
      destArea === 'freecell'
        ? { area: 'freecell', cell: destPile }
        : destArea === 'foundation'
          ? { area: 'foundation', pile: destPile }
          : { area: 'tableau', pile: destPile, cardIndex: gameState.tableau[destPile].length }
    const newState = attemptMove(gameState, src, destLocation)
    if (newState) commit(newState)
  }

  function handleUndo(): void {
    if (!gameRef.current || !canUndoState(gameRef.current)) return
    gameRef.current = undoState(gameRef.current)
    const state = currentState(gameRef.current)
    setGameState(state)
    saveFreeCellGame(state)
    winRecordedRef.current = false // Reset win recording if undoing from won state
  }

  function handleStartNewGame(seed?: number): void {
    if (!gameRef.current) return
    const newSeed = seed ?? Date.now() % 1000000
    gameRef.current = newGame(gameRef.current, newSeed)
    const state = currentState(gameRef.current)
    setGameState(state)
    saveFreeCellGame(state)
    winRecordedRef.current = false
  }

  return {
    state: gameState || ({} as FreeCellState),
    canUndo: !!gameRef.current && canUndoState(gameRef.current),
    onDrop: handleDrop,
    doUndo: handleUndo,
    startNewGame: handleStartNewGame,
  }
}

function attemptMove(
  state: FreeCellState,
  from: CardLocation,
  to: CardLocation,
): FreeCellState | null {
  // Free cell to foundation or tableau
  if (from.area === 'freecell') {
    if (to.area === 'foundation') {
      return moveFromFreeCell(state, from.cell, 'foundation', to.pile)
    }
    if (to.area === 'tableau') {
      return moveFromFreeCell(state, from.cell, 'tableau', to.pile)
    }
    return null
  }

  // Tableau to free cell
  if (from.area === 'tableau' && to.area === 'freecell') {
    // Only top card can go to free cell
    const pile = state.tableau[from.pile]
    if (from.cardIndex !== pile.length - 1) {
      return null
    }
    return moveToFreeCell(state, 'tableau', from.pile)
  }

  // Tableau to foundation
  if (from.area === 'tableau' && to.area === 'foundation') {
    const pile = state.tableau[from.pile]
    if (from.cardIndex !== pile.length - 1) {
      return null // Only top card
    }
    return moveTableauToFoundation(state, from.pile, to.pile)
  }

  // Tableau to tableau
  if (from.area === 'tableau' && to.area === 'tableau') {
    return moveTableauToTableau(state, from.pile, from.cardIndex, to.pile)
  }

  // Foundation to free cell or tableau
  if (from.area === 'foundation') {
    if (to.area === 'freecell') {
      return moveToFreeCell(state, 'foundation', from.pile)
    }
    if (to.area === 'tableau') {
      // Manual foundation-to-tableau is rare but allowed
      const card = state.foundations[from.pile][state.foundations[from.pile].length - 1]
      if (!card) return null
      // For now, we'll skip this to keep simple. Users can go via free cell.
      return null
    }
  }

  return null
}

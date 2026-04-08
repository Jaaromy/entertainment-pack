import { useEffect, useState, useRef } from 'react'
import { FreeCellState, CardLocation, FreeCellWithHistory } from '../types'
import {
  moveToFreeCell,
  moveFromFreeCell,
  moveTableauToTableau,
  moveTableauToFoundation,
  moveFreeCellToFoundation,
  findFoundationTarget,
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
  clearFreeCellGame,
  recordFreeCellResult,
} from '../storage'

interface Selection {
  location: CardLocation
}

export interface UseFreeCellReturn {
  state: FreeCellState
  canUndo: boolean
  selection: Selection | null
  onCardClick(loc: CardLocation): void
  onEmptyClick(area: 'tableau' | 'freecell' | 'foundation', index: number): void
  onDrop(src: CardLocation, destArea: 'tableau' | 'freecell' | 'foundation', destPile: number): void
  doUndo(): void
  startNewGame(seed?: number): void
}

export function useFreecell(): UseFreeCellReturn {
  const gameRef = useRef<FreeCellWithHistory | null>(null)
  const [gameState, setGameState] = useState<FreeCellState | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
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

  function handleCardClick(location: CardLocation): void {
    if (!gameState) return

    // If clicking the same card already selected, deselect
    if (selection && locationsMatch(selection.location, location)) {
      setSelection(null)
      return
    }

    // If no selection, select this card
    if (!selection) {
      const hasCards = hasCardAtLocation(gameState, location)
      if (hasCards) {
        setSelection({ location })
      }
      return
    }

    // Try to move from selection to this location
    const newState = attemptMove(gameState, selection.location, location)
    if (newState) {
      commit(newState)
      setSelection(null)
    } else {
      // Invalid move — update selection to new card
      const hasCards = hasCardAtLocation(gameState, location)
      if (hasCards) {
        setSelection({ location })
      } else {
        setSelection(null)
      }
    }
  }

  function handleEmptyClick(
    area: 'tableau' | 'freecell' | 'foundation',
    index: number,
  ): void {
    if (!gameState || !selection) return

    const destLocation: CardLocation =
      area === 'freecell'
        ? { area: 'freecell', cell: index }
        : area === 'foundation'
          ? { area: 'foundation', pile: index }
          : { area: 'tableau', pile: index, cardIndex: gameState.tableau[index].length }

    const newState = attemptMove(gameState, selection.location, destLocation)
    if (newState) {
      commit(newState)
      setSelection(null)
    }
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
    if (newState) {
      commit(newState)
      setSelection(null)
    }
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
    setSelection(null)
    winRecordedRef.current = false
  }

  return {
    state: gameState || ({} as FreeCellState),
    canUndo: !!gameRef.current && canUndoState(gameRef.current),
    selection,
    onCardClick: handleCardClick,
    onEmptyClick: handleEmptyClick,
    onDrop: handleDrop,
    doUndo: handleUndo,
    startNewGame: handleStartNewGame,
  }
}

function hasCardAtLocation(state: FreeCellState, location: CardLocation): boolean {
  if (location.area === 'tableau') {
    const pile = state.tableau[location.pile]
    return location.cardIndex < pile.length
  }
  if (location.area === 'freecell') {
    return state.freeCells[location.cell] !== null
  }
  if (location.area === 'foundation') {
    return state.foundations[location.pile].length > 0
  }
  return false
}

function locationsMatch(a: CardLocation, b: CardLocation): boolean {
  if (a.area === 'tableau' && b.area === 'tableau') {
    return a.pile === b.pile && a.cardIndex === b.cardIndex
  }
  if (a.area === 'freecell' && b.area === 'freecell') {
    return a.cell === b.cell
  }
  if (a.area === 'foundation' && b.area === 'foundation') {
    return a.pile === b.pile
  }
  return false
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

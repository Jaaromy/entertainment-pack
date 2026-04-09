import { useEffect, useState, useRef } from 'react'
import { Card } from '@/shared/types'
import { SUITS } from '@/shared/constants'
import { FreeCellState, CardLocation, FreeCellWithHistory } from '../types'
import {
  moveToFreeCell,
  moveFromFreeCell,
  moveTableauToTableau,
  moveTableauToFoundation,
  canAutoComplete,
  autoCompleteStep,
} from '../gameLogic'
import {
  createMicrosoftGameHistory,
  currentState,
  pushState,
  undo as undoState,
  canUndo as canUndoState,
} from '../gameReducer'
import {
  loadFreeCellGame,
  saveFreeCellGame,
  recordFreeCellResult,
  resetFreeCellStats,
  loadFreeCellStats,
  DEFAULT_STATS,
  FreeCellStats,
} from '../storage'

export interface UseFreeCellReturn {
  state: FreeCellState
  stats: FreeCellStats
  previouslyBeaten: boolean
  canUndo: boolean
  onDrop(src: CardLocation, destArea: 'tableau' | 'freecell' | 'foundation', destPile: number): void
  onDoubleClick(loc: CardLocation): void
  doUndo(): void
  startNewGame(): void
  startGameNumber(n: number): void
  restartGame(): void
  resetStats(): void
  devCheatWin?: () => void
}

export function useFreecell(): UseFreeCellReturn {
  const gameRef = useRef<FreeCellWithHistory | null>(null)
  const [gameState, setGameState] = useState<FreeCellState | null>(null)
  const [stats, setStats] = useState<FreeCellStats>(DEFAULT_STATS)
  const winRecordedRef = useRef(false)

  // Initialize game and stats on mount
  useEffect(() => {
    const saved = loadFreeCellGame()
    if (saved && saved.status === 'playing') {
      gameRef.current = { states: [saved], index: 0 }
    } else {
      gameRef.current = createMicrosoftGameHistory(randomGameNumber())
    }
    setGameState(currentState(gameRef.current))
    setStats(loadFreeCellStats())
  }, [])

  function record(won: boolean, moves?: number, seed?: number): void {
    setStats(recordFreeCellResult(won, moves, seed))
  }

  // Record win when status changes to 'won'
  useEffect(() => {
    if (!gameState || gameState.status !== 'won' || winRecordedRef.current) {
      return
    }
    winRecordedRef.current = true
    record(true, gameState.moves, gameState.seed)
  }, [gameState])

  // Auto-complete: when all tableau piles are sorted, drain cards to foundation
  // one at a time with a short delay so the moves are visible.
  useEffect(() => {
    if (!gameState || !canAutoComplete(gameState)) return
    const timer = setTimeout(() => {
      if (!gameRef.current) return
      const state = currentState(gameRef.current)
      const next = autoCompleteStep(state)
      if (next) commit(next)
    }, 150)
    return () => clearTimeout(timer)
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

  function startGame(gameNumber: number): void {
    const cur = gameRef.current ? currentState(gameRef.current) : null
    if (cur && cur.status === 'playing' && !winRecordedRef.current) {
      const previouslyBeaten = cur.seed !== undefined && cur.seed in stats.gameBests
      if (!previouslyBeaten) {
        record(false, cur.moves, cur.seed)
      }
    }
    gameRef.current = createMicrosoftGameHistory(gameNumber)
    const state = currentState(gameRef.current)
    setGameState(state)
    saveFreeCellGame(state)
    winRecordedRef.current = false
  }

  function handleStartNewGame(): void {
    startGame(randomGameNumber())
  }

  function handleStartGameNumber(n: number): void {
    startGame(n)
  }

  function handleDoubleClick(loc: CardLocation): void {
    if (!gameState) return
    // Only top cards of tableau piles can be moved to a free cell via double-click
    if (loc.area !== 'tableau') return
    const pile = gameState.tableau[loc.pile]
    if (loc.cardIndex !== pile.length - 1) return
    const newState = moveToFreeCell(gameState, 'tableau', loc.pile)
    if (newState) commit(newState)
  }

  function handleRestartGame(): void {
    const cur = gameRef.current ? currentState(gameRef.current) : null
    if (!cur) return
    const seed = cur.seed
    gameRef.current = createMicrosoftGameHistory(seed)
    const state = currentState(gameRef.current)
    setGameState(state)
    saveFreeCellGame(state)
    winRecordedRef.current = false
  }

  function handleCheatWin(): void {
    if (!gameState || !gameRef.current) return
    const allCards: Card[] = [
      ...gameState.freeCells.filter((c): c is Card => c !== null),
      ...gameState.tableau.flat(),
      ...gameState.foundations.flat(),
    ]
    const foundations = SUITS.map((suit) =>
      Array.from({ length: 13 }, (_, i) => allCards.find((c) => c.suit === suit && c.rank === i + 1)!)
    )
    const wonState: FreeCellState = {
      ...gameState,
      tableau: Array.from({ length: 8 }, () => []),
      freeCells: [null, null, null, null],
      foundations,
      status: 'won',
    }
    commit(wonState)
  }

  const currentSeed = gameState?.seed
  const previouslyBeaten = currentSeed !== undefined && currentSeed in stats.gameBests

  return {
    state: gameState || ({} as FreeCellState),
    stats,
    previouslyBeaten,
    canUndo: !!gameRef.current && canUndoState(gameRef.current),
    onDrop: handleDrop,
    onDoubleClick: handleDoubleClick,
    doUndo: handleUndo,
    startNewGame: handleStartNewGame,
    startGameNumber: handleStartGameNumber,
    restartGame: handleRestartGame,
    resetStats: () => setStats(resetFreeCellStats()),
    ...(import.meta.env.DEV ? { devCheatWin: handleCheatWin } : {}),
  }
}

function randomGameNumber(): number {
  return Math.floor(Math.random() * 32000) + 1
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

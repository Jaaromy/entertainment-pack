import { FreeCellState } from './types'

export interface FreeCellStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  bestStreak: number
  leastMoves: number | null
  gameBests: Record<number, number>
}

const DEFAULT_STATS: FreeCellStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  leastMoves: null,
  gameBests: {},
}

const GAME_KEY = 'ep:fc:game'
const STATS_KEY = 'ep:fc:stats'

export function loadFreeCellGame(): FreeCellState | null {
  try {
    const stored = localStorage.getItem(GAME_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveFreeCellGame(state: FreeCellState): void {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(state))
  } catch {
    // Silently fail if storage quota exceeded or unavailable
  }
}

export function clearFreeCellGame(): void {
  localStorage.removeItem(GAME_KEY)
}

export function loadFreeCellStats(): FreeCellStats {
  try {
    const stored = localStorage.getItem(STATS_KEY)
    if (!stored) return { ...DEFAULT_STATS }
    const p = JSON.parse(stored)
    return {
      gamesPlayed:    typeof p.gamesPlayed    === 'number' ? p.gamesPlayed    : 0,
      gamesWon:       typeof p.gamesWon       === 'number' ? p.gamesWon       : 0,
      currentStreak:  typeof p.currentStreak  === 'number' ? p.currentStreak  : 0,
      bestStreak:     typeof p.bestStreak     === 'number' ? p.bestStreak     : 0,
      leastMoves:     typeof p.leastMoves     === 'number' ? p.leastMoves     : null,
      gameBests:      p.gameBests && typeof p.gameBests === 'object' ? p.gameBests : {},
    }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

export function recordFreeCellResult(won: boolean, moves?: number, seed?: number): void {
  try {
    const stats = loadFreeCellStats()
    const newStreak = won ? stats.currentStreak + 1 : 0
    const leastMoves =
      won && moves !== undefined
        ? stats.leastMoves === null
          ? moves
          : Math.min(stats.leastMoves, moves)
        : stats.leastMoves
    const gameBests = { ...stats.gameBests }
    if (won && moves !== undefined && seed !== undefined) {
      gameBests[seed] = Math.min(gameBests[seed] ?? Infinity, moves)
    }
    const next: FreeCellStats = {
      gamesPlayed: stats.gamesPlayed + 1,
      gamesWon: won ? stats.gamesWon + 1 : stats.gamesWon,
      currentStreak: newStreak,
      bestStreak: Math.max(stats.bestStreak, newStreak),
      leastMoves,
      gameBests,
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(next))
  } catch {
    // Silently fail
  }
}

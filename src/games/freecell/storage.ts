import { FreeCellState } from './types'

export interface FreeCellStats {
  gamesPlayed: number
  gamesWon: number
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
    return stored ? JSON.parse(stored) : { gamesPlayed: 0, gamesWon: 0 }
  } catch {
    return { gamesPlayed: 0, gamesWon: 0 }
  }
}

export function recordFreeCellResult(won: boolean): void {
  try {
    const stats = loadFreeCellStats()
    stats.gamesPlayed++
    if (won) {
      stats.gamesWon++
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // Silently fail
  }
}

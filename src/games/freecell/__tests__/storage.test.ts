import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadFreeCellStats,
  recordFreeCellResult,
} from '../storage'

function makeMockStorage() {
  const store: Record<string, string> = {}
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear:      () => { for (const k of Object.keys(store)) delete store[k] },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeMockStorage())
})

describe('loadFreeCellStats', () => {
  it('returns defaults when nothing is stored', () => {
    const stats = loadFreeCellStats()
    expect(stats).toEqual({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      leastMoves: null,
      gameBests: {},
    })
  })

  it('fills in missing new fields from old stored data', () => {
    localStorage.setItem('ep:fc:stats', JSON.stringify({ gamesPlayed: 5, gamesWon: 3 }))
    const stats = loadFreeCellStats()
    expect(stats.gamesPlayed).toBe(5)
    expect(stats.gamesWon).toBe(3)
    expect(stats.currentStreak).toBe(0)
    expect(stats.bestStreak).toBe(0)
    expect(stats.leastMoves).toBeNull()
    expect(stats.gameBests).toEqual({})
  })
})

describe('recordFreeCellResult', () => {
  it('increments gamesPlayed and gamesWon on win', () => {
    recordFreeCellResult(true, 50)
    const stats = loadFreeCellStats()
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(1)
  })

  it('increments gamesPlayed but not gamesWon on loss', () => {
    recordFreeCellResult(false, 10)
    const stats = loadFreeCellStats()
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.gamesWon).toBe(0)
  })

  it('first win sets streak to 1 and leastMoves', () => {
    recordFreeCellResult(true, 42)
    const stats = loadFreeCellStats()
    expect(stats.currentStreak).toBe(1)
    expect(stats.bestStreak).toBe(1)
    expect(stats.leastMoves).toBe(42)
  })

  it('consecutive wins increase streak and track best leastMoves', () => {
    recordFreeCellResult(true, 60)
    recordFreeCellResult(true, 40)
    recordFreeCellResult(true, 55)
    const stats = loadFreeCellStats()
    expect(stats.currentStreak).toBe(3)
    expect(stats.bestStreak).toBe(3)
    expect(stats.leastMoves).toBe(40)
  })

  it('loss resets currentStreak to 0 but preserves bestStreak', () => {
    recordFreeCellResult(true, 50)
    recordFreeCellResult(true, 50)
    recordFreeCellResult(false, 20)
    const stats = loadFreeCellStats()
    expect(stats.currentStreak).toBe(0)
    expect(stats.bestStreak).toBe(2)
  })

  it('win after loss starts streak at 1', () => {
    recordFreeCellResult(true, 50)
    recordFreeCellResult(false, 10)
    recordFreeCellResult(true, 30)
    const stats = loadFreeCellStats()
    expect(stats.currentStreak).toBe(1)
    expect(stats.bestStreak).toBe(1)
  })

  it('leastMoves does not update on loss', () => {
    recordFreeCellResult(true, 50)
    recordFreeCellResult(false, 10)
    const stats = loadFreeCellStats()
    expect(stats.leastMoves).toBe(50)
  })

  it('leastMoves stays null if no wins recorded', () => {
    recordFreeCellResult(false, 10)
    recordFreeCellResult(false, 5)
    const stats = loadFreeCellStats()
    expect(stats.leastMoves).toBeNull()
  })

  it('bestStreak tracks the highest streak across resets', () => {
    recordFreeCellResult(true, 50)
    recordFreeCellResult(true, 50)
    recordFreeCellResult(true, 50)  // streak = 3
    recordFreeCellResult(false, 10) // streak reset
    recordFreeCellResult(true, 50)
    recordFreeCellResult(true, 50)  // streak = 2
    const stats = loadFreeCellStats()
    expect(stats.currentStreak).toBe(2)
    expect(stats.bestStreak).toBe(3)
  })

  it('win without moves arg does not update leastMoves', () => {
    recordFreeCellResult(true, 50)
    recordFreeCellResult(true)  // no moves arg
    const stats = loadFreeCellStats()
    expect(stats.leastMoves).toBe(50)
  })
})

describe('recordFreeCellResult gameBests', () => {
  it('records best moves for a specific game seed on win', () => {
    recordFreeCellResult(true, 42, 1)
    const stats = loadFreeCellStats()
    expect(stats.gameBests[1]).toBe(42)
  })

  it('updates gameBests when a better score is achieved for the same seed', () => {
    recordFreeCellResult(true, 60, 1)
    recordFreeCellResult(true, 40, 1)
    const stats = loadFreeCellStats()
    expect(stats.gameBests[1]).toBe(40)
  })

  it('does not replace a better existing score with a worse one', () => {
    recordFreeCellResult(true, 40, 1)
    recordFreeCellResult(true, 60, 1)
    const stats = loadFreeCellStats()
    expect(stats.gameBests[1]).toBe(40)
  })

  it('tracks different seeds independently', () => {
    recordFreeCellResult(true, 30, 1)
    recordFreeCellResult(true, 50, 2)
    const stats = loadFreeCellStats()
    expect(stats.gameBests[1]).toBe(30)
    expect(stats.gameBests[2]).toBe(50)
  })

  it('does not record gameBests on a loss', () => {
    recordFreeCellResult(false, 10, 1)
    const stats = loadFreeCellStats()
    expect(stats.gameBests[1]).toBeUndefined()
  })

  it('does not record gameBests when seed is omitted', () => {
    recordFreeCellResult(true, 40)
    const stats = loadFreeCellStats()
    expect(Object.keys(stats.gameBests)).toHaveLength(0)
  })
})

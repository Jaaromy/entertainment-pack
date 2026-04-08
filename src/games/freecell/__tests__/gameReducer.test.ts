import { describe, it, expect } from 'vitest'
import { Card } from '@/shared/types'
import {
  createGame,
  currentState,
  canUndo,
  pushState,
  undo,
  newGame,
} from '../gameReducer'
import { FreeCellState } from '../types'

function card(rank: number, suit: string): Card {
  const suits: Record<string, 'spades' | 'hearts' | 'diamonds' | 'clubs'> = {
    S: 'spades',
    H: 'hearts',
    D: 'diamonds',
    C: 'clubs',
  }
  return {
    id: `${rank}${suit}`,
    suit: suits[suit],
    rank: rank as any,
    faceUp: true,
  }
}

describe('createGame', () => {
  it('creates a new game with seed', () => {
    const gwh = createGame(42)
    expect(gwh.states.length).toBe(1)
    expect(gwh.index).toBe(0)

    const state = currentState(gwh)
    expect(state.seed).toBe(42)
    expect(state.status).toBe('playing')
    expect(state.moves).toBe(0)
  })

  it('creates different games with different seeds', () => {
    const gwh1 = createGame(1)
    const gwh2 = createGame(2)

    const state1 = currentState(gwh1)
    const state2 = currentState(gwh2)

    // Tableau should be different
    expect(state1.tableau[0][0]).not.toEqual(state2.tableau[0][0])
  })
})

describe('currentState', () => {
  it('returns the state at current index', () => {
    const gwh = createGame(42)
    const state = currentState(gwh)
    expect(state).toBeDefined()
    expect(state.seed).toBe(42)
  })
})

describe('canUndo', () => {
  it('returns false for initial state', () => {
    const gwh = createGame(42)
    expect(canUndo(gwh)).toBe(false)
  })

  it('returns true after pushState', () => {
    let gwh = createGame(42)
    const state = currentState(gwh)
    const newState = { ...state, moves: 1 }
    gwh = pushState(gwh, newState)
    expect(canUndo(gwh)).toBe(true)
  })
})

describe('pushState', () => {
  it('keeps only two states (prev + current)', () => {
    let gwh = createGame(42)
    const initial = currentState(gwh)

    const state1 = { ...initial, moves: 1 }
    gwh = pushState(gwh, state1)
    expect(gwh.states.length).toBe(2)
    expect(gwh.index).toBe(1)

    const state2 = { ...state1, moves: 2 }
    gwh = pushState(gwh, state2)
    expect(gwh.states.length).toBe(2) // Still only 2
    expect(gwh.index).toBe(1)
    expect(currentState(gwh)).toEqual(state2)
  })

  it('handles undo + new move correctly', () => {
    let gwh = createGame(42)
    const initial = currentState(gwh)

    const state1 = { ...initial, moves: 1 }
    gwh = pushState(gwh, state1)
    expect(currentState(gwh).moves).toBe(1)

    // Undo
    gwh = undo(gwh)
    expect(currentState(gwh).moves).toBe(0)

    // New move
    const state2 = { ...initial, moves: 5 }
    gwh = pushState(gwh, state2)
    expect(currentState(gwh).moves).toBe(5)
  })
})

describe('undo', () => {
  it('reverts to previous state', () => {
    let gwh = createGame(42)
    const initial = currentState(gwh)

    const state1 = { ...initial, moves: 1 }
    gwh = pushState(gwh, state1)

    gwh = undo(gwh)
    expect(currentState(gwh)).toEqual(initial)
  })

  it('is a no-op if at index 0', () => {
    const gwh = createGame(42)
    const undone = undo(gwh)
    expect(undone).toEqual(gwh)
    expect(undone.index).toBe(0)
  })

  it('only goes back one level (single undo)', () => {
    let gwh = createGame(42)
    const initial = currentState(gwh)

    const state1 = { ...initial, moves: 1 }
    gwh = pushState(gwh, state1)

    gwh = undo(gwh)
    expect(currentState(gwh)).toEqual(initial)

    // Second undo should be no-op
    gwh = undo(gwh)
    expect(currentState(gwh)).toEqual(initial)
    expect(gwh.index).toBe(0)
  })
})

describe('newGame', () => {
  it('creates a fresh game with new seed', () => {
    let gwh = createGame(42)
    const state1 = currentState(gwh)

    const state2 = { ...state1, moves: 5 }
    gwh = pushState(gwh, state2)
    expect(currentState(gwh).moves).toBe(5)

    gwh = newGame(gwh, 99)
    expect(gwh.states.length).toBe(1)
    expect(gwh.index).toBe(0)
    expect(currentState(gwh).seed).toBe(99)
    expect(currentState(gwh).moves).toBe(0)
  })
})

describe('single undo level invariant', () => {
  it('enforces single undo constraint', () => {
    let gwh = createGame(42)
    const s0 = currentState(gwh)

    const s1 = { ...s0, moves: 1 }
    gwh = pushState(gwh, s1)

    const s2 = { ...s1, moves: 2 }
    gwh = pushState(gwh, s2)

    const s3 = { ...s2, moves: 3 }
    gwh = pushState(gwh, s3)

    // Should only have s2 and s3
    expect(gwh.states.length).toBe(2)
    expect(gwh.index).toBe(1)

    // Undo to s2
    gwh = undo(gwh)
    expect(currentState(gwh)).toEqual(s2)
    expect(gwh.index).toBe(0)

    // Further undo is no-op
    gwh = undo(gwh)
    expect(gwh.index).toBe(0)
  })
})

import { FreeCellState, FreeCellWithHistory } from './types'
import { createInitialState, createMicrosoftGame } from './gameLogic'

export function createGame(seed: number): FreeCellWithHistory {
  const state = createInitialState(seed)
  return {
    states: [state],
    index: 0,
  }
}

export function createMicrosoftGameHistory(gameNumber: number): FreeCellWithHistory {
  return {
    states: [createMicrosoftGame(gameNumber)],
    index: 0,
  }
}

export function currentState(gwh: FreeCellWithHistory): FreeCellState {
  return gwh.states[gwh.index]
}

export function canUndo(gwh: FreeCellWithHistory): boolean {
  return gwh.index > 0
}

export function pushState(
  gwh: FreeCellWithHistory,
  newState: FreeCellState,
): FreeCellWithHistory {
  // Keep only two states: previous (for undo) and current
  // If at the end, just replace the last state
  if (gwh.index === gwh.states.length - 1) {
    return {
      states: [gwh.states[gwh.index], newState],
      index: 1,
    }
  }

  // If we've undone some moves, discard future and append new
  return {
    states: [...gwh.states.slice(0, gwh.index + 1), newState],
    index: gwh.index + 1,
  }
}

export function undo(gwh: FreeCellWithHistory): FreeCellWithHistory {
  if (!canUndo(gwh)) {
    return gwh
  }
  return {
    ...gwh,
    index: gwh.index - 1,
  }
}

export function newGame(gwh: FreeCellWithHistory, seed: number): FreeCellWithHistory {
  return createGame(seed)
}

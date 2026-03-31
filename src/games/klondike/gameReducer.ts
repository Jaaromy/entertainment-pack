/**
 * Undo-capable game history manager.
 *
 * GameWithHistory wraps an array of immutable GameState snapshots and
 * a current index pointer.  Every mutation produces a new GameWithHistory
 * rather than mutating in place, so callers can compare references cheaply.
 */

import type { GameState, DrawMode, ScoringMode } from './types';
import { createInitialState } from './gameLogic';

export interface GameWithHistory {
  readonly states: readonly GameState[];
  readonly index: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGame(
  seed: number,
  drawMode: DrawMode,
  scoringMode: ScoringMode,
): GameWithHistory {
  const initial = createInitialState(seed, drawMode, scoringMode);
  return { states: [initial], index: 0 };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function currentState(gwh: GameWithHistory): GameState {
  return gwh.states[gwh.index]!;
}

export function canUndo(gwh: GameWithHistory): boolean {
  return gwh.index > 0;
}

// ---------------------------------------------------------------------------
// Write (all return a new GameWithHistory)
// ---------------------------------------------------------------------------

/**
 * Commit a new state, keeping only the previous state for a single undo level.
 */
export function pushState(
  gwh: GameWithHistory,
  newState: GameState,
): GameWithHistory {
  return { states: [currentState(gwh), newState], index: 1 };
}

export function undo(gwh: GameWithHistory): GameWithHistory {
  if (!canUndo(gwh)) return gwh;
  return { ...gwh, index: gwh.index - 1 };
}

/**
 * Reset to a brand-new game with the same settings as the current state,
 * but a different seed.
 */
export function newGame(
  gwh: GameWithHistory,
  seed: number,
): GameWithHistory {
  const s = currentState(gwh);
  return createGame(seed, s.drawMode, s.scoringMode);
}

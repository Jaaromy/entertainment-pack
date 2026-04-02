import type { BlackjackState, BlackjackWithHistory } from './types';
import { createInitialState } from './blackjackLogic';
import type { BlackjackOptions } from './types';
import { BLACKJACK_INITIAL_BALANCE } from './constants';

export function createGame(
  options?: BlackjackOptions,
  initialBalance?: number,
  seed?: number,
): BlackjackWithHistory {
  const state = createInitialState(options, initialBalance, seed);
  return { states: [state], index: 0 };
}

export function currentState(gwh: BlackjackWithHistory): BlackjackState {
  return gwh.states[gwh.index]!;
}

export function canUndo(gwh: BlackjackWithHistory): boolean {
  return gwh.index > 0;
}

/**
 * Commit a new state. Keeps only previous + current (single-level undo).
 */
export function pushState(
  gwh: BlackjackWithHistory,
  newState: BlackjackState,
): BlackjackWithHistory {
  const prev = gwh.states[gwh.index]!;
  return { states: [prev, newState], index: 1 };
}

export function undo(gwh: BlackjackWithHistory): BlackjackWithHistory {
  if (!canUndo(gwh)) return gwh;
  return { ...gwh, index: gwh.index - 1 };
}

export function newGame(
  gwh: BlackjackWithHistory,
  seed?: number,
): BlackjackWithHistory {
  const prev = currentState(gwh);
  const state = createInitialState(
    prev.options,
    prev.balance > 0 ? prev.balance : BLACKJACK_INITIAL_BALANCE,
    seed ?? Date.now(),
  );
  return { states: [state], index: 0 };
}

import type { Card } from '../../shared/types';
import { handValue } from './blackjackLogic';
import {
  ACE_RANK, ACE_HIGH, TEN_VALUE, INITIAL_HAND_SIZE,
  DEALER_STAND_VALUE, HARD_ALWAYS_HIT_MAX, SOFT_ALWAYS_STAND_MIN, SOFT_18,
} from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StrategyAction = 'hit' | 'stand' | 'double' | 'split';

// ---------------------------------------------------------------------------
// Dealer index normalisation
// Ace → 11, Ten/J/Q/K → 10, others → face value
// ---------------------------------------------------------------------------

function dealerIndex(rank: Card['rank']): number {
  if (rank === ACE_RANK) return ACE_HIGH;
  return Math.min(rank, TEN_VALUE);
}

// ---------------------------------------------------------------------------
// Pair table
// pairRank → set of dealer indices where splitting is correct
// (normalise pair rank: Math.min(rank, 10) before lookup)
// ---------------------------------------------------------------------------

const PAIR_SPLIT_VS: Record<number, readonly number[]> = {
  1:  [2,3,4,5,6,7,8,9,10,11], // A,A → always split
  2:  [2,3,4,5,6,7],
  3:  [2,3,4,5,6,7],
  4:  [5,6],
  // 5 → never split (treated as hard 10)
  6:  [2,3,4,5,6],
  7:  [2,3,4,5,6,7],
  8:  [2,3,4,5,6,7,8,9,10,11], // 8,8 → always split
  9:  [2,3,4,5,6,8,9],          // NOT 7, NOT 10/A
  10: [],                        // T,T → never split
};

// ---------------------------------------------------------------------------
// Lookup helper: range list of [minDealer, maxDealer, action]
// Returns the action for the first matching range, else defaultAction.
// ---------------------------------------------------------------------------

function lookupRanges(
  ranges: ReadonlyArray<readonly [number, number, StrategyAction]>,
  d: number,
  defaultAction: StrategyAction,
): StrategyAction {
  for (const [lo, hi, action] of ranges) {
    if (d >= lo && d <= hi) return action;
  }
  return defaultAction;
}

// ---------------------------------------------------------------------------
// Hard total table
// keyed by total (9–16); 8- → hit always, 17+ → stand always
// ---------------------------------------------------------------------------

const HARD_TABLE: Record<number, ReadonlyArray<readonly [number, number, StrategyAction]>> = {
  9:  [[3, 6, 'double']],
  10: [[2, 9, 'double']],
  11: [[2, 10, 'double']],
  12: [[4, 6, 'stand']],
  13: [[2, 6, 'stand']],
  14: [[2, 6, 'stand']],
  15: [[2, 6, 'stand']],
  16: [[2, 6, 'stand']],
};

// ---------------------------------------------------------------------------
// Soft total table (A + x, value 13–17 only)
// Soft 18 is handled explicitly because its double fallback is stand, not hit.
// ---------------------------------------------------------------------------

const SOFT_TABLE: Record<number, ReadonlyArray<readonly [number, number, StrategyAction]>> = {
  13: [[5, 6, 'double']],
  14: [[5, 6, 'double']],
  15: [[4, 6, 'double']],
  16: [[4, 6, 'double']],
  17: [[3, 6, 'double']],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the Basic Strategy action for multi-deck blackjack
 * (dealer stands soft 17, double after split allowed).
 *
 * Accounts for available actions: if the table recommends double/split but
 * the action is not currently available, returns the correct fallback.
 */
export function getBasicStrategyAction(
  playerCards: Card[],
  dealerUpcard: Card,
  canDouble: boolean,
  canSplit: boolean,
): StrategyAction {
  const d = dealerIndex(dealerUpcard.rank);
  const hv = handValue(playerCards);

  // ------------------------------------------------------------------
  // 1. Pair check
  // ------------------------------------------------------------------
  if (canSplit && playerCards.length === INITIAL_HAND_SIZE) {
    const [a, b] = playerCards as [Card, Card];
    if (a.rank === b.rank) {
      const pairRank = Math.min(a.rank, TEN_VALUE);
      // 5,5 is never split — fall through to hard 10 logic
      if (pairRank !== 5) {
        const splitVs = PAIR_SPLIT_VS[pairRank];
        if (splitVs && splitVs.includes(d)) {
          return 'split';
        }
        // Not splitting — fall through to soft/hard lookup using the hand's value
      }
    }
  }

  // ------------------------------------------------------------------
  // 2. Soft totals
  // ------------------------------------------------------------------
  if (hv.isSoft) {
    const value = hv.value;

    // Soft 19 and above → always stand
    if (value >= SOFT_ALWAYS_STAND_MIN) return 'stand';

    // Soft 18 (A,7) — unique because double fallback is STAND, not hit
    if (value === SOFT_18) {
      if (d >= 2 && d <= 6) return canDouble ? 'double' : 'stand';
      if (d >= 7 && d <= 8) return 'stand';
      return 'hit'; // vs 9, 10, A
    }

    // Soft 13–17 — double fallback is hit
    const ranges = SOFT_TABLE[value];
    if (ranges) {
      const action = lookupRanges(ranges, d, 'hit');
      if (action === 'double' && !canDouble) return 'hit';
      return action;
    }

    return 'hit';
  }

  // ------------------------------------------------------------------
  // 3. Hard totals
  // ------------------------------------------------------------------
  const value = hv.value;

  if (value >= DEALER_STAND_VALUE) return 'stand';
  if (value <= HARD_ALWAYS_HIT_MAX) return 'hit';

  const ranges = HARD_TABLE[value];
  if (ranges) {
    const action = lookupRanges(ranges, d, 'hit');
    if (action === 'double' && !canDouble) return 'hit';
    return action;
  }

  return 'hit';
}

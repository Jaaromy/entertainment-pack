import type { Suit, Rank } from './types';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const RANK_LABEL: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

// ---- Standard scoring (Windows Solitaire style) ----
/** Waste → Tableau */
export const SCORE_WASTE_TO_TABLEAU = 5;
/** Waste → Foundation */
export const SCORE_WASTE_TO_FOUNDATION = 10;
/** Tableau → Foundation */
export const SCORE_TABLEAU_TO_FOUNDATION = 10;
/** Flipping a face-down tableau card */
export const SCORE_FLIP_TABLEAU = 5;
/** Foundation → Tableau (penalty) */
export const SCORE_FOUNDATION_TO_TABLEAU = -15;
/**
 * Recycling stock penalty.
 * Draw-1: -100 per recycle after the first pass.
 * Draw-3: no penalty (unlimited free recycles in standard mode).
 */
export const SCORE_RECYCLE_DRAW1 = -100;

// ---- Vegas scoring ----
/** Initial "wager": $1 per card in the deck */
export const VEGAS_INITIAL_BET = -52;
/** Reward per card moved to foundation */
export const VEGAS_CARD_TO_FOUNDATION = 5;
/**
 * Maximum recycling passes in Vegas mode.
 * Draw-1: 1 pass (no recycles allowed).
 * Draw-3: 3 passes (2 recycles after initial pass).
 */
export const VEGAS_MAX_RECYCLES_DRAW1 = 0;
export const VEGAS_MAX_RECYCLES_DRAW3 = 2;

// ---- Table sizes ----
export const TABLEAU_SIZE = 7;
export const FOUNDATION_SIZE = 4;
export const DECK_SIZE = 52;

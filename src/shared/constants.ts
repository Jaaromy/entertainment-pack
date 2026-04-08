import type { Suit } from './types';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

// ---- Card dimensions (tied to sprite sheet) ----
export const CARD_WIDTH_NORMAL = 72;
export const CARD_HEIGHT_NORMAL = 100;
export const CARD_WIDTH_LARGE = 96;
export const CARD_HEIGHT_LARGE = 134;
/** Aspect ratio for responsive card sizing */
export const CARD_ASPECT_RATIO = 100 / 72;

// ---- Pointer drag thresholds (shared by all games using pointer-drag) ----
/** Minimum drag distance before drag is recognized: 5px squared */
export const DRAG_START_THRESHOLD_SQ = 25;
/** Click suppression radius after drag release: 10px squared */
export const DRAG_CLICK_SUPPRESS_RADIUS_SQ = 100;
/** Timeout for removing click suppression listener (ms) */
export const DRAG_CLICK_SUPPRESS_TIMEOUT_MS = 300;

import type { Card } from '../../shared/types';

export type { Card };

// ---------------------------------------------------------------------------
// Configuration — all rules live here for future variant support
// ---------------------------------------------------------------------------

export type BlackjackPayout = '3:2' | '6:5';

export interface BlackjackOptions {
  deckCount: number;
  blackjackPayout: BlackjackPayout;
  dealerHitsSoft17: boolean;
  allowSurrender: boolean;
  allowInsurance: boolean;
  doubleAfterSplit: boolean;
  maxSplits: number;
  /** Reshuffle shoe when fraction remaining drops below this value (0–1). */
  penetration: number;
}

// ---------------------------------------------------------------------------
// Hand
// ---------------------------------------------------------------------------

/**
 * 'active'    — player is acting on this hand
 * 'standing'  — player stood; awaits dealer resolution
 * 'bust'      — hand exceeded 21; settled as loss
 * 'doubled'   — player doubled down; no further actions
 * 'blackjack' — natural 21 with initial 2 cards
 */
export type HandStatus = 'active' | 'standing' | 'bust' | 'doubled' | 'blackjack';

/** null = not yet settled */
export type HandResult = 'win' | 'blackjack' | 'push' | 'loss' | null;

export interface Hand {
  cards: Card[];
  bet: number;
  status: HandStatus;
  result: HandResult;
  /** Additional amount wagered on double down */
  doubleDownBet: number;
  /** true when this hand was produced by splitting */
  fromSplit: boolean;
}

// ---------------------------------------------------------------------------
// Dealer
// ---------------------------------------------------------------------------

export interface DealerHand {
  cards: Card[];
  /** Hole card hidden during player turn; revealed before dealer plays */
  holeCardRevealed: boolean;
}

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

/**
 * 'betting'    — player places bet; no cards dealt
 * 'playing'    — cards dealt; player makes decisions
 * 'dealer'     — all player hands resolved; dealer plays out
 * 'settlement' — dealer done; results shown; awaiting next round
 */
export type BlackjackPhase = 'betting' | 'playing' | 'dealer' | 'settlement';

// ---------------------------------------------------------------------------
// Core game state — fully serialisable
// ---------------------------------------------------------------------------

export interface BlackjackState {
  /** Remaining cards. Last element = top (next to deal). */
  shoe: Card[];
  dealtCount: number;
  shoeSize: number;
  playerHands: Hand[];
  /** Index of the hand currently being played */
  activeHandIndex: number;
  dealerHand: DealerHand;
  phase: BlackjackPhase;
  balance: number;
  currentBet: number;
  shoeSeed: number;
  options: BlackjackOptions;
  /** Hi-Lo running count; resets to 0 on shoe reshuffle */
  runningCount: number;
}

// ---------------------------------------------------------------------------
// History wrapper (same pattern as Klondike GameWithHistory)
// ---------------------------------------------------------------------------

export interface BlackjackWithHistory {
  readonly states: readonly BlackjackState[];
  readonly index: number;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface BlackjackStats {
  handsPlayed: number;
  handsWon: number;
  handsLost: number;
  handsPush: number;
  blackjacks: number;
  biggestWin: number;
  biggestLoss: number;
  peakBalance: number;
  initialBalance: number;
}

// ---------------------------------------------------------------------------
// Settings persisted to localStorage
// ---------------------------------------------------------------------------

export interface BlackjackStoredSettings {
  defaultBet: number;
  options: Partial<BlackjackOptions>;
  cardSize: 'normal' | 'large';
  learningMode: boolean;
}

import type { BlackjackOptions } from './types';

export const BLACKJACK_INITIAL_BALANCE = 500;

// Core card values
export const ACE_RANK = 1;
export const ACE_HIGH = 11;       // Ace counted as 11 (high)
export const TEN_VALUE = 10;      // Face-card pip cap; also Ace demotion step
export const BLACKJACK_VALUE = 21;
export const INITIAL_HAND_SIZE = 2;

// Dealer rule
export const DEALER_STAND_VALUE = 17;

// Basic strategy thresholds
export const HARD_ALWAYS_HIT_MAX = 8;  // hard 8 or less: always hit
export const SOFT_ALWAYS_STAND_MIN = 19; // soft 19+: always stand
export const SOFT_18 = 18; // soft 18 has unique double/stand logic

// Payouts (multiplied against stake; does not include stake return)
export const PAYOUT_NATURAL_3_2 = 1.5;
export const PAYOUT_NATURAL_6_5 = 1.2;
export const WIN_PAYOUT_MULTIPLIER = 2; // winner receives bet * 2 (stake + winnings)

// Hi-Lo card counting thresholds
export const HI_LO_LOW_MIN = 2;      // ranks 2–6 → +1
export const HI_LO_LOW_MAX = 6;
export const HI_LO_NEUTRAL_MIN = 7;  // ranks 7–9 →  0  (Ace=1 and 10+ → -1)
export const HI_LO_NEUTRAL_MAX = 9;

export const DEFAULT_OPTIONS: BlackjackOptions = {
  deckCount: 4,
  blackjackPayout: '3:2',
  dealerHitsSoft17: false,
  allowSurrender: false,
  allowInsurance: false,
  doubleAfterSplit: true,
  maxSplits: 3,
  penetration: 0.10,
};

/** Chip denominations available in the betting panel */
export const CHIP_VALUES = [5, 10, 25, 50, 100] as const;

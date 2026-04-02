import type { BlackjackOptions } from './types';

export const BLACKJACK_INITIAL_BALANCE = 500;

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

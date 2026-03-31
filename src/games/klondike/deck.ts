import type { Card } from './types';
import { SUITS, RANKS } from './constants';
import { mulberry32, shuffleArray } from './rng';

/** Build an ordered, face-down 52-card deck (4 suits × 13 ranks). */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit[0].toUpperCase()}`,
        suit,
        rank,
        faceUp: false,
      });
    }
  }
  return deck;
}

/** Return a shuffled 52-card deck using a deterministic seeded PRNG. */
export function createShuffledDeck(seed: number): Card[] {
  return shuffleArray(createDeck(), mulberry32(seed));
}

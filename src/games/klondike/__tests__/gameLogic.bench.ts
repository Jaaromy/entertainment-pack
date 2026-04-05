import { describe, bench } from 'vitest';
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  createInitialState,
  autoMoveToFoundation,
} from '../gameLogic';
import type { Card, Suit, Rank } from '../types';

function card(rank: number, suit: string, faceUp = true): Card {
  return { id: `${rank}${suit[0]}`, rank: rank as Rank, suit: suit as Suit, faceUp };
}

describe('hot paths', () => {
  bench('canPlaceOnFoundation – valid', () => {
    canPlaceOnFoundation(card(2, 'hearts'), [card(1, 'hearts')]);
  });

  bench('canPlaceOnFoundation – invalid', () => {
    canPlaceOnFoundation(card(3, 'hearts'), [card(1, 'hearts')]);
  });

  bench('canPlaceOnTableau – valid', () => {
    canPlaceOnTableau(card(6, 'spades'), [card(7, 'hearts')]);
  });

  bench('canPlaceOnTableau – invalid', () => {
    canPlaceOnTableau(card(6, 'hearts'), [card(7, 'hearts')]);
  });

  const seedState = createInitialState(42, 1, 'standard');
  bench('autoMoveToFoundation (seed 42)', () => {
    autoMoveToFoundation(seedState);
  });
});

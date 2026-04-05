export type { Suit, Rank, Card } from '../../shared/types';
import type { Card } from '../../shared/types';
export type DrawMode = 1 | 3;
export type ScoringMode = 'standard' | 'vegas';
export type GameStatus = 'playing' | 'won';

/** Identifies where a card lives */
export type CardLocation =
  | { area: 'stock' }
  | { area: 'waste' }
  | { area: 'foundation'; pile: number }
  | { area: 'tableau'; pile: number; cardIndex: number };

/** A selection is the card(s) the user has picked up */
export interface Selection {
  location: CardLocation;
  cards: Card[]; // the card + any cards stacked on it
}

/** Pure game state – serialisable and diffable */
export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]];
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]];
  score: number;
  moves: number;
  drawMode: DrawMode;
  scoringMode: ScoringMode;
  seed: number;
  stockRecycles: number;
  wasteBatchSize: number;
  status: GameStatus;
}

export interface GameWithHistory {
  states: GameState[];
  /** Index into states[] that is the current view */
  index: number;
}

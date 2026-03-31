/**
 * Pure game-logic for Klondike Solitaire.
 *
 * Every public function is a pure transformation:
 *   (GameState, …args) → GameState   (valid move)
 *                      → null        (invalid / illegal move)
 *
 * No side-effects, no UI concerns.
 */

import type { Card, GameState, DrawMode, ScoringMode } from './types';
import {
  RED_SUITS,
  TABLEAU_SIZE,
  SCORE_WASTE_TO_TABLEAU,
  SCORE_WASTE_TO_FOUNDATION,
  SCORE_TABLEAU_TO_FOUNDATION,
  SCORE_FLIP_TABLEAU,
  SCORE_FOUNDATION_TO_TABLEAU,
  SCORE_RECYCLE_DRAW1,
  VEGAS_INITIAL_BET,
  VEGAS_CARD_TO_FOUNDATION,
  VEGAS_MAX_RECYCLES_DRAW1,
  VEGAS_MAX_RECYCLES_DRAW3,
} from './constants';
import { createShuffledDeck } from './deck';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isRed(card: Card): boolean {
  return RED_SUITS.includes(card.suit);
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

/** Shallow-clone the foundations tuple. */
function cloneFoundations(
  f: GameState['foundations'],
): GameState['foundations'] {
  return f.map((pile) => pile.slice()) as GameState['foundations'];
}

/** Shallow-clone the tableau tuple. */
function cloneTableau(t: GameState['tableau']): GameState['tableau'] {
  return t.map((pile) => pile.slice()) as GameState['tableau'];
}

/**
 * If the new top card of a tableau pile is face-down, flip it.
 * Returns the mutated pile reference and the score bonus to award.
 */
function maybeFlipTop(pile: Card[], scoringMode: ScoringMode): number {
  const top = last(pile);
  if (top && !top.faceUp) {
    pile[pile.length - 1] = { ...top, faceUp: true };
    return scoringMode === 'standard' ? SCORE_FLIP_TABLEAU : 0;
  }
  return 0;
}

/** Check whether all 52 cards are on the foundations. */
function checkWin(state: GameState): GameState {
  const won = state.foundations.every((f) => f.length === 13);
  return won ? { ...state, status: 'won' } : state;
}

// ---------------------------------------------------------------------------
// Validation predicates (exported so tests can use them directly)
// ---------------------------------------------------------------------------

/**
 * Can `card` be placed on `foundation`?
 * - Empty foundation: only Ace (rank 1).
 * - Non-empty: same suit, exactly one rank higher than current top.
 */
export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = last(foundation)!;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

/**
 * Can `card` (the bottom of a stack being moved) be placed on `tableau`?
 * - Empty pile: only King (rank 13).
 * - Non-empty: alternating colour, exactly one rank lower than top card.
 */
export function canPlaceOnTableau(card: Card, tableau: Card[]): boolean {
  if (tableau.length === 0) return card.rank === 13;
  const top = last(tableau)!;
  if (!top.faceUp) return false;
  return isRed(card) !== isRed(top) && card.rank === top.rank - 1;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/**
 * Deal a fresh Klondike game.
 *
 * Tableau layout: pile i (0-based) gets i+1 cards.
 *   - All cards except the top are face-down.
 * Stock: the remaining 24 cards, face-down.
 */
export function createInitialState(
  seed: number,
  drawMode: DrawMode,
  scoringMode: ScoringMode,
): GameState {
  const deck = createShuffledDeck(seed);

  const tableau = Array.from(
    { length: TABLEAU_SIZE },
    (_, pileIdx) => [] as Card[],
  ) as GameState['tableau'];

  let di = 0;
  for (let pile = 0; pile < TABLEAU_SIZE; pile++) {
    for (let pos = 0; pos <= pile; pos++) {
      tableau[pile].push({ ...deck[di++]!, faceUp: pos === pile });
    }
  }

  return {
    stock: deck.slice(di).map((c) => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: scoringMode === 'vegas' ? VEGAS_INITIAL_BET : 0,
    moves: 0,
    drawMode,
    scoringMode,
    seed,
    stockRecycles: 0,
    status: 'playing',
  };
}

// ---------------------------------------------------------------------------
// Stock / Waste
// ---------------------------------------------------------------------------

/**
 * Draw 1 or 3 cards from the stock to the waste pile.
 * Cards land face-up; the last card drawn is on top (playable).
 * Returns null when the stock is empty (call recycleWaste instead).
 */
export function drawFromStock(state: GameState): GameState | null {
  if (state.stock.length === 0) return null;

  const count = Math.min(state.drawMode, state.stock.length);
  // The last `count` elements of stock are the "top" cards.
  const drawn = state.stock
    .slice(-count)
    .map((c) => ({ ...c, faceUp: true }));

  return {
    ...state,
    stock: state.stock.slice(0, -count),
    // drawn is already ordered so that drawn[drawn.length-1] was top of stock
    // → it becomes top of waste (playable).
    waste: [...state.waste, ...drawn],
    moves: state.moves + 1,
  };
}

/**
 * Flip the waste pile back into the stock (face-down).
 * Conditions:
 *   - Stock must be empty.
 *   - Waste must be non-empty.
 *   - Vegas mode: limited by VEGAS_MAX_RECYCLES_*.
 * In standard Draw-1 mode a -100 penalty is applied.
 */
export function recycleWaste(state: GameState): GameState | null {
  if (state.stock.length > 0) return null;
  if (state.waste.length === 0) return null;

  if (state.scoringMode === 'vegas') {
    const max =
      state.drawMode === 1 ? VEGAS_MAX_RECYCLES_DRAW1 : VEGAS_MAX_RECYCLES_DRAW3;
    if (state.stockRecycles >= max) return null;
  }

  const scoreDelta =
    state.scoringMode === 'standard' && state.drawMode === 1
      ? SCORE_RECYCLE_DRAW1
      : 0;

  // Reverse the waste so the card that was on the bottom of waste becomes
  // the bottom of the stock (i.e. the former waste-top is the new stock-top).
  const newStock = [...state.waste]
    .reverse()
    .map((c) => ({ ...c, faceUp: false }));

  return {
    ...state,
    stock: newStock,
    waste: [],
    score: state.score + scoreDelta,
    stockRecycles: state.stockRecycles + 1,
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// Waste → Destination
// ---------------------------------------------------------------------------

/** Move the top card of the waste to a foundation pile. */
export function moveWasteToFoundation(
  state: GameState,
  foundationIndex: number,
): GameState | null {
  if (state.waste.length === 0) return null;
  const card = last(state.waste)!;
  const foundation = state.foundations[foundationIndex];
  if (!foundation || !canPlaceOnFoundation(card, foundation)) return null;

  const scoreDelta =
    state.scoringMode === 'standard'
      ? SCORE_WASTE_TO_FOUNDATION
      : VEGAS_CARD_TO_FOUNDATION;

  const newFoundations = cloneFoundations(state.foundations);
  newFoundations[foundationIndex].push({ ...card, faceUp: true });

  return checkWin({
    ...state,
    waste: state.waste.slice(0, -1),
    foundations: newFoundations,
    score: state.score + scoreDelta,
    moves: state.moves + 1,
  });
}

/** Move the top card of the waste to a tableau pile. */
export function moveWasteToTableau(
  state: GameState,
  tableauIndex: number,
): GameState | null {
  if (state.waste.length === 0) return null;
  const card = last(state.waste)!;
  const pile = state.tableau[tableauIndex];
  if (!pile || !canPlaceOnTableau(card, pile)) return null;

  const scoreDelta =
    state.scoringMode === 'standard' ? SCORE_WASTE_TO_TABLEAU : 0;

  const newTableau = cloneTableau(state.tableau);
  newTableau[tableauIndex].push({ ...card, faceUp: true });

  return {
    ...state,
    waste: state.waste.slice(0, -1),
    tableau: newTableau,
    score: state.score + scoreDelta,
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// Tableau → Destination
// ---------------------------------------------------------------------------

/**
 * Move the top card of a tableau pile to a foundation.
 * Flips the newly exposed card if it was face-down (+5 standard).
 */
export function moveTableauToFoundation(
  state: GameState,
  fromPile: number,
  foundationIndex: number,
): GameState | null {
  const pile = state.tableau[fromPile];
  if (!pile || pile.length === 0) return null;
  const card = last(pile)!;
  if (!card.faceUp) return null;

  const foundation = state.foundations[foundationIndex];
  if (!foundation || !canPlaceOnFoundation(card, foundation)) return null;

  const scoreDelta =
    state.scoringMode === 'standard'
      ? SCORE_TABLEAU_TO_FOUNDATION
      : VEGAS_CARD_TO_FOUNDATION;

  const newTableau = cloneTableau(state.tableau);
  newTableau[fromPile].pop();
  const flipBonus = maybeFlipTop(newTableau[fromPile], state.scoringMode);

  const newFoundations = cloneFoundations(state.foundations);
  newFoundations[foundationIndex].push({ ...card, faceUp: true });

  return checkWin({
    ...state,
    tableau: newTableau,
    foundations: newFoundations,
    score: state.score + scoreDelta + flipBonus,
    moves: state.moves + 1,
  });
}

/**
 * Move a stack of face-up cards from one tableau pile to another.
 * `cardIndex` is the index of the bottommost card being moved
 * (all cards from cardIndex to end of pile move together).
 */
export function moveTableauToTableau(
  state: GameState,
  fromPile: number,
  cardIndex: number,
  toPile: number,
): GameState | null {
  if (fromPile === toPile) return null;

  const from = state.tableau[fromPile];
  const to = state.tableau[toPile];
  if (!from || !to) return null;
  if (cardIndex < 0 || cardIndex >= from.length) return null;

  const movingCard = from[cardIndex]!;
  if (!movingCard.faceUp) return null;
  if (!canPlaceOnTableau(movingCard, to)) return null;

  const stack = from.slice(cardIndex);

  const newTableau = cloneTableau(state.tableau);
  newTableau[fromPile].splice(cardIndex);
  const flipBonus = maybeFlipTop(newTableau[fromPile], state.scoringMode);
  newTableau[toPile].push(...stack);

  return {
    ...state,
    tableau: newTableau,
    score: state.score + flipBonus,
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// Foundation → Tableau  (unbuilding / undo-style play)
// ---------------------------------------------------------------------------

/** Move the top card of a foundation back to a tableau pile. */
export function moveFoundationToTableau(
  state: GameState,
  foundationIndex: number,
  tableauIndex: number,
): GameState | null {
  const foundation = state.foundations[foundationIndex];
  if (!foundation || foundation.length === 0) return null;
  const card = last(foundation)!;

  const pile = state.tableau[tableauIndex];
  if (!pile || !canPlaceOnTableau(card, pile)) return null;

  const scoreDelta =
    state.scoringMode === 'standard'
      ? SCORE_FOUNDATION_TO_TABLEAU
      : -VEGAS_CARD_TO_FOUNDATION;

  const newFoundations = cloneFoundations(state.foundations);
  newFoundations[foundationIndex].pop();

  const newTableau = cloneTableau(state.tableau);
  newTableau[tableauIndex].push({ ...card, faceUp: true });

  return {
    ...state,
    foundations: newFoundations,
    tableau: newTableau,
    score: state.score + scoreDelta,
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// Auto-move helpers
// ---------------------------------------------------------------------------

/**
 * Find the index of a foundation pile that can accept `card`.
 * Returns -1 if no foundation accepts it.
 */
export function findFoundationTarget(state: GameState, card: Card): number {
  for (let i = 0; i < 4; i++) {
    if (canPlaceOnFoundation(card, state.foundations[i]!)) return i;
  }
  return -1;
}

/**
 * Greedily move every card that can go to a foundation.
 * Runs until no more moves are possible (safe for auto-complete at end of game).
 * Does NOT enforce "safety" heuristics – call only when appropriate (e.g. all
 * tableau cards face-up, or player explicitly requests it).
 */
export function autoMoveToFoundation(state: GameState): GameState {
  let cur = state;
  let changed = true;
  while (changed && cur.status === 'playing') {
    changed = false;

    // Try waste
    if (cur.waste.length > 0) {
      const card = last(cur.waste)!;
      const fi = findFoundationTarget(cur, card);
      if (fi >= 0) {
        const next = moveWasteToFoundation(cur, fi);
        if (next) {
          cur = next;
          changed = true;
          continue;
        }
      }
    }

    // Try each tableau pile
    for (let p = 0; p < TABLEAU_SIZE; p++) {
      const pile = cur.tableau[p]!;
      if (pile.length === 0) continue;
      const card = last(pile)!;
      if (!card.faceUp) continue;
      const fi = findFoundationTarget(cur, card);
      if (fi >= 0) {
        const next = moveTableauToFoundation(cur, p, fi);
        if (next) {
          cur = next;
          changed = true;
          break;
        }
      }
    }
  }
  return cur;
}

import { describe, it, expect } from 'vitest';
import type { Card, GameState } from '../types';
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  createInitialState,
  drawFromStock,
  recycleWaste,
  moveWasteToFoundation,
  moveWasteToTableau,
  moveTableauToFoundation,
  moveTableauToTableau,
  moveFoundationToTableau,
  flipTableauCard,
  findFoundationTarget,
  autoMoveToFoundation,
} from '../gameLogic';
import { DECK_SIZE, TABLEAU_SIZE } from '../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function card(rank: Card['rank'], suit: Card['suit'], faceUp = true): Card {
  return { id: `${rank}${suit[0].toUpperCase()}`, rank, suit, faceUp };
}

/** Collect every card from every area of the state into a flat array. */
function allCards(state: GameState): Card[] {
  return [
    ...state.stock,
    ...state.waste,
    ...state.foundations.flat(),
    ...state.tableau.flat(),
  ];
}

/**
 * Assert the 52-unique-cards invariant:
 *  1. Exactly 52 cards exist across all areas.
 *  2. No card id appears more than once.
 */
function assertCardInvariant(state: GameState): void {
  const cards = allCards(state);
  expect(cards).toHaveLength(DECK_SIZE);
  const ids = cards.map((c) => c.id);
  const unique = new Set(ids);
  expect(unique.size).toBe(DECK_SIZE);
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    score: 0,
    moves: 0,
    drawMode: 1,
    scoringMode: 'standard',
    seed: 0,
    stockRecycles: 0,
    wasteBatchSize: 0,
    status: 'playing',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// canPlaceOnFoundation
// ---------------------------------------------------------------------------

describe('canPlaceOnFoundation', () => {
  it('accepts Ace on empty foundation', () => {
    expect(canPlaceOnFoundation(card(1, 'spades'), [])).toBe(true);
  });

  it('rejects non-Ace on empty foundation', () => {
    expect(canPlaceOnFoundation(card(2, 'spades'), [])).toBe(false);
    expect(canPlaceOnFoundation(card(13, 'hearts'), [])).toBe(false);
  });

  it('accepts next rank of same suit', () => {
    const foundation = [card(1, 'hearts'), card(2, 'hearts')];
    expect(canPlaceOnFoundation(card(3, 'hearts'), foundation)).toBe(true);
  });

  it('rejects wrong suit', () => {
    const foundation = [card(1, 'hearts')];
    expect(canPlaceOnFoundation(card(2, 'spades'), foundation)).toBe(false);
  });

  it('rejects wrong rank (skip)', () => {
    const foundation = [card(1, 'hearts')];
    expect(canPlaceOnFoundation(card(3, 'hearts'), foundation)).toBe(false);
  });

  it('rejects rank less than top', () => {
    const foundation = [card(1, 'hearts'), card(2, 'hearts'), card(3, 'hearts')];
    expect(canPlaceOnFoundation(card(2, 'hearts'), foundation)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canPlaceOnTableau
// ---------------------------------------------------------------------------

describe('canPlaceOnTableau', () => {
  it('accepts King on empty pile', () => {
    expect(canPlaceOnTableau(card(13, 'spades'), [])).toBe(true);
  });

  it('rejects non-King on empty pile', () => {
    expect(canPlaceOnTableau(card(12, 'hearts'), [])).toBe(false);
    expect(canPlaceOnTableau(card(1, 'spades'), [])).toBe(false);
  });

  it('accepts alternating colour, one rank lower', () => {
    // red 7 on black 8
    expect(canPlaceOnTableau(card(7, 'hearts'), [card(8, 'spades')])).toBe(true);
    expect(canPlaceOnTableau(card(7, 'diamonds'), [card(8, 'clubs')])).toBe(true);
    // black 7 on red 8
    expect(canPlaceOnTableau(card(7, 'spades'), [card(8, 'hearts')])).toBe(true);
    expect(canPlaceOnTableau(card(7, 'clubs'), [card(8, 'diamonds')])).toBe(true);
  });

  it('rejects same colour', () => {
    expect(canPlaceOnTableau(card(7, 'hearts'), [card(8, 'diamonds')])).toBe(false);
    expect(canPlaceOnTableau(card(7, 'spades'), [card(8, 'clubs')])).toBe(false);
  });

  it('rejects wrong rank', () => {
    expect(canPlaceOnTableau(card(6, 'hearts'), [card(8, 'spades')])).toBe(false);
    expect(canPlaceOnTableau(card(8, 'hearts'), [card(8, 'spades')])).toBe(false);
  });

  it('rejects placement on face-down top card', () => {
    expect(canPlaceOnTableau(card(7, 'hearts'), [card(8, 'spades', false)])).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe('createInitialState', () => {
  const state = createInitialState(42, 1, 'standard');

  it('has exactly 52 cards across all areas', () => {
    const total =
      state.stock.length +
      state.waste.length +
      state.foundations.reduce((s, f) => s + f.length, 0) +
      state.tableau.reduce((s, p) => s + p.length, 0);
    expect(total).toBe(DECK_SIZE);
  });

  it('stock has 24 cards', () => {
    expect(state.stock).toHaveLength(24);
  });

  it('waste is empty', () => {
    expect(state.waste).toHaveLength(0);
  });

  it('foundations are all empty', () => {
    state.foundations.forEach((f) => expect(f).toHaveLength(0));
  });

  it('tableau piles have correct sizes (1–7)', () => {
    for (let i = 0; i < TABLEAU_SIZE; i++) {
      expect(state.tableau[i]).toHaveLength(i + 1);
    }
  });

  it('only the top card of each tableau pile is face-up', () => {
    for (let i = 0; i < TABLEAU_SIZE; i++) {
      const pile = state.tableau[i]!;
      pile.forEach((c, idx) => {
        expect(c.faceUp).toBe(idx === pile.length - 1);
      });
    }
  });

  it('all stock cards are face-down', () => {
    expect(state.stock.every((c) => !c.faceUp)).toBe(true);
  });

  it('no duplicate card ids', () => {
    const all: Card[] = [
      ...state.stock,
      ...state.waste,
      ...state.foundations.flat(),
      ...state.tableau.flat(),
    ];
    const ids = new Set(all.map((c) => c.id));
    expect(ids.size).toBe(DECK_SIZE);
  });

  it('uses seed for deterministic deal', () => {
    const a = createInitialState(999, 1, 'standard');
    const b = createInitialState(999, 1, 'standard');
    expect(a.tableau.map((p) => p.map((c) => c.id))).toEqual(
      b.tableau.map((p) => p.map((c) => c.id)),
    );
  });

  it('Vegas mode starts at -52 score', () => {
    const v = createInitialState(1, 1, 'vegas');
    expect(v.score).toBe(-52);
  });

  it('standard mode starts at 0 score', () => {
    expect(state.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// drawFromStock
// ---------------------------------------------------------------------------

describe('drawFromStock', () => {
  it('Draw-1: moves top card to waste face-up', () => {
    const stockCards = [card(1, 'spades', false), card(2, 'hearts', false)];
    const state = makeState({ stock: stockCards, drawMode: 1 });
    const next = drawFromStock(state);
    expect(next).not.toBeNull();
    expect(next!.stock).toHaveLength(1);
    expect(next!.waste).toHaveLength(1);
    expect(next!.waste[0]!.rank).toBe(2); // top of stock → top of waste
    expect(next!.waste[0]!.faceUp).toBe(true);
  });

  it('Draw-1: increments move counter', () => {
    const state = makeState({
      stock: [card(1, 'spades', false)],
      drawMode: 1,
    });
    expect(drawFromStock(state)!.moves).toBe(1);
  });

  it('Draw-3: draws up to 3 cards', () => {
    const stockCards = [
      card(1, 'spades', false),
      card(2, 'hearts', false),
      card(3, 'clubs', false),
      card(4, 'diamonds', false),
      card(5, 'spades', false),
    ];
    const state = makeState({ stock: stockCards, drawMode: 3 });
    const next = drawFromStock(state);
    expect(next!.stock).toHaveLength(2);
    expect(next!.waste).toHaveLength(3);
    // Top of stock (rank 5) → top of waste
    expect(next!.waste[2]!.rank).toBe(5);
    expect(next!.waste[0]!.rank).toBe(3);
  });

  it('Draw-3: draws fewer when stock has < 3 cards', () => {
    const state = makeState({
      stock: [card(1, 'spades', false), card(2, 'hearts', false)],
      drawMode: 3,
    });
    const next = drawFromStock(state);
    expect(next!.stock).toHaveLength(0);
    expect(next!.waste).toHaveLength(2);
  });

  it('returns null when stock is empty', () => {
    const state = makeState({ stock: [], drawMode: 1 });
    expect(drawFromStock(state)).toBeNull();
  });

  it('all drawn cards are face-up', () => {
    const state = makeState({
      stock: [
        card(1, 'spades', false),
        card(2, 'hearts', false),
        card(3, 'clubs', false),
      ],
      drawMode: 3,
    });
    drawFromStock(state)!.waste.forEach((c) => expect(c.faceUp).toBe(true));
  });

  it('remaining stock cards keep their relative order after Draw-1', () => {
    // stock bottom→top: 1, 2, 3, 4, 5  (5 is top)
    const stockCards = [1, 2, 3, 4, 5].map((r) =>
      card(r as Card['rank'], 'spades', false),
    );
    const state = makeState({ stock: stockCards, drawMode: 1 });
    const next = drawFromStock(state)!;
    // 5 was drawn; remaining bottom→top should still be 1, 2, 3, 4
    expect(next.stock.map((c) => c.rank)).toEqual([1, 2, 3, 4]);
  });

  it('remaining stock cards keep their relative order after Draw-3', () => {
    // stock bottom→top: 1, 2, 3, 4, 5  (3 drawn from top: 5, 4, 3)
    const stockCards = [1, 2, 3, 4, 5].map((r) =>
      card(r as Card['rank'], 'spades', false),
    );
    const state = makeState({ stock: stockCards, drawMode: 3 });
    const next = drawFromStock(state)!;
    // Remaining bottom→top should be 1, 2
    expect(next.stock.map((c) => c.rank)).toEqual([1, 2]);
  });

  it('pre-existing waste cards stay in place when new cards are drawn', () => {
    // waste already has [A♥, 2♥] (2♥ on top); draw 1 more from stock
    const existingWaste = [card(1, 'hearts'), card(2, 'hearts')];
    const state = makeState({
      stock: [card(5, 'clubs', false)],
      waste: existingWaste,
      drawMode: 1,
    });
    const next = drawFromStock(state)!;
    // waste should be [A♥, 2♥, 5♣] — existing cards unchanged at indices 0 and 1
    expect(next.waste).toHaveLength(3);
    expect(next.waste[0]!.rank).toBe(1);
    expect(next.waste[0]!.suit).toBe('hearts');
    expect(next.waste[1]!.rank).toBe(2);
    expect(next.waste[1]!.suit).toBe('hearts');
    expect(next.waste[2]!.rank).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// recycleWaste
// ---------------------------------------------------------------------------

describe('recycleWaste', () => {
  it('moves waste back to stock face-down', () => {
    const wasteCards = [card(1, 'spades'), card(2, 'hearts'), card(3, 'clubs')];
    const state = makeState({ stock: [], waste: wasteCards, drawMode: 1 });
    const next = recycleWaste(state);
    expect(next).not.toBeNull();
    expect(next!.waste).toHaveLength(0);
    expect(next!.stock).toHaveLength(3);
    expect(next!.stock.every((c) => !c.faceUp)).toBe(true);
  });

  it('reverses order: waste top → stock bottom', () => {
    // waste = [A, B, C] with C on top; after recycle, stock top should be A
    const wasteCards = [
      card(1, 'spades'),
      card(2, 'hearts'),
      card(3, 'clubs'),
    ];
    const state = makeState({ stock: [], waste: wasteCards, drawMode: 1 });
    const next = recycleWaste(state)!;
    // Stock top is last element – should be rank 1 (was bottom of waste)
    expect(next.stock[next.stock.length - 1]!.rank).toBe(1);
    // Stock bottom is first element – should be rank 3 (was top of waste)
    expect(next.stock[0]!.rank).toBe(3);
  });

  it('returns null when stock is non-empty', () => {
    const state = makeState({
      stock: [card(1, 'spades', false)],
      waste: [card(2, 'hearts')],
      drawMode: 1,
    });
    expect(recycleWaste(state)).toBeNull();
  });

  it('returns null when waste is empty', () => {
    const state = makeState({ stock: [], waste: [], drawMode: 1 });
    expect(recycleWaste(state)).toBeNull();
  });

  it('standard Draw-1 applies -100 penalty', () => {
    const state = makeState({
      stock: [],
      waste: [card(1, 'spades')],
      score: 50,
      drawMode: 1,
      scoringMode: 'standard',
    });
    expect(recycleWaste(state)!.score).toBe(-50);
  });

  it('standard Draw-3 has no penalty', () => {
    const state = makeState({
      stock: [],
      waste: [card(1, 'spades')],
      score: 50,
      drawMode: 3,
      scoringMode: 'standard',
    });
    expect(recycleWaste(state)!.score).toBe(50);
  });

  it('Vegas Draw-1 allows 0 recycles (1 pass total)', () => {
    const state = makeState({
      stock: [],
      waste: [card(1, 'spades')],
      drawMode: 1,
      scoringMode: 'vegas',
      stockRecycles: 0,
    });
    expect(recycleWaste(state)).toBeNull(); // already used the 1 pass
  });

  it('Vegas Draw-3 allows 2 recycles (3 passes total)', () => {
    const base = makeState({
      stock: [],
      waste: [card(1, 'spades')],
      drawMode: 3,
      scoringMode: 'vegas',
    });

    const after1 = recycleWaste(base)!;
    expect(after1).not.toBeNull();
    expect(after1.stockRecycles).toBe(1);

    const after2 = recycleWaste({
      ...after1,
      stock: [],
      waste: [card(1, 'spades')],
    })!;
    expect(after2).not.toBeNull();
    expect(after2.stockRecycles).toBe(2);

    const after3 = recycleWaste({
      ...after2,
      stock: [],
      waste: [card(1, 'spades')],
    });
    expect(after3).toBeNull(); // 3rd recycle (4th pass) blocked
  });

  it('increments stockRecycles counter', () => {
    const state = makeState({
      stock: [],
      waste: [card(1, 'spades')],
      drawMode: 1,
      scoringMode: 'standard',
    });
    expect(recycleWaste(state)!.stockRecycles).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// moveWasteToFoundation
// ---------------------------------------------------------------------------

describe('moveWasteToFoundation', () => {
  it('moves Ace from waste to empty foundation', () => {
    const state = makeState({ waste: [card(1, 'hearts')] });
    const next = moveWasteToFoundation(state, 0);
    expect(next).not.toBeNull();
    expect(next!.waste).toHaveLength(0);
    expect(next!.foundations[0]).toHaveLength(1);
    expect(next!.foundations[0]![0]!.rank).toBe(1);
  });

  it('returns null when waste is empty', () => {
    expect(moveWasteToFoundation(makeState(), 0)).toBeNull();
  });

  it('returns null for invalid foundation move', () => {
    // 2 of hearts cannot go on empty foundation
    const state = makeState({ waste: [card(2, 'hearts')] });
    expect(moveWasteToFoundation(state, 0)).toBeNull();
  });

  it('returns null for wrong suit', () => {
    const state = makeState({
      waste: [card(2, 'spades')],
      foundations: [[card(1, 'hearts')], [], [], []],
    });
    expect(moveWasteToFoundation(state, 0)).toBeNull();
  });

  it('awards +10 in standard mode', () => {
    const state = makeState({ waste: [card(1, 'hearts')], score: 0 });
    expect(moveWasteToFoundation(state, 0)!.score).toBe(10);
  });

  it('awards +5 in vegas mode', () => {
    const state = makeState({
      waste: [card(1, 'hearts')],
      score: -52,
      scoringMode: 'vegas',
    });
    expect(moveWasteToFoundation(state, 0)!.score).toBe(-47);
  });

  it('increments moves counter', () => {
    const state = makeState({ waste: [card(1, 'hearts')] });
    expect(moveWasteToFoundation(state, 0)!.moves).toBe(1);
  });

  it('remaining waste cards keep their relative order', () => {
    // waste bottom→top: A♥, 2♣, 3♦  (3♦ is top and gets moved)
    const state = makeState({
      waste: [card(1, 'hearts'), card(2, 'clubs'), card(3, 'diamonds')],
      foundations: [
        [card(1, 'diamonds'), card(2, 'diamonds')],
        [], [], [],
      ],
    });
    const next = moveWasteToFoundation(state, 0)!;
    expect(next.waste).toHaveLength(2);
    expect(next.waste[0]!.rank).toBe(1);
    expect(next.waste[0]!.suit).toBe('hearts');
    expect(next.waste[1]!.rank).toBe(2);
    expect(next.waste[1]!.suit).toBe('clubs');
  });
});

// ---------------------------------------------------------------------------
// moveWasteToTableau
// ---------------------------------------------------------------------------

describe('moveWasteToTableau', () => {
  it('moves King to empty tableau pile', () => {
    const state = makeState({ waste: [card(13, 'spades')] });
    const next = moveWasteToTableau(state, 0);
    expect(next).not.toBeNull();
    expect(next!.waste).toHaveLength(0);
    expect(next!.tableau[0]).toHaveLength(1);
  });

  it('moves card with alternating colour + one rank lower', () => {
    const state = makeState({
      waste: [card(7, 'hearts')],
      tableau: [[card(8, 'spades')], [], [], [], [], [], []],
    });
    const next = moveWasteToTableau(state, 0);
    expect(next).not.toBeNull();
    expect(next!.tableau[0]).toHaveLength(2);
    expect(next!.tableau[0]![1]!.rank).toBe(7);
  });

  it('returns null for invalid placement', () => {
    const state = makeState({
      waste: [card(6, 'hearts')],
      tableau: [[card(8, 'spades')], [], [], [], [], [], []],
    });
    expect(moveWasteToTableau(state, 0)).toBeNull();
  });

  it('awards +5 in standard mode', () => {
    const state = makeState({ waste: [card(13, 'spades')], score: 0 });
    expect(moveWasteToTableau(state, 0)!.score).toBe(5);
  });

  it('awards 0 in vegas mode', () => {
    const state = makeState({
      waste: [card(13, 'spades')],
      score: -52,
      scoringMode: 'vegas',
    });
    expect(moveWasteToTableau(state, 0)!.score).toBe(-52);
  });

  it('returns null when waste is empty', () => {
    expect(moveWasteToTableau(makeState(), 0)).toBeNull();
  });

  it('remaining waste cards keep their relative order', () => {
    // waste bottom→top: A♥, 2♣, K♠  (K♠ is top and gets moved to empty pile)
    const state = makeState({
      waste: [card(1, 'hearts'), card(2, 'clubs'), card(13, 'spades')],
    });
    const next = moveWasteToTableau(state, 0)!;
    expect(next.waste).toHaveLength(2);
    expect(next.waste[0]!.rank).toBe(1);
    expect(next.waste[0]!.suit).toBe('hearts');
    expect(next.waste[1]!.rank).toBe(2);
    expect(next.waste[1]!.suit).toBe('clubs');
  });
});

// ---------------------------------------------------------------------------
// moveTableauToFoundation
// ---------------------------------------------------------------------------

describe('moveTableauToFoundation', () => {
  it('moves Ace from tableau top to foundation', () => {
    const state = makeState({
      tableau: [[card(1, 'clubs')], [], [], [], [], [], []],
    });
    const next = moveTableauToFoundation(state, 0, 0);
    expect(next).not.toBeNull();
    expect(next!.tableau[0]).toHaveLength(0);
    expect(next!.foundations[0]).toHaveLength(1);
  });

  it('does not auto-flip the newly exposed face-down card', () => {
    const state = makeState({
      tableau: [
        [card(2, 'clubs', false), card(1, 'clubs')],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const next = moveTableauToFoundation(state, 0, 0)!;
    expect(next.tableau[0]![0]!.faceUp).toBe(false);
  });

  it('awards +10 for tableau→foundation (no auto-flip bonus)', () => {
    const state = makeState({
      score: 0,
      tableau: [
        [card(2, 'clubs', false), card(1, 'clubs')],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(moveTableauToFoundation(state, 0, 0)!.score).toBe(10);
  });

  it('returns null when card is face-down', () => {
    const state = makeState({
      tableau: [[card(1, 'clubs', false)], [], [], [], [], [], []],
    });
    expect(moveTableauToFoundation(state, 0, 0)).toBeNull();
  });

  it('returns null for invalid foundation move', () => {
    const state = makeState({
      tableau: [[card(2, 'clubs')], [], [], [], [], [], []],
    });
    expect(moveTableauToFoundation(state, 0, 0)).toBeNull();
  });

  it('returns null for empty pile', () => {
    expect(moveTableauToFoundation(makeState(), 0, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// moveTableauToTableau
// ---------------------------------------------------------------------------

describe('moveTableauToTableau', () => {
  it('moves single card between piles', () => {
    const state = makeState({
      tableau: [
        [card(7, 'hearts')],
        [card(8, 'spades')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const next = moveTableauToTableau(state, 0, 0, 1);
    expect(next).not.toBeNull();
    expect(next!.tableau[0]).toHaveLength(0);
    expect(next!.tableau[1]).toHaveLength(2);
    expect(next!.tableau[1]![1]!.rank).toBe(7);
  });

  it('moves a stack of cards', () => {
    const state = makeState({
      tableau: [
        [card(7, 'hearts'), card(6, 'spades')],
        [card(8, 'clubs')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    // Move 7H+6S (starting at index 0) onto 8C
    const next = moveTableauToTableau(state, 0, 0, 1);
    expect(next).not.toBeNull();
    expect(next!.tableau[0]).toHaveLength(0);
    expect(next!.tableau[1]).toHaveLength(3);
  });

  it('does not auto-flip newly exposed face-down card after move', () => {
    const state = makeState({
      tableau: [
        [card(2, 'spades', false), card(7, 'hearts')],
        [card(8, 'spades')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const next = moveTableauToTableau(state, 0, 1, 1)!;
    expect(next.tableau[0]![0]!.faceUp).toBe(false);
  });

  it('returns null for same-pile move', () => {
    const state = makeState({
      tableau: [[card(7, 'hearts')], [], [], [], [], [], []],
    });
    expect(moveTableauToTableau(state, 0, 0, 0)).toBeNull();
  });

  it('returns null for face-down card', () => {
    const state = makeState({
      tableau: [
        [card(7, 'hearts', false)],
        [card(8, 'spades')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(moveTableauToTableau(state, 0, 0, 1)).toBeNull();
  });

  it('returns null for invalid placement', () => {
    const state = makeState({
      tableau: [
        [card(6, 'hearts')],
        [card(8, 'spades')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(moveTableauToTableau(state, 0, 0, 1)).toBeNull();
  });

  it('moves King to empty pile', () => {
    const state = makeState({
      tableau: [[card(13, 'spades')], [], [], [], [], [], []],
    });
    const next = moveTableauToTableau(state, 0, 0, 1);
    expect(next).not.toBeNull();
    expect(next!.tableau[1]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// flipTableauCard
// ---------------------------------------------------------------------------

describe('flipTableauCard', () => {
  it('flips the top face-down card', () => {
    const state = makeState({
      tableau: [[card(2, 'clubs', false)], [], [], [], [], [], []],
    });
    const next = flipTableauCard(state, 0)!;
    expect(next).not.toBeNull();
    expect(next.tableau[0]![0]!.faceUp).toBe(true);
  });

  it('returns null when top card is already face-up', () => {
    const state = makeState({
      tableau: [[card(2, 'clubs')], [], [], [], [], [], []],
    });
    expect(flipTableauCard(state, 0)).toBeNull();
  });

  it('returns null for empty pile', () => {
    expect(flipTableauCard(makeState(), 0)).toBeNull();
  });

  it('awards +5 flip bonus in standard mode', () => {
    const state = makeState({
      score: 0,
      tableau: [[card(2, 'clubs', false)], [], [], [], [], [], []],
    });
    expect(flipTableauCard(state, 0)!.score).toBe(5);
  });

  it('awards no flip bonus in vegas mode', () => {
    const state = makeState({
      score: 0,
      scoringMode: 'vegas',
      tableau: [[card(2, 'clubs', false)], [], [], [], [], [], []],
    });
    expect(flipTableauCard(state, 0)!.score).toBe(0);
  });

  it('only flips the top card, not buried face-down cards', () => {
    const state = makeState({
      tableau: [
        [card(5, 'hearts', false), card(2, 'clubs', false)],
        [], [], [], [], [], [],
      ],
    });
    const next = flipTableauCard(state, 0)!;
    expect(next.tableau[0]![1]!.faceUp).toBe(true);
    expect(next.tableau[0]![0]!.faceUp).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// moveFoundationToTableau
// ---------------------------------------------------------------------------

describe('moveFoundationToTableau', () => {
  it('moves top card from foundation to tableau', () => {
    const state = makeState({
      foundations: [[card(1, 'hearts'), card(2, 'hearts')], [], [], []],
      tableau: [[card(3, 'spades')], [], [], [], [], [], []],
    });
    const next = moveFoundationToTableau(state, 0, 0);
    expect(next).not.toBeNull();
    expect(next!.foundations[0]).toHaveLength(1);
    expect(next!.tableau[0]).toHaveLength(2);
    expect(next!.tableau[0]![1]!.rank).toBe(2);
  });

  it('returns null for empty foundation', () => {
    const state = makeState({
      tableau: [[card(3, 'spades')], [], [], [], [], [], []],
    });
    expect(moveFoundationToTableau(state, 0, 0)).toBeNull();
  });

  it('returns null for invalid placement', () => {
    const state = makeState({
      foundations: [[card(1, 'hearts'), card(2, 'hearts')], [], [], []],
      tableau: [[card(5, 'spades')], [], [], [], [], [], []],
    });
    expect(moveFoundationToTableau(state, 0, 0)).toBeNull();
  });

  it('applies -15 penalty in standard mode', () => {
    const state = makeState({
      foundations: [[card(1, 'hearts'), card(2, 'hearts')], [], [], []],
      tableau: [[card(3, 'spades')], [], [], [], [], [], []],
      score: 50,
      scoringMode: 'standard',
    });
    expect(moveFoundationToTableau(state, 0, 0)!.score).toBe(35);
  });

  it('applies -5 penalty in vegas mode', () => {
    const state = makeState({
      foundations: [[card(1, 'hearts'), card(2, 'hearts')], [], [], []],
      tableau: [[card(3, 'spades')], [], [], [], [], [], []],
      score: 0,
      scoringMode: 'vegas',
    });
    expect(moveFoundationToTableau(state, 0, 0)!.score).toBe(-5);
  });

  it('increments moves counter', () => {
    const state = makeState({
      foundations: [[card(1, 'hearts'), card(2, 'hearts')], [], [], []],
      tableau: [[card(3, 'spades')], [], [], [], [], [], []],
    });
    expect(moveFoundationToTableau(state, 0, 0)!.moves).toBe(1);
  });

  it('moves King to empty tableau pile', () => {
    const state = makeState({
      foundations: [
        Array.from({ length: 13 }, (_, i) => card((i + 1) as Card['rank'], 'hearts')),
        [],
        [],
        [],
      ],
      tableau: [[], [], [], [], [], [], []],
    });
    const next = moveFoundationToTableau(state, 0, 0);
    expect(next).not.toBeNull();
    expect(next!.foundations[0]).toHaveLength(12);
    expect(next!.tableau[0]).toHaveLength(1);
    expect(next!.tableau[0]![0]!.rank).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// findFoundationTarget
// ---------------------------------------------------------------------------

describe('findFoundationTarget', () => {
  it('finds empty foundation for Ace', () => {
    const state = makeState();
    expect(findFoundationTarget(state, card(1, 'spades'))).toBe(0);
  });

  it('returns -1 when no foundation accepts the card', () => {
    const state = makeState();
    expect(findFoundationTarget(state, card(5, 'hearts'))).toBe(-1);
  });

  it('finds correct foundation by suit', () => {
    const state = makeState({
      foundations: [
        [card(1, 'spades')],
        [card(1, 'hearts')],
        [],
        [],
      ],
    });
    // 2 of spades should go to foundation 0
    expect(findFoundationTarget(state, card(2, 'spades'))).toBe(0);
    // 2 of hearts should go to foundation 1
    expect(findFoundationTarget(state, card(2, 'hearts'))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// autoMoveToFoundation
// ---------------------------------------------------------------------------

describe('autoMoveToFoundation', () => {
  it('moves eligible waste card to foundation', () => {
    const state = makeState({ waste: [card(1, 'hearts')] });
    const next = autoMoveToFoundation(state);
    expect(next.foundations.some((f) => f.length > 0)).toBe(true);
    expect(next.waste).toHaveLength(0);
  });

  it('moves eligible tableau card to foundation', () => {
    const state = makeState({
      tableau: [[card(1, 'diamonds')], [], [], [], [], [], []],
    });
    const next = autoMoveToFoundation(state);
    expect(next.tableau[0]).toHaveLength(0);
    expect(next.foundations.some((f) => f.length > 0)).toBe(true);
  });

  it('cascades multiple moves', () => {
    // A♠ → 2♠ should both go in sequence
    const state = makeState({
      tableau: [
        [card(1, 'spades')],
        [card(2, 'spades')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const next = autoMoveToFoundation(state);
    // After A♠ goes to foundation, 2♠ can follow
    expect(next.foundations[0]).toHaveLength(2);
  });

  it('detects win after all cards moved to foundations', () => {
    // Build a state where all 52 cards are in foundations minus one
    const fullFoundations: GameState['foundations'] = [
      Array.from({ length: 12 }, (_, i) =>
        card((i + 1) as Card['rank'], 'spades'),
      ),
      Array.from({ length: 13 }, (_, i) =>
        card((i + 1) as Card['rank'], 'hearts'),
      ),
      Array.from({ length: 13 }, (_, i) =>
        card((i + 1) as Card['rank'], 'diamonds'),
      ),
      Array.from({ length: 13 }, (_, i) =>
        card((i + 1) as Card['rank'], 'clubs'),
      ),
    ];

    const state = makeState({
      foundations: fullFoundations,
      tableau: [[card(13, 'spades')], [], [], [], [], [], []],
    });

    const next = autoMoveToFoundation(state);
    expect(next.status).toBe('won');
  });
});

// ---------------------------------------------------------------------------
// createInitialState – initialScore override
// ---------------------------------------------------------------------------

describe('createInitialState – initialScore override', () => {
  it('uses provided initialScore instead of default', () => {
    const s = createInitialState(1, 1, 'standard', 999);
    expect(s.score).toBe(999);
  });

  it('uses provided initialScore in vegas mode too', () => {
    const s = createInitialState(1, 1, 'vegas', -104);
    expect(s.score).toBe(-104);
  });
});

// ---------------------------------------------------------------------------
// moveTableauToFoundation – Vegas scoring
// ---------------------------------------------------------------------------

describe('moveTableauToFoundation – Vegas scoring', () => {
  it('awards +5 in vegas mode', () => {
    const state = makeState({
      tableau: [[card(1, 'clubs')], [], [], [], [], [], []],
      score: -52,
      scoringMode: 'vegas',
    });
    expect(moveTableauToFoundation(state, 0, 0)!.score).toBe(-47);
  });
});

// ---------------------------------------------------------------------------
// Win detection via moveWasteToFoundation and moveTableauToFoundation
// ---------------------------------------------------------------------------

describe('win detection', () => {
  /** Build a state with all 52 cards on foundations except the given card in waste/tableau */
  function almostWonState(lastCard: Card, area: 'waste' | 'tableau'): GameState {
    const allSuits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const fullFoundations: GameState['foundations'] = allSuits.map((suit) =>
      Array.from({ length: 13 }, (_, i) =>
        card((i + 1) as Card['rank'], suit),
      ),
    ) as GameState['foundations'];

    // Remove the last card from the correct foundation
    const suitIdx = allSuits.indexOf(lastCard.suit);
    fullFoundations[suitIdx] = fullFoundations[suitIdx]!.slice(0, lastCard.rank - 1);

    return makeState({
      foundations: fullFoundations,
      waste: area === 'waste' ? [lastCard] : [],
      tableau:
        area === 'tableau'
          ? [[lastCard], [], [], [], [], [], []]
          : [[], [], [], [], [], [], []],
    });
  }

  it('moveWasteToFoundation triggers win when last card placed', () => {
    const lastCard = card(13, 'spades');
    const state = almostWonState(lastCard, 'waste');
    const next = moveWasteToFoundation(state, 0)!;
    expect(next).not.toBeNull();
    expect(next.status).toBe('won');
  });

  it('moveTableauToFoundation triggers win when last card placed', () => {
    const lastCard = card(13, 'spades');
    const state = almostWonState(lastCard, 'tableau');
    const next = moveTableauToFoundation(state, 0, 0)!;
    expect(next).not.toBeNull();
    expect(next.status).toBe('won');
  });

  it('status remains playing when not all 52 cards are on foundations', () => {
    const state = makeState({ waste: [card(1, 'hearts')] });
    const next = moveWasteToFoundation(state, 0)!;
    expect(next.status).toBe('playing');
  });
});

// ---------------------------------------------------------------------------
// moveTableauToTableau – out-of-bounds cardIndex
// ---------------------------------------------------------------------------

describe('moveTableauToTableau – boundary cases', () => {
  it('returns null when cardIndex is negative', () => {
    const state = makeState({
      tableau: [
        [card(7, 'hearts')],
        [card(8, 'spades')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(moveTableauToTableau(state, 0, -1, 1)).toBeNull();
  });

  it('returns null when cardIndex equals pile length', () => {
    const state = makeState({
      tableau: [
        [card(7, 'hearts')],
        [card(8, 'spades')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(moveTableauToTableau(state, 0, 1, 1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// wasteBatchSize tracking
// ---------------------------------------------------------------------------

describe('wasteBatchSize tracking', () => {
  it('drawFromStock sets wasteBatchSize to number of drawn cards', () => {
    const state = makeState({
      stock: [card(1, 's', false), card(2, 'h', false), card(3, 'c', false)],
      drawMode: 3,
    });
    expect(drawFromStock(state)!.wasteBatchSize).toBe(3);
  });

  it('drawFromStock sets wasteBatchSize to actual count when fewer than drawMode remain', () => {
    const state = makeState({
      stock: [card(1, 's', false), card(2, 'h', false)],
      drawMode: 3,
    });
    expect(drawFromStock(state)!.wasteBatchSize).toBe(2);
  });

  it('moveWasteToFoundation decrements wasteBatchSize', () => {
    const state = makeState({
      waste: [card(1, 'hearts')],
      wasteBatchSize: 3,
    });
    expect(moveWasteToFoundation(state, 0)!.wasteBatchSize).toBe(2);
  });

  it('moveWasteToFoundation does not go below 0', () => {
    const state = makeState({
      waste: [card(1, 'hearts')],
      wasteBatchSize: 0,
    });
    expect(moveWasteToFoundation(state, 0)!.wasteBatchSize).toBe(0);
  });

  it('moveWasteToTableau decrements wasteBatchSize', () => {
    const state = makeState({
      waste: [card(13, 'spades')],
      wasteBatchSize: 2,
    });
    expect(moveWasteToTableau(state, 0)!.wasteBatchSize).toBe(1);
  });

  it('recycleWaste resets wasteBatchSize to 0', () => {
    const state = makeState({
      stock: [],
      waste: [card(1, 'hearts')],
      wasteBatchSize: 3,
      drawMode: 1,
      scoringMode: 'standard',
    });
    expect(recycleWaste(state)!.wasteBatchSize).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Card conservation invariant
// After every move there must be exactly 52 unique cards across all areas.
// ---------------------------------------------------------------------------

describe('card conservation – 52 unique cards preserved after every move', () => {
  // Use a real dealt game so every area is populated realistically.
  const seed = 42;
  const base = createInitialState(seed, 1, 'standard');

  it('initial state has 52 unique cards', () => {
    assertCardInvariant(base);
  });

  it('drawFromStock preserves 52 unique cards', () => {
    const next = drawFromStock(base);
    expect(next).not.toBeNull();
    assertCardInvariant(next!);
  });

  it('recycleWaste preserves 52 unique cards', () => {
    // Draw all stock cards, then recycle.
    let state = base;
    while (state.stock.length > 0) {
      state = drawFromStock(state)!;
    }
    const recycled = recycleWaste(state);
    expect(recycled).not.toBeNull();
    assertCardInvariant(recycled!);
  });

  it('moveWasteToFoundation preserves 52 unique cards', () => {
    // Draw until we get an Ace on top of waste.
    let state = base;
    let attempts = 0;
    while (attempts < 60) {
      const drew = drawFromStock(state);
      if (!drew) {
        const r = recycleWaste(state);
        if (!r) break;
        state = r;
        continue;
      }
      state = drew;
      const top = state.waste[state.waste.length - 1];
      if (top && top.rank === 1) break;
      attempts++;
    }
    const fi = findFoundationTarget(state, state.waste[state.waste.length - 1]!);
    if (fi >= 0) {
      const next = moveWasteToFoundation(state, fi)!;
      assertCardInvariant(next);
    }
  });

  it('moveWasteToTableau preserves 52 unique cards', () => {
    let state = base;
    // Find a waste card that can go to tableau.
    let moved = false;
    for (let attempt = 0; attempt < 60 && !moved; attempt++) {
      const drew = drawFromStock(state);
      if (!drew) break;
      state = drew;
      const top = state.waste[state.waste.length - 1]!;
      for (let t = 0; t < 7; t++) {
        const next = moveWasteToTableau(state, t);
        if (next) {
          assertCardInvariant(next);
          moved = true;
          break;
        }
      }
    }
  });

  it('moveTableauToFoundation preserves 52 unique cards', () => {
    // Find a tableau pile whose top card can go to a foundation.
    let found = false;
    for (let p = 0; p < 7 && !found; p++) {
      for (let fi = 0; fi < 4 && !found; fi++) {
        const next = moveTableauToFoundation(base, p, fi);
        if (next) {
          assertCardInvariant(next);
          found = true;
        }
      }
    }
  });

  it('moveTableauToTableau preserves 52 unique cards', () => {
    let found = false;
    for (let from = 0; from < 7 && !found; from++) {
      const pile = base.tableau[from]!;
      for (let ci = 0; ci < pile.length && !found; ci++) {
        for (let to = 0; to < 7 && !found; to++) {
          const next = moveTableauToTableau(base, from, ci, to);
          if (next) {
            assertCardInvariant(next);
            found = true;
          }
        }
      }
    }
  });

  it('moveFoundationToTableau preserves 52 unique cards', () => {
    // Seed a state that has a card on a foundation so we can move it back.
    const state = makeState({
      stock: base.stock,
      waste: base.waste,
      tableau: base.tableau,
      // Manually populate foundation 0 with A♠ so the invariant holds.
      // We do this by first moving the Ace via the real logic.
      foundations: [[], [], [], []],
    });
    // Build a minimal state: put A♥ on foundation 0 and 2♠ in tableau so 2♥ can land.
    const s2 = makeState({
      foundations: [[card(1, 'hearts'), card(2, 'hearts')], [], [], []],
      tableau: [
        [card(3, 'spades')],
        ...Array.from({ length: 6 }, () => [] as Card[]),
      ] as GameState['tableau'],
      // Fill the rest of the 52 cards into stock so invariant holds.
      stock: Array.from({ length: 49 }, (_, i) => ({
        id: `x${i}`,
        rank: 1 as Card['rank'],
        suit: 'clubs' as Card['suit'],
        faceUp: false,
      })),
    });
    // For this specific invariant test, use the real dealt game after moving
    // an ace to foundation via the logic – avoids hand-crafting 52 unique cards.
    // Strategy: drawFromStock until we get the A♠ on waste, then move it.
    let cur = base;
    let aceFound = false;
    for (let attempt = 0; attempt < 100 && !aceFound; attempt++) {
      const drew = drawFromStock(cur);
      if (!drew) {
        const r = recycleWaste(cur);
        if (!r) break;
        cur = r;
        continue;
      }
      cur = drew;
      const top = cur.waste[cur.waste.length - 1];
      if (top && top.rank === 1) {
        const fi = findFoundationTarget(cur, top);
        if (fi >= 0) {
          const afterAce = moveWasteToFoundation(cur, fi)!;
          assertCardInvariant(afterAce); // sanity
          // Now try to move that Ace back to an empty tableau pile
          for (let t = 0; t < 7; t++) {
            const back = moveFoundationToTableau(afterAce, fi, t);
            if (back) {
              assertCardInvariant(back);
              aceFound = true;
              break;
            }
          }
        }
      }
    }
  });

  it('flipTableauCard preserves 52 unique cards', () => {
    // Find a tableau pile with a face-down top card.
    for (let p = 0; p < TABLEAU_SIZE; p++) {
      const pile = base.tableau[p]!;
      if (pile.length > 1) {
        // There is at least one face-down card; flip the buried one after
        // exposing it via a manual state tweak.
        const tweaked = {
          ...base,
          tableau: base.tableau.map((tp, i) =>
            i === p
              ? [...tp.slice(0, -1).map((c) => ({ ...c, faceUp: false })), tp[tp.length - 1]!]
              : tp,
          ) as GameState['tableau'],
        };
        const next = flipTableauCard(tweaked, p);
        if (next) {
          assertCardInvariant(next);
          break;
        }
      }
    }
  });

  it('multi-step sequence preserves 52 unique cards at every step', () => {
    // Play through a sequence of mixed moves and assert invariant after each.
    let state = base;

    const tryOrSkip = (fn: () => GameState | null) => {
      const next = fn();
      if (next) {
        assertCardInvariant(next);
        state = next;
      }
    };

    // Draw 10 cards
    for (let i = 0; i < 10; i++) {
      tryOrSkip(() => drawFromStock(state));
    }

    // Try moving waste to tableau
    for (let t = 0; t < 7; t++) {
      tryOrSkip(() => moveWasteToTableau(state, t));
    }

    // Try moving tableau cards to foundation
    for (let p = 0; p < 7; p++) {
      for (let fi = 0; fi < 4; fi++) {
        tryOrSkip(() => moveTableauToFoundation(state, p, fi));
      }
    }

    // Try tableau-to-tableau moves
    for (let from = 0; from < 7; from++) {
      const pile = state.tableau[from]!;
      for (let ci = 0; ci < pile.length; ci++) {
        for (let to = 0; to < 7; to++) {
          tryOrSkip(() => moveTableauToTableau(state, from, ci, to));
        }
      }
    }
  });
});

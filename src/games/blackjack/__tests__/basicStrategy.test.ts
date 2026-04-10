import { describe, it, expect } from 'vitest';
import { getBasicStrategyAction } from '../basicStrategy';
import type { Card } from '../../../shared/types';

function c(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { id: `${rank}${suit[0]}0`, suit, rank, faceUp: true };
}

// Shorthand: player cards + dealer upcard
function bs(
  playerRanks: Card['rank'][],
  dealerRank: Card['rank'],
  canDouble = true,
  canSplit = true,
): ReturnType<typeof getBasicStrategyAction> {
  return getBasicStrategyAction(
    playerRanks.map(r => c(r)),
    c(dealerRank),
    canDouble,
    canSplit,
  );
}

describe('getBasicStrategyAction — hard totals', () => {
  it('hard 8 or less → always hit', () => {
    expect(bs([3, 5], 6)).toBe('hit');
    expect(bs([2, 2], 5, true, false)).toBe('hit'); // 2,2 vs 5 but no split → hard 4
    expect(bs([4, 4], 6, true, false)).toBe('hit'); // 4,4 no split → hard 8
  });

  it('hard 9: double vs 3–6, hit otherwise', () => {
    expect(bs([5, 4], 3)).toBe('double');
    expect(bs([5, 4], 6)).toBe('double');
    expect(bs([5, 4], 2)).toBe('hit');
    expect(bs([5, 4], 7)).toBe('hit');
    expect(bs([5, 4], 11 as Card['rank'])).toBe('hit'); // Ace upcard
  });

  it('hard 9 with canDouble=false → hit', () => {
    expect(bs([5, 4], 5, false)).toBe('hit');
  });

  it('hard 10: double vs 2–9, hit vs 10/A', () => {
    expect(bs([6, 4], 2)).toBe('double');
    expect(bs([6, 4], 9)).toBe('double');
    expect(bs([6, 4], 10)).toBe('hit');
    expect(bs([6, 4], 1)).toBe('hit'); // Ace
  });

  it('hard 10 with canDouble=false → hit', () => {
    expect(bs([6, 4], 5, false)).toBe('hit');
  });

  it('hard 11: double vs 2–10, hit vs Ace', () => {
    expect(bs([7, 4], 2)).toBe('double');
    expect(bs([7, 4], 10)).toBe('double');
    expect(bs([7, 4], 1)).toBe('hit');
  });

  it('hard 11 with canDouble=false → hit', () => {
    expect(bs([7, 4], 6, false)).toBe('hit');
  });

  it('hard 12: stand vs 4–6, hit otherwise', () => {
    expect(bs([10, 2], 4)).toBe('stand');
    expect(bs([10, 2], 6)).toBe('stand');
    expect(bs([10, 2], 3)).toBe('hit');
    expect(bs([10, 2], 7)).toBe('hit');
  });

  it('hard 13–16: stand vs 2–6, hit vs 7–A', () => {
    for (const total of [13, 14, 15, 16] as const) {
      const cards: [Card['rank'], Card['rank']] = [10, (total - 10) as Card['rank']];
      expect(bs(cards, 2), `hard ${total} vs 2`).toBe('stand');
      expect(bs(cards, 6), `hard ${total} vs 6`).toBe('stand');
      expect(bs(cards, 7), `hard ${total} vs 7`).toBe('hit');
      expect(bs(cards, 1), `hard ${total} vs A`).toBe('hit');
    }
  });

  it('hard 17+ → always stand', () => {
    expect(bs([10, 7], 6)).toBe('stand');
    expect(bs([10, 8], 1)).toBe('stand');
    expect(bs([10, 10], 5)).toBe('stand');
  });
});

describe('getBasicStrategyAction — soft totals', () => {
  it('soft 13/14 (A,2 / A,3): double vs 5–6, hit otherwise', () => {
    expect(bs([1, 2], 5)).toBe('double');
    expect(bs([1, 2], 6)).toBe('double');
    expect(bs([1, 2], 4)).toBe('hit');
    expect(bs([1, 3], 5)).toBe('double');
    expect(bs([1, 3], 7)).toBe('hit');
  });

  it('soft 15/16 (A,4 / A,5): double vs 4–6, hit otherwise', () => {
    expect(bs([1, 4], 4)).toBe('double');
    expect(bs([1, 4], 6)).toBe('double');
    expect(bs([1, 4], 3)).toBe('hit');
    expect(bs([1, 5], 4)).toBe('double');
    expect(bs([1, 5], 7)).toBe('hit');
  });

  it('soft 17 (A,6): double vs 3–6, hit otherwise', () => {
    expect(bs([1, 6], 3)).toBe('double');
    expect(bs([1, 6], 6)).toBe('double');
    expect(bs([1, 6], 2)).toBe('hit');
    expect(bs([1, 6], 7)).toBe('hit');
  });

  it('soft 18 (A,7): double vs 2–6, stand vs 7–8, hit vs 9–A', () => {
    expect(bs([1, 7], 2)).toBe('double');
    expect(bs([1, 7], 6)).toBe('double');
    expect(bs([1, 7], 7)).toBe('stand');
    expect(bs([1, 7], 8)).toBe('stand');
    expect(bs([1, 7], 9)).toBe('hit');
    expect(bs([1, 7], 10)).toBe('hit');
    expect(bs([1, 7], 1)).toBe('hit');
  });

  it('soft 18 with canDouble=false → STAND (not hit) vs 2–6', () => {
    // This is the most critical edge case in basic strategy implementations
    expect(bs([1, 7], 2, false)).toBe('stand');
    expect(bs([1, 7], 3, false)).toBe('stand');
    expect(bs([1, 7], 6, false)).toBe('stand');
  });

  it('soft 18 with canDouble=false → still stand vs 7–8, hit vs 9–A', () => {
    expect(bs([1, 7], 7, false)).toBe('stand');
    expect(bs([1, 7], 9, false)).toBe('hit');
  });

  it('soft 19 (A,8) → always stand', () => {
    expect(bs([1, 8], 2)).toBe('stand');
    expect(bs([1, 8], 6)).toBe('stand');
    expect(bs([1, 8], 9)).toBe('stand');
    expect(bs([1, 8], 1)).toBe('stand');
  });

  it('soft 20 (A,9) → always stand', () => {
    expect(bs([1, 9], 5)).toBe('stand');
    expect(bs([1, 9], 1)).toBe('stand');
  });
});

describe('getBasicStrategyAction — pairs', () => {
  it('A,A → always split', () => {
    for (const d of [2,3,4,5,6,7,8,9,10,1] as Card['rank'][]) {
      expect(bs([1, 1], d), `A,A vs ${d}`).toBe('split');
    }
  });

  it('8,8 → always split', () => {
    for (const d of [2,3,4,5,6,7,8,9,10,1] as Card['rank'][]) {
      expect(bs([8, 8], d), `8,8 vs ${d}`).toBe('split');
    }
  });

  it('T,T → always stand (never split)', () => {
    for (const d of [2,3,4,5,6,7,8,9,10,1] as Card['rank'][]) {
      expect(bs([10, 10], d), `T,T vs ${d}`).toBe('stand');
    }
  });

  it('J,Q (ranks 11,12) treated as T,T → stand', () => {
    expect(bs([11 as Card['rank'], 12 as Card['rank']], 6)).toBe('stand');
  });

  it('K,K (ranks 13,13) treated as T,T → stand', () => {
    expect(bs([13 as Card['rank'], 13 as Card['rank']], 5)).toBe('stand');
  });

  it('2,2 / 3,3: split vs 2–7, hit otherwise', () => {
    for (const rank of [2, 3] as Card['rank'][]) {
      expect(bs([rank, rank], 2), `${rank},${rank} vs 2`).toBe('split');
      expect(bs([rank, rank], 7), `${rank},${rank} vs 7`).toBe('split');
      expect(bs([rank, rank], 8), `${rank},${rank} vs 8`).toBe('hit');
      expect(bs([rank, rank], 1), `${rank},${rank} vs A`).toBe('hit');
    }
  });

  it('4,4: split vs 5–6 (with DAS), hit otherwise', () => {
    expect(bs([4, 4], 5)).toBe('split');
    expect(bs([4, 4], 6)).toBe('split');
    expect(bs([4, 4], 4)).toBe('hit');
    expect(bs([4, 4], 7)).toBe('hit');
  });

  it('5,5: never split — treated as hard 10 (double vs 2–9)', () => {
    expect(bs([5, 5], 7)).toBe('double');
    expect(bs([5, 5], 9)).toBe('double');
    expect(bs([5, 5], 10)).toBe('hit');
    expect(bs([5, 5], 1)).toBe('hit');
  });

  it('6,6: split vs 2–6, hit otherwise', () => {
    expect(bs([6, 6], 2)).toBe('split');
    expect(bs([6, 6], 6)).toBe('split');
    expect(bs([6, 6], 7)).toBe('hit');
  });

  it('7,7: split vs 2–7, hit otherwise', () => {
    expect(bs([7, 7], 7)).toBe('split');
    expect(bs([7, 7], 8)).toBe('hit');
  });

  it('9,9: split vs 2–6 and 8–9; stand vs 7, 10, A', () => {
    expect(bs([9, 9], 2)).toBe('split');
    expect(bs([9, 9], 6)).toBe('split');
    expect(bs([9, 9], 8)).toBe('split');
    expect(bs([9, 9], 9)).toBe('split');
    expect(bs([9, 9], 7)).toBe('stand');
    expect(bs([9, 9], 10)).toBe('stand');
    expect(bs([9, 9], 1)).toBe('stand');
  });

  it('8,8 with canSplit=false → falls through to hard 16 (hit vs 7+)', () => {
    expect(bs([8, 8], 6, true, false)).toBe('stand'); // hard 16 vs 6 → stand
    expect(bs([8, 8], 7, true, false)).toBe('hit');   // hard 16 vs 7 → hit
  });

  it('dealer Ace (rank=1) is treated as index 11', () => {
    expect(bs([5, 4], 1)).toBe('hit'); // hard 9 vs A → hit
    expect(bs([7, 4], 1)).toBe('hit'); // hard 11 vs A → hit (not double)
    expect(bs([1, 7], 1)).toBe('hit'); // soft 18 vs A → hit
  });
});

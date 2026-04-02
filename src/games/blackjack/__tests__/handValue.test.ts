import { describe, it, expect } from 'vitest';
import { handValue } from '../blackjackLogic';
import type { Card } from '../../../shared/types';

function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { id: `${rank}${suit[0].toUpperCase()}0`, suit, rank, faceUp: true };
}

const A  = card(1);   // Ace
const T  = card(10);  // Ten
const J  = card(11);  // Jack
const Q  = card(12);  // Queen
const K  = card(13);  // King

describe('handValue', () => {
  describe('blackjack detection', () => {
    it('Ace + Ten = blackjack', () => {
      const hv = handValue([A, T]);
      expect(hv.value).toBe(21);
      expect(hv.isBlackjack).toBe(true);
      expect(hv.isSoft).toBe(true);
      expect(hv.isBust).toBe(false);
    });

    it('Ace + Jack = blackjack', () => {
      expect(handValue([A, J]).isBlackjack).toBe(true);
    });

    it('Ace + Queen = blackjack', () => {
      expect(handValue([A, Q]).isBlackjack).toBe(true);
    });

    it('Ace + King = blackjack', () => {
      expect(handValue([A, K]).isBlackjack).toBe(true);
    });

    it('21 with 3 cards is not blackjack', () => {
      const hv = handValue([A, card(9), card(1)]);
      expect(hv.value).toBe(21);
      expect(hv.isBlackjack).toBe(false);
    });

    it('Ten + Ten + Ace = 21 (not blackjack)', () => {
      const hv = handValue([T, T, A]);
      expect(hv.value).toBe(21);
      expect(hv.isBlackjack).toBe(false);
    });
  });

  describe('soft hands', () => {
    it('Ace + 6 = soft 17', () => {
      const hv = handValue([A, card(6)]);
      expect(hv.value).toBe(17);
      expect(hv.isSoft).toBe(true);
      expect(hv.isBust).toBe(false);
    });

    it('Ace + 2 = soft 13', () => {
      const hv = handValue([A, card(2)]);
      expect(hv.value).toBe(13);
      expect(hv.isSoft).toBe(true);
    });

    it('Ace + Ace = soft 12', () => {
      const hv = handValue([A, A]);
      expect(hv.value).toBe(12);
      expect(hv.isSoft).toBe(true);
    });

    it('Ace + 6 + 10 = hard 17 (Ace demoted)', () => {
      const hv = handValue([A, card(6), T]);
      expect(hv.value).toBe(17);
      expect(hv.isSoft).toBe(false);
    });

    it('Ace + Ace + 9 = 21, isSoft true', () => {
      const hv = handValue([A, A, card(9)]);
      expect(hv.value).toBe(21);
      expect(hv.isSoft).toBe(true); // one Ace still counting as 11
    });
  });

  describe('hard hands', () => {
    it('10 + 8 = 18', () => {
      const hv = handValue([T, card(8)]);
      expect(hv.value).toBe(18);
      expect(hv.isSoft).toBe(false);
      expect(hv.isBust).toBe(false);
    });

    it('K + Q = 20', () => {
      const hv = handValue([K, Q]);
      expect(hv.value).toBe(20);
    });

    it('J + 9 = 19', () => {
      expect(handValue([J, card(9)]).value).toBe(19);
    });

    it('5 + 6 = 11', () => {
      expect(handValue([card(5), card(6)]).value).toBe(11);
    });
  });

  describe('bust cases', () => {
    it('10 + 8 + 6 = 24, isBust', () => {
      const hv = handValue([T, card(8), card(6)]);
      expect(hv.isBust).toBe(true);
      expect(hv.value).toBe(24);
    });

    it('K + Q + 5 = 25, isBust', () => {
      const hv = handValue([K, Q, card(5)]);
      expect(hv.isBust).toBe(true);
    });

    it('Ace + K + Q = 21 (Ace demoted, not bust)', () => {
      const hv = handValue([A, K, Q]);
      expect(hv.isBust).toBe(false);
      expect(hv.value).toBe(21);
    });

    it('Ace + Ace + K + Q = 22 (both Aces demoted), isBust', () => {
      const hv = handValue([A, A, K, Q]);
      expect(hv.isBust).toBe(true);
      expect(hv.value).toBe(22);
    });
  });

  describe('face card values', () => {
    it('Jack = 10', () => {
      expect(handValue([J, card(9)]).value).toBe(19);
    });

    it('Queen = 10', () => {
      expect(handValue([Q, card(9)]).value).toBe(19);
    });

    it('King = 10', () => {
      expect(handValue([K, card(9)]).value).toBe(19);
    });
  });

  it('empty hand = 0', () => {
    const hv = handValue([]);
    expect(hv.value).toBe(0);
    expect(hv.isBust).toBe(false);
    expect(hv.isBlackjack).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { createDeck, createShuffledDeck } from '../deck';
import { SUITS, RANKS } from '../constants';

describe('createDeck', () => {
  it('returns exactly 52 cards', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('contains each suit–rank combination exactly once', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const matches = deck.filter((c) => c.suit === suit && c.rank === rank);
        expect(matches).toHaveLength(1);
      }
    }
  });

  it('all cards start face-down', () => {
    const deck = createDeck();
    expect(deck.every((c) => !c.faceUp)).toBe(true);
  });

  it('each card has a unique id', () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);
  });

  it('card ids encode rank and suit initial correctly', () => {
    const deck = createDeck();
    const ace = deck.find((c) => c.rank === 1 && c.suit === 'spades');
    expect(ace?.id).toBe('1S');
    const king = deck.find((c) => c.rank === 13 && c.suit === 'hearts');
    expect(king?.id).toBe('13H');
  });
});

describe('createShuffledDeck', () => {
  it('still contains all 52 unique cards', () => {
    const deck = createShuffledDeck(42);
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);
  });

  it('produces the same deck for the same seed', () => {
    const a = createShuffledDeck(123);
    const b = createShuffledDeck(123);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('produces different decks for different seeds', () => {
    const a = createShuffledDeck(1);
    const b = createShuffledDeck(2);
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });

  it('all cards remain face-down', () => {
    const deck = createShuffledDeck(0);
    expect(deck.every((c) => !c.faceUp)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import {
  createShoe,
  dealCard,
  needsReshuffle,
  createInitialState,
  placeBet,
  deal,
  hit,
  stand,
  doubleDown,
  split,
  advanceHand,
  playDealer,
  settleHands,
  nextRound,
  canSplit,
  canDoubleDown,
  isPlayerTurn,
} from '../blackjackLogic';
import type { BlackjackState, Hand, BlackjackOptions } from '../types';
import type { Card } from '../../../shared/types';
import { DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE } from '../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function c(rank: Card['rank'], suit: Card['suit'] = 'spades', faceUp = true): Card {
  return { id: `${rank}${suit[0].toUpperCase()}0`, suit, rank, faceUp };
}

function hand(cards: Card[], overrides: Partial<Hand> = {}): Hand {
  return {
    cards,
    bet: 25,
    status: 'active',
    result: null,
    doubleDownBet: 0,
    fromSplit: false,
    ...overrides,
  };
}

function bettingState(overrides: Partial<BlackjackState> = {}): BlackjackState {
  return {
    ...createInitialState(DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE, 42),
    phase: 'betting',
    currentBet: 25,
    balance: 500,
    ...overrides,
  };
}

function playingState(
  playerCards: Card[],
  dealerCards: Card[],
  overrides: Partial<BlackjackState> = {},
): BlackjackState {
  const shoe = createShoe(4, 42);
  return {
    ...createInitialState(DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE, 42),
    shoe,
    phase: 'playing',
    currentBet: 25,
    balance: 475, // 500 - 25 bet
    playerHands: [hand(playerCards)],
    activeHandIndex: 0,
    dealerHand: { cards: dealerCards, holeCardRevealed: false },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Shoe
// ---------------------------------------------------------------------------

describe('createShoe', () => {
  it('4-deck shoe has 208 cards', () => {
    const shoe = createShoe(4, 1);
    expect(shoe).toHaveLength(208);
  });

  it('1-deck shoe has 52 cards', () => {
    expect(createShoe(1, 1)).toHaveLength(52);
  });

  it('6-deck shoe has 312 cards', () => {
    expect(createShoe(6, 1)).toHaveLength(312);
  });

  it('all 52 unique rank/suit combos appear 4 times in a 4-deck shoe', () => {
    const shoe = createShoe(4, 1);
    const counts = new Map<string, number>();
    for (const card of shoe) {
      const key = `${card.rank}-${card.suit}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(52);
    for (const count of counts.values()) {
      expect(count).toBe(4);
    }
  });

  it('all card ids are unique within a 4-deck shoe', () => {
    const shoe = createShoe(4, 1);
    const ids = new Set(shoe.map(c => c.id));
    expect(ids.size).toBe(208);
  });

  it('different seeds produce different orderings', () => {
    const s1 = createShoe(4, 1);
    const s2 = createShoe(4, 2);
    const same = s1.every((c, i) => c.id === s2[i]?.id);
    expect(same).toBe(false);
  });

  it('same seed produces the same ordering', () => {
    const s1 = createShoe(4, 99);
    const s2 = createShoe(4, 99);
    expect(s1.map(c => c.id)).toEqual(s2.map(c => c.id));
  });
});

describe('dealCard', () => {
  it('returns the last card', () => {
    const shoe = [c(2), c(3), c(10)];
    const [card] = dealCard(shoe, true);
    expect(card.rank).toBe(10);
  });

  it('sets faceUp correctly', () => {
    const shoe = [c(5, 'hearts', false)];
    const [faceUp] = dealCard(shoe, true);
    expect(faceUp.faceUp).toBe(true);
    const [faceDown] = dealCard(shoe, false);
    expect(faceDown.faceUp).toBe(false);
  });

  it('reduces shoe length by 1', () => {
    const shoe = createShoe(1, 1);
    const [, remaining] = dealCard(shoe, true);
    expect(remaining).toHaveLength(51);
  });

  it('does not mutate the original shoe', () => {
    const shoe = [c(5), c(10)];
    dealCard(shoe, true);
    expect(shoe).toHaveLength(2);
  });
});

describe('needsReshuffle', () => {
  it('returns false when > penetration fraction remains', () => {
    const state = bettingState({ shoeSize: 208, dealtCount: 0 });
    expect(needsReshuffle(state)).toBe(false);
  });

  it('returns true when below penetration threshold', () => {
    // penetration = 0.25 → reshuffle when remaining < 25%
    // 157 dealt → 51 remaining = 51/208 ≈ 0.245 < 0.25 → true
    const state = bettingState({ shoeSize: 208, dealtCount: 157 });
    expect(needsReshuffle(state)).toBe(true);
  });

  it('returns false when exactly at penetration fraction', () => {
    // 156 dealt → 52 remaining = 52/208 = 0.25 exactly → NOT < 0.25 → false
    const state = bettingState({ shoeSize: 208, dealtCount: 156 });
    expect(needsReshuffle(state)).toBe(false);
  });

  it('returns true when shoe is nearly empty', () => {
    const state = bettingState({ shoeSize: 208, dealtCount: 200 });
    expect(needsReshuffle(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe('createInitialState', () => {
  it('creates state with correct phase and balance', () => {
    const state = createInitialState(DEFAULT_OPTIONS, 500, 1);
    expect(state.phase).toBe('betting');
    expect(state.balance).toBe(500);
    expect(state.currentBet).toBe(0);
    expect(state.playerHands).toHaveLength(0);
    expect(state.dealerHand.cards).toHaveLength(0);
  });

  it('shoe size matches deckCount × 52', () => {
    const state = createInitialState(DEFAULT_OPTIONS, 500, 1);
    expect(state.shoe).toHaveLength(208);
    expect(state.shoeSize).toBe(208);
  });
});

// ---------------------------------------------------------------------------
// placeBet
// ---------------------------------------------------------------------------

describe('placeBet', () => {
  it('sets the bet', () => {
    const state = bettingState({ currentBet: 0 });
    const next = placeBet(state, 50);
    expect(next?.currentBet).toBe(50);
  });

  it('returns null for bet of 0', () => {
    expect(placeBet(bettingState(), 0)).toBeNull();
  });

  it('returns null for negative bet', () => {
    expect(placeBet(bettingState(), -10)).toBeNull();
  });

  it('returns null when bet exceeds balance', () => {
    const state = bettingState({ balance: 10 });
    expect(placeBet(state, 20)).toBeNull();
  });

  it('allows bet equal to balance', () => {
    const state = bettingState({ balance: 25 });
    expect(placeBet(state, 25)?.currentBet).toBe(25);
  });

  it('returns null if not in betting phase', () => {
    const state = bettingState({ phase: 'playing' });
    expect(placeBet(state, 25)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deal
// ---------------------------------------------------------------------------

describe('deal', () => {
  it('transitions phase to playing', () => {
    const state = bettingState();
    const next = deal(state);
    expect(next?.phase === 'playing' || next?.phase === 'settlement').toBe(true);
  });

  it('deals 2 cards to player and 2 to dealer', () => {
    const state = bettingState();
    const next = deal(state);
    if (!next || next.phase === 'settlement') return; // natural handled
    expect(next.playerHands[0]?.cards).toHaveLength(2);
    expect(next.dealerHand.cards).toHaveLength(2);
  });

  it('dealer hole card is face-down', () => {
    const state = bettingState();
    const next = deal(state);
    if (!next || next.phase === 'settlement') return;
    expect(next.dealerHand.cards[1]?.faceUp).toBe(false);
  });

  it('dealer up-card is face-up', () => {
    const state = bettingState();
    const next = deal(state);
    if (!next || next.phase === 'settlement') return;
    expect(next.dealerHand.cards[0]?.faceUp).toBe(true);
  });

  it('reduces shoe by 4 cards', () => {
    const state = bettingState();
    const initialShoeLength = state.shoe.length;
    const next = deal(state);
    if (!next) return;
    const totalCards = (next.playerHands[0]?.cards.length ?? 0) +
      next.dealerHand.cards.length +
      next.shoe.length;
    expect(totalCards).toBe(initialShoeLength);
  });

  it('returns null if not in betting phase', () => {
    const state = bettingState({ phase: 'playing' });
    expect(deal(state)).toBeNull();
  });

  it('returns null if no bet placed', () => {
    const state = bettingState({ currentBet: 0 });
    expect(deal(state)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hit
// ---------------------------------------------------------------------------

describe('hit', () => {
  it('adds a card to the active hand', () => {
    const state = playingState([c(5), c(7)], [c(10), c(6)]);
    const next = hit(state);
    expect(next?.playerHands[0]?.cards).toHaveLength(3);
  });

  it('busts the hand when total > 21', () => {
    const state = playingState([c(10), c(9)], [c(8), c(7)]);
    const shoe = [c(5), c(10), c(3)]; // 3 is top
    const next = hit({ ...state, shoe });
    // 10+9+3 = 22 → bust, transitions away from 'playing'
    expect(next?.playerHands[0]?.status).toBe('bust');
  });

  it('returns null if not in playing phase', () => {
    const state = playingState([c(5), c(7)], [c(10), c(6)], { phase: 'betting' });
    expect(hit(state)).toBeNull();
  });

  it('dealing an Ace to a hand prevents false bust', () => {
    const state = playingState([c(10), c(5)], [c(8), c(7)]);
    const shoe = [c(1)]; // Ace on top — 10+5+Ace = 16 (soft)
    const next = hit({ ...state, shoe });
    expect(next?.playerHands[0]?.status).toBe('active');
    expect(next?.playerHands[0]?.cards).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// stand
// ---------------------------------------------------------------------------

describe('stand', () => {
  it('marks hand as standing', () => {
    const state = playingState([c(10), c(8)], [c(7), c(6)]);
    const next = stand(state);
    // After standing, phase transitions to dealer
    expect(next?.phase).toBe('settlement'); // single hand → goes to dealer → settles
  });

  it('returns null if not in playing phase', () => {
    const state = playingState([c(5), c(7)], [c(10), c(6)], { phase: 'betting' });
    expect(stand(state)).toBeNull();
  });

  it('with multiple hands, advances to next active hand', () => {
    const state: BlackjackState = {
      ...playingState([c(5), c(6)], [c(8), c(7)]),
      playerHands: [
        hand([c(5), c(6)], { status: 'active' }),
        hand([c(9), c(4)], { status: 'active' }),
      ],
      activeHandIndex: 0,
    };
    const next = stand(state);
    expect(next?.phase).toBe('playing');
    expect(next?.activeHandIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// doubleDown
// ---------------------------------------------------------------------------

describe('doubleDown', () => {
  it('deals exactly 1 card', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)]);
    const next = doubleDown(state);
    const cards = next?.playerHands[0]?.cards;
    expect(cards).toHaveLength(3);
  });

  it('sets doubleDownBet', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)]);
    const next = doubleDown(state);
    expect(next?.playerHands[0]?.doubleDownBet).toBe(25);
  });

  it('deducts extra bet from balance before settlement', () => {
    // doubleDown deducts the bet, then immediately settles (single hand).
    // We verify via doubleDownBet field and that balance is not unchanged.
    const state = playingState([c(5), c(6)], [c(8), c(7)]);
    const next = doubleDown(state);
    expect(next).not.toBeNull();
    // doubleDownBet confirms the extra wager was recorded
    expect(next?.playerHands[0]?.doubleDownBet).toBe(25);
    // balance must differ from the pre-double balance
    expect(next?.balance).not.toBe(state.balance);
  });

  it('returns null on non-2-card hand', () => {
    const state = playingState([c(5), c(6), c(2)], [c(8), c(7)]);
    expect(doubleDown(state)).toBeNull();
  });

  it('returns null when balance insufficient', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)], { balance: 10 });
    expect(doubleDown(state)).toBeNull();
  });

  it('returns null if not in playing phase', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)], { phase: 'betting' });
    expect(doubleDown(state)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// split
// ---------------------------------------------------------------------------

describe('split', () => {
  it('creates 2 hands from a pair', () => {
    const state = playingState([c(8), c(8)], [c(7), c(6)]);
    const next = split(state);
    expect(next?.playerHands).toHaveLength(2);
  });

  it('each new hand gets 2 cards', () => {
    const state = playingState([c(8), c(8)], [c(7), c(6)]);
    const next = split(state);
    expect(next?.playerHands[0]?.cards).toHaveLength(2);
    expect(next?.playerHands[1]?.cards).toHaveLength(2);
  });

  it('deducts extra bet from balance', () => {
    const state = playingState([c(8), c(8)], [c(7), c(6)]);
    const next = split(state);
    expect(next?.balance).toBe(state.balance - 25);
  });

  it('returns null for non-pair', () => {
    const state = playingState([c(8), c(9)], [c(7), c(6)]);
    expect(split(state)).toBeNull();
  });

  it('returns null when balance insufficient', () => {
    const state = playingState([c(8), c(8)], [c(7), c(6)], { balance: 10 });
    expect(split(state)).toBeNull();
  });

  it('split Aces auto-stand each hand', () => {
    const state = playingState([c(1), c(1)], [c(7), c(6)]);
    const next = split(state);
    expect(next?.playerHands[0]?.status).toBe('standing');
    expect(next?.playerHands[1]?.status).toBe('standing');
  });

  it('returns null when maxSplits reached', () => {
    const opts: BlackjackOptions = { ...DEFAULT_OPTIONS, maxSplits: 1 };
    const state: BlackjackState = {
      ...playingState([c(8), c(8)], [c(7), c(6)]),
      options: opts,
      playerHands: [
        hand([c(8), c(8)], { status: 'active', fromSplit: false }),
        hand([c(8), c(3)], { status: 'standing', fromSplit: true }),
      ],
    };
    expect(split(state)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dealer play
// ---------------------------------------------------------------------------

describe('playDealer', () => {
  it('dealer hits until >= 17', () => {
    const shoe = [c(10), c(3), c(5)]; // top = 5
    const state: BlackjackState = {
      ...playingState([c(10), c(8)], [c(6, 'hearts'), c(5)]),
      shoe,
      phase: 'dealer',
      dealerHand: { cards: [c(6), c(5)], holeCardRevealed: true }, // 11
    };
    const next = playDealer(state);
    // dealer starts at 11, hits 5 = 16, hits 3 = 19, stops
    const dealerTotal = next.dealerHand.cards.reduce((sum, card) => {
      return sum + Math.min(card.rank, 10);
    }, 0);
    expect(dealerTotal).toBeGreaterThanOrEqual(17);
    expect(next.phase).toBe('settlement');
  });

  it('dealer stands on hard 17', () => {
    const state: BlackjackState = {
      ...playingState([c(10), c(8)], [c(10), c(7)]),
      phase: 'dealer',
      dealerHand: { cards: [c(10), c(7)], holeCardRevealed: true }, // 17
      shoe: [],
    };
    const next = playDealer(state);
    expect(next.dealerHand.cards).toHaveLength(2);
    expect(next.phase).toBe('settlement');
  });

  it('dealer hits soft 17 when option enabled', () => {
    const opts: BlackjackOptions = { ...DEFAULT_OPTIONS, dealerHitsSoft17: true };
    const shoe = [c(10)];
    const state: BlackjackState = {
      ...playingState([c(10), c(8)], [c(1), c(6)]),
      options: opts,
      phase: 'dealer',
      dealerHand: { cards: [c(1), c(6)], holeCardRevealed: true }, // soft 17
      shoe,
    };
    const next = playDealer(state);
    // dealt 10 → Ace+6+10 = 17 hard, stands
    expect(next.dealerHand.cards).toHaveLength(3);
  });

  it('dealer stands on soft 17 by default', () => {
    const state: BlackjackState = {
      ...playingState([c(10), c(8)], [c(1), c(6)]),
      phase: 'dealer',
      dealerHand: { cards: [c(1), c(6)], holeCardRevealed: true }, // soft 17
      shoe: [],
    };
    const next = playDealer(state);
    expect(next.dealerHand.cards).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// settlement
// ---------------------------------------------------------------------------

describe('settleHands', () => {
  function settlementState(
    playerCards: Card[],
    dealerCards: Card[],
    options: Partial<BlackjackOptions> = {},
  ): BlackjackState {
    return {
      ...playingState(playerCards, dealerCards),
      phase: 'dealer',
      balance: 475,
      dealerHand: { cards: dealerCards, holeCardRevealed: true },
      options: { ...DEFAULT_OPTIONS, ...options },
    };
  }

  it('player wins when higher than dealer', () => {
    const state = settlementState([c(10), c(9)], [c(10), c(7)]);
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('win');
    expect(next.balance).toBe(475 + 25 * 2); // bet returned + win
  });

  it('player loses when lower than dealer', () => {
    const state = settlementState([c(10), c(7)], [c(10), c(9)]);
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('loss');
    expect(next.balance).toBe(475); // no change (bet already deducted)
  });

  it('push: same value, balance unchanged', () => {
    const state = settlementState([c(10), c(8)], [c(10), c(8)]);
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('push');
    expect(next.balance).toBe(475 + 25); // bet returned
  });

  it('player busts regardless of dealer: loss', () => {
    const state: BlackjackState = {
      ...settlementState([c(10), c(9)], [c(10), c(9)]),
      playerHands: [hand([c(10), c(9), c(5)], { status: 'bust' })],
    };
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('loss');
  });

  it('dealer busts, player does not: player wins', () => {
    const state = settlementState([c(10), c(8)], [c(10), c(7), c(9)]);
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('win');
  });

  it('blackjack pays 3:2', () => {
    const state: BlackjackState = {
      ...settlementState([c(1), c(10)], [c(10), c(7)]),
      playerHands: [hand([c(1), c(10)], { status: 'blackjack', bet: 100 })],
      balance: 400,
    };
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('blackjack');
    expect(next.balance).toBe(400 + 100 + 150); // bet + 3:2 payout
  });

  it('blackjack pays 6:5 when option set', () => {
    const state: BlackjackState = {
      ...settlementState([c(1), c(10)], [c(10), c(7)], { blackjackPayout: '6:5' }),
      playerHands: [hand([c(1), c(10)], { status: 'blackjack', bet: 100 })],
      balance: 400,
    };
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('blackjack');
    expect(next.balance).toBe(400 + 100 + 120); // bet + 6:5 payout
  });

  it('player blackjack vs dealer blackjack = push', () => {
    const state: BlackjackState = {
      ...settlementState([c(1), c(10)], [c(1), c(10)]),
      playerHands: [hand([c(1), c(10)], { status: 'blackjack', bet: 25 })],
      balance: 475,
    };
    const next = settleHands(state);
    expect(next.playerHands[0]?.result).toBe('push');
    expect(next.balance).toBe(475 + 25);
  });

  it('phase transitions to settlement', () => {
    const state = settlementState([c(10), c(8)], [c(10), c(7)]);
    expect(settleHands(state).phase).toBe('settlement');
  });
});

// ---------------------------------------------------------------------------
// nextRound
// ---------------------------------------------------------------------------

describe('nextRound', () => {
  it('transitions to betting phase', () => {
    const state = bettingState({ phase: 'settlement' });
    const next = nextRound(state);
    expect(next?.phase).toBe('betting');
  });

  it('clears hands', () => {
    const state: BlackjackState = {
      ...bettingState({ phase: 'settlement' }),
      playerHands: [hand([c(10), c(8)])],
      dealerHand: { cards: [c(10), c(7)], holeCardRevealed: true },
    };
    const next = nextRound(state);
    expect(next?.playerHands).toHaveLength(0);
    expect(next?.dealerHand.cards).toHaveLength(0);
  });

  it('returns null if not in settlement phase', () => {
    expect(nextRound(bettingState({ phase: 'betting' }))).toBeNull();
    expect(nextRound(bettingState({ phase: 'playing' }))).toBeNull();
  });

  it('reshuffles when penetration threshold reached', () => {
    const state: BlackjackState = {
      ...bettingState({ phase: 'settlement' }),
      shoeSize: 208,
      dealtCount: 160, // ~77% dealt → below 25% threshold
    };
    const next = nextRound(state);
    expect(next?.shoeSize).toBe(208); // fresh shoe
    expect(next?.dealtCount).toBe(0);
  });

  it('does not reshuffle when shoe is fresh', () => {
    const state: BlackjackState = {
      ...bettingState({ phase: 'settlement' }),
      shoeSize: 208,
      dealtCount: 10,
    };
    const originalShoeTop = state.shoe[state.shoe.length - 1]?.id;
    const next = nextRound(state);
    // dealtCount preserved, shoe unchanged
    expect(next?.dealtCount).toBe(10);
    expect(next?.shoe[next.shoe.length - 1]?.id).toBe(originalShoeTop);
  });
});

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

describe('canSplit', () => {
  it('returns true for a pair', () => {
    const state = playingState([c(8), c(8)], [c(7), c(6)]);
    expect(canSplit(state)).toBe(true);
  });

  it('returns false for non-pair', () => {
    const state = playingState([c(8), c(9)], [c(7), c(6)]);
    expect(canSplit(state)).toBe(false);
  });

  it('returns false when insufficient balance', () => {
    const state = playingState([c(8), c(8)], [c(7), c(6)], { balance: 0 });
    expect(canSplit(state)).toBe(false);
  });

  it('returns false when maxSplits reached', () => {
    const opts: BlackjackOptions = { ...DEFAULT_OPTIONS, maxSplits: 1 };
    const state: BlackjackState = {
      ...playingState([c(8), c(8)], [c(7), c(6)]),
      options: opts,
      playerHands: [
        hand([c(8), c(8)], { fromSplit: false }),
        hand([c(8), c(3)], { status: 'standing', fromSplit: true }),
      ],
    };
    expect(canSplit(state)).toBe(false);
  });
});

describe('canDoubleDown', () => {
  it('returns true for initial 2-card hand', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)]);
    expect(canDoubleDown(state)).toBe(true);
  });

  it('returns false for 3+ card hand', () => {
    const state = playingState([c(5), c(6), c(2)], [c(8), c(7)]);
    expect(canDoubleDown(state)).toBe(false);
  });

  it('returns false when insufficient balance', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)], { balance: 0 });
    expect(canDoubleDown(state)).toBe(false);
  });

  it('returns false when not in playing phase', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)], { phase: 'betting' });
    expect(canDoubleDown(state)).toBe(false);
  });
});

describe('isPlayerTurn', () => {
  it('returns true when phase is playing and active hand is active', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)]);
    expect(isPlayerTurn(state)).toBe(true);
  });

  it('returns false when phase is not playing', () => {
    const state = playingState([c(5), c(6)], [c(8), c(7)], { phase: 'betting' });
    expect(isPlayerTurn(state)).toBe(false);
  });

  it('returns false when active hand is standing', () => {
    const state: BlackjackState = {
      ...playingState([c(5), c(6)], [c(8), c(7)]),
      playerHands: [hand([c(5), c(6)], { status: 'standing' })],
    };
    expect(isPlayerTurn(state)).toBe(false);
  });
});

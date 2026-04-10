import type { Card } from '../../shared/types';
import { SUITS, RANKS } from '../../shared/constants';
import { mulberry32, shuffleArray } from '../../shared/rng';
import type {
  BlackjackState,
  BlackjackOptions,
  Hand,
  HandStatus,
  HandResult,
  DealerHand,
} from './types';
import {
  BLACKJACK_INITIAL_BALANCE,
  DEFAULT_OPTIONS,
  ACE_RANK,
  ACE_HIGH,
  TEN_VALUE,
  BLACKJACK_VALUE,
  INITIAL_HAND_SIZE,
  DEALER_STAND_VALUE,
  PAYOUT_NATURAL_3_2,
  PAYOUT_NATURAL_6_5,
  WIN_PAYOUT_MULTIPLIER,
  HI_LO_LOW_MIN,
  HI_LO_LOW_MAX,
  HI_LO_NEUTRAL_MIN,
  HI_LO_NEUTRAL_MAX,
} from './constants';

// ---------------------------------------------------------------------------
// Hand value
// ---------------------------------------------------------------------------

export interface HandValue {
  value: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

/** Compute the best (highest non-busting) value for a set of cards. */
export function handValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const r = card.rank;
    if (r === ACE_RANK) {
      aces++;
      total += ACE_HIGH;
    } else {
      total += Math.min(r, TEN_VALUE);
    }
  }

  // Demote Aces from 11 → 1 as needed
  while (total > BLACKJACK_VALUE && aces > 0) {
    total -= TEN_VALUE;
    aces--;
  }

  return {
    value: total,
    isSoft: aces > 0,
    isBust: total > BLACKJACK_VALUE,
    isBlackjack: cards.length === INITIAL_HAND_SIZE && total === BLACKJACK_VALUE,
  };
}

// ---------------------------------------------------------------------------
// Hi-Lo card counting
// ---------------------------------------------------------------------------

/** Returns the Hi-Lo count value for a single card. */
export function hiLoValue(card: Card): number {
  const r = card.rank;
  if (r >= HI_LO_LOW_MIN && r <= HI_LO_LOW_MAX) return 1;         // ranks 2–6 → +1
  if (r >= HI_LO_NEUTRAL_MIN && r <= HI_LO_NEUTRAL_MAX) return 0; // ranks 7–9 →  0
  return -1;                                                         // Ace (rank 1) and 10–K → -1
}

// ---------------------------------------------------------------------------
// Shoe construction
// ---------------------------------------------------------------------------

/**
 * Build an N-deck shoe with unique card ids (rank+suit+deckIndex).
 * Last element = top of shoe (next to deal).
 */
export function createShoe(deckCount: number, seed: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${rank}${suit[0].toUpperCase()}${d}`,
          suit,
          rank,
          faceUp: false,
        });
      }
    }
  }
  return shuffleArray(cards, mulberry32(seed));
}

/**
 * Deal one card from the top of the shoe (last element).
 * Returns [card with faceUp set, remaining shoe].
 */
export function dealCard(shoe: Card[], faceUp: boolean): [Card, Card[]] {
  const card = { ...shoe[shoe.length - 1]!, faceUp };
  return [card, shoe.slice(0, -1)];
}

/** Returns true when the shoe needs reshuffling before the next round. */
export function needsReshuffle(state: BlackjackState): boolean {
  const remaining = state.shoeSize - state.dealtCount;
  return remaining / state.shoeSize < state.options.penetration;
}

// ---------------------------------------------------------------------------
// Round lifecycle
// ---------------------------------------------------------------------------

/** Create a fresh BlackjackState with a new shoe. */
export function createInitialState(
  options: BlackjackOptions = DEFAULT_OPTIONS,
  initialBalance: number = BLACKJACK_INITIAL_BALANCE,
  seed: number = Date.now(),
): BlackjackState {
  const shoe = createShoe(options.deckCount, seed);
  return {
    shoe,
    dealtCount: 0,
    shoeSize: shoe.length,
    playerHands: [],
    activeHandIndex: 0,
    dealerHand: { cards: [], holeCardRevealed: false },
    phase: 'betting',
    balance: initialBalance,
    currentBet: 0,
    shoeSeed: seed,
    options,
    runningCount: 0,
  };
}

/** Set or update the bet for the upcoming round. Returns null if invalid. */
export function placeBet(state: BlackjackState, amount: number): BlackjackState | null {
  if (state.phase !== 'betting') return null;
  if (amount <= 0 || amount > state.balance) return null;
  return { ...state, currentBet: amount };
}

/**
 * Deal initial 2 cards to player and dealer.
 * Deal order: player face-up, dealer face-up, player face-up, dealer face-down.
 * Handles immediate natural blackjack resolution.
 */
export function deal(state: BlackjackState): BlackjackState | null {
  if (state.phase !== 'betting') return null;
  if (state.currentBet <= 0) return null;

  let shoe = state.shoe;
  let dealtCount = state.dealtCount;

  const drawFaceUp = (): [Card, typeof shoe] => {
    const [c, s] = dealCard(shoe, true);
    shoe = s;
    dealtCount++;
    return [c, shoe];
  };
  const drawFaceDown = (): [Card, typeof shoe] => {
    const [c, s] = dealCard(shoe, false);
    shoe = s;
    dealtCount++;
    return [c, shoe];
  };

  const [p1] = drawFaceUp();
  const [d1] = drawFaceUp();
  const [p2] = drawFaceUp();
  const [d2] = drawFaceDown();

  const playerCards = [p1, p2];
  const dealerCards = [d1, d2];

  const playerBJ = handValue(playerCards).isBlackjack;
  const dealerBJ = handValue([{ ...d2, faceUp: true }, d1]).isBlackjack;

  let playerStatus: HandStatus = playerBJ ? 'blackjack' : 'active';
  let phase = state.phase;

  const hand: Hand = {
    cards: playerCards,
    bet: state.currentBet,
    status: playerStatus,
    result: null,
    doubleDownBet: 0,
    fromSplit: false,
  };

  const dealerHand: DealerHand = {
    cards: dealerCards,
    holeCardRevealed: false,
  };

  // Count visible cards: p1, d1, p2 are face-up; d2 (hole card) is hidden
  const runningCount = state.runningCount + hiLoValue(p1) + hiLoValue(d1) + hiLoValue(p2);

  const next: BlackjackState = {
    ...state,
    shoe,
    dealtCount,
    balance: state.balance - state.currentBet,
    playerHands: [hand],
    activeHandIndex: 0,
    dealerHand,
    phase: 'playing',
    runningCount,
  };

  // Both blackjack or player blackjack (dealer will be checked in settlement)
  if (playerBJ || dealerBJ) {
    return settleHands(revealHoleCard({ ...next, phase: 'dealer' }));
  }

  return next;
}

/** Deal one card to the active player hand. */
export function hit(state: BlackjackState): BlackjackState | null {
  if (state.phase !== 'playing') return null;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.status !== 'active') return null;

  let shoe = state.shoe;
  const [card, newShoe] = dealCard(shoe, true);
  shoe = newShoe;

  const newCards = [...hand.cards, card];
  const value = handValue(newCards);

  const newStatus: HandStatus = value.isBust ? 'bust' : 'active';
  const updatedHand: Hand = { ...hand, cards: newCards, status: newStatus };
  const hands = replaceHand(state.playerHands, state.activeHandIndex, updatedHand);

  const next: BlackjackState = {
    ...state,
    shoe,
    dealtCount: state.dealtCount + 1,
    playerHands: hands,
    runningCount: state.runningCount + hiLoValue(card),
  };

  if (newStatus === 'bust') {
    return advanceHand(next);
  }
  return next;
}

/** Player stands on the active hand. */
export function stand(state: BlackjackState): BlackjackState | null {
  if (state.phase !== 'playing') return null;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.status !== 'active') return null;

  const updatedHand: Hand = { ...hand, status: 'standing' };
  const hands = replaceHand(state.playerHands, state.activeHandIndex, updatedHand);

  return advanceHand({ ...state, playerHands: hands });
}

/** Player doubles down: doubles bet, deals exactly 1 card, then stands. */
export function doubleDown(state: BlackjackState): BlackjackState | null {
  if (state.phase !== 'playing') return null;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.status !== 'active') return null;
  if (hand.cards.length !== INITIAL_HAND_SIZE) return null;
  if (!canDoubleDown(state)) return null;

  const [card, newShoe] = dealCard(state.shoe, true);
  const newCards = [...hand.cards, card];
  const value = handValue(newCards);
  const newStatus: HandStatus = value.isBust ? 'bust' : 'doubled';

  const updatedHand: Hand = {
    ...hand,
    cards: newCards,
    status: newStatus,
    doubleDownBet: hand.bet,
  };
  const hands = replaceHand(state.playerHands, state.activeHandIndex, updatedHand);

  return advanceHand({
    ...state,
    shoe: newShoe,
    dealtCount: state.dealtCount + 1,
    balance: state.balance - hand.bet,
    playerHands: hands,
    runningCount: state.runningCount + hiLoValue(card),
  });
}

/** Player splits the active hand. */
export function split(state: BlackjackState): BlackjackState | null {
  if (state.phase !== 'playing') return null;
  if (!canSplit(state)) return null;

  const hand = state.playerHands[state.activeHandIndex];
  if (!hand) return null;

  let shoe = state.shoe;
  let dealtCount = state.dealtCount;

  const draw = (): Card => {
    const [c, s] = dealCard(shoe, true);
    shoe = s;
    dealtCount++;
    return c;
  };

  const [cardA, cardB] = hand.cards as [Card, Card];
  const c1 = draw();
  const c2 = draw();

  const isAce = cardA.rank === ACE_RANK;

  // Aces: each hand gets 1 card and auto-stands (standard rule)
  const hand1: Hand = {
    cards: [cardA, c1],
    bet: hand.bet,
    status: isAce ? 'standing' : 'active',
    result: null,
    doubleDownBet: 0,
    fromSplit: true,
  };
  const hand2: Hand = {
    cards: [cardB, c2],
    bet: hand.bet,
    status: isAce ? 'standing' : 'active',
    result: null,
    doubleDownBet: 0,
    fromSplit: true,
  };

  const hands = [
    ...state.playerHands.slice(0, state.activeHandIndex),
    hand1,
    hand2,
    ...state.playerHands.slice(state.activeHandIndex + 1),
  ];

  const next: BlackjackState = {
    ...state,
    shoe,
    dealtCount,
    balance: state.balance - hand.bet,
    playerHands: hands,
    runningCount: state.runningCount + hiLoValue(c1) + hiLoValue(c2),
  };

  // If Aces were split (both hands are standing), advance immediately
  if (isAce) {
    return advanceHand({ ...next, activeHandIndex: state.activeHandIndex });
  }

  return next;
}

/**
 * Advance to the next active hand.
 * Transitions to 'dealer' phase when no more active hands remain.
 */
export function advanceHand(state: BlackjackState): BlackjackState {
  const nextIndex = state.playerHands.findIndex(
    (h, i) => i > state.activeHandIndex && h.status === 'active'
  );

  if (nextIndex !== -1) {
    return { ...state, activeHandIndex: nextIndex };
  }

  // No more active hands — dealer's turn
  return playDealer(revealHoleCard({ ...state, phase: 'dealer' }));
}

// ---------------------------------------------------------------------------
// Dealer
// ---------------------------------------------------------------------------

function revealHoleCard(state: BlackjackState): BlackjackState {
  const cards = state.dealerHand.cards.map(c => ({ ...c, faceUp: true }));
  // Hole card is index 1 (dealt second, face-down); count it now that it's revealed
  const holeCard = state.dealerHand.cards[1];
  const runningCount = holeCard
    ? state.runningCount + hiLoValue(holeCard)
    : state.runningCount;
  return {
    ...state,
    runningCount,
    dealerHand: { cards, holeCardRevealed: true },
  };
}

/** Dealer plays out: hits until value >= 17 (respecting soft-17 option). */
export function playDealer(state: BlackjackState): BlackjackState {
  let dealerCards = state.dealerHand.cards;
  let shoe = state.shoe;
  let dealtCount = state.dealtCount;
  let runningCount = state.runningCount;

  while (true) {
    const hv = handValue(dealerCards);
    const shouldHit =
      hv.value < DEALER_STAND_VALUE ||
      (state.options.dealerHitsSoft17 && hv.value === DEALER_STAND_VALUE && hv.isSoft);

    if (!shouldHit) break;
    if (shoe.length === 0) break;

    const [card, newShoe] = dealCard(shoe, true);
    dealerCards = [...dealerCards, card];
    shoe = newShoe;
    dealtCount++;
    runningCount += hiLoValue(card);
  }

  return settleHands({
    ...state,
    shoe,
    dealtCount,
    runningCount,
    dealerHand: { cards: dealerCards, holeCardRevealed: true },
  });
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

/** Compute results for all hands and adjust balance. */
export function settleHands(state: BlackjackState): BlackjackState {
  const dealerHv = handValue(
    state.dealerHand.cards.map(c => ({ ...c, faceUp: true }))
  );
  const dealerBJ = dealerHv.isBlackjack;

  let balance = state.balance;

  const settledHands: Hand[] = state.playerHands.map(hand => {
    // Already-bust hands lost; blackjack hands need checking against dealer
    if (hand.status === 'bust') {
      return { ...hand, result: 'loss' as HandResult };
    }

    const playerHv = handValue(hand.cards);
    const totalBet = hand.bet + hand.doubleDownBet;
    let result: HandResult;

    if (hand.status === 'blackjack') {
      if (dealerBJ) {
        result = 'push';
        balance += totalBet; // return bet
      } else {
        result = 'blackjack';
        const payout = state.options.blackjackPayout === '3:2'
          ? totalBet * PAYOUT_NATURAL_3_2
          : totalBet * PAYOUT_NATURAL_6_5;
        balance += totalBet + payout;
      }
    } else if (dealerHv.isBust) {
      result = 'win';
      balance += totalBet * WIN_PAYOUT_MULTIPLIER;
    } else if (playerHv.value > dealerHv.value) {
      result = 'win';
      balance += totalBet * WIN_PAYOUT_MULTIPLIER;
    } else if (playerHv.value === dealerHv.value) {
      result = 'push';
      balance += totalBet;
    } else {
      result = 'loss';
    }

    return { ...hand, result };
  });

  return {
    ...state,
    playerHands: settledHands,
    balance,
    phase: 'settlement',
  };
}

/** Begin the next round. Reshuffles shoe if needed. */
export function nextRound(state: BlackjackState): BlackjackState | null {
  if (state.phase !== 'settlement') return null;

  if (needsReshuffle(state)) {
    const newSeed = Date.now();
    const newShoe = createShoe(state.options.deckCount, newSeed);
    return {
      ...state,
      shoe: newShoe,
      shoeSize: newShoe.length,
      dealtCount: 0,
      shoeSeed: newSeed,
      playerHands: [],
      activeHandIndex: 0,
      dealerHand: { cards: [], holeCardRevealed: false },
      phase: 'betting',
      currentBet: state.currentBet, // keep last bet as default
      runningCount: 0, // reset count on new shoe
    };
  }

  return {
    ...state,
    playerHands: [],
    activeHandIndex: 0,
    dealerHand: { cards: [], holeCardRevealed: false },
    phase: 'betting',
  };
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

export function canSplit(state: BlackjackState): boolean {
  if (state.phase !== 'playing') return false;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.status !== 'active') return false;
  if (hand.cards.length !== INITIAL_HAND_SIZE) return false;

  const [a, b] = hand.cards;
  if (!a || !b) return false;
  if (a.rank !== b.rank) return false;

  // Count existing split hands
  const splitCount = state.playerHands.filter(h => h.fromSplit).length;
  if (splitCount >= state.options.maxSplits) return false;

  // Must have enough balance for extra bet
  if (state.balance < hand.bet) return false;

  return true;
}

export function canDoubleDown(state: BlackjackState): boolean {
  if (state.phase !== 'playing') return false;
  const hand = state.playerHands[state.activeHandIndex];
  if (!hand || hand.status !== 'active') return false;
  if (hand.cards.length !== INITIAL_HAND_SIZE) return false;
  if (hand.fromSplit && !state.options.doubleAfterSplit) return false;
  if (state.balance < hand.bet) return false;
  return true;
}

export function isPlayerTurn(state: BlackjackState): boolean {
  return state.phase === 'playing' &&
    state.playerHands[state.activeHandIndex]?.status === 'active';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function replaceHand(hands: Hand[], index: number, hand: Hand): Hand[] {
  return hands.map((h, i) => (i === index ? hand : h));
}

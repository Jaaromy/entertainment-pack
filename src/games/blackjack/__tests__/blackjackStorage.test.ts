import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadBlackjackGame,
  saveBlackjackGame,
  clearBlackjackGame,
  loadBlackjackStats,
  recordBlackjackResult,
  loadBlackjackSettings,
  saveBlackjackSettings,
  loadBlackjackBalance,
} from '../storage';
import { createInitialState } from '../blackjackLogic';
import { DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE } from '../constants';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

function makeMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn((k: string) => { store.delete(k); }),
    clear: vi.fn(() => { store.clear(); }),
    get length() { return store.size; },
    key: vi.fn((i: number) => [...store.keys()][i] ?? null),
  };
}

let mockStorage = makeMockStorage();

beforeEach(() => {
  mockStorage = makeMockStorage();
  vi.stubGlobal('localStorage', mockStorage);
});

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

describe('loadBlackjackGame / saveBlackjackGame', () => {
  it('returns null when nothing saved', () => {
    expect(loadBlackjackGame()).toBeNull();
  });

  it('round-trips game state', () => {
    const state = createInitialState(DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE, 1);
    saveBlackjackGame(state);
    const loaded = loadBlackjackGame();
    expect(loaded?.balance).toBe(state.balance);
    expect(loaded?.phase).toBe(state.phase);
    expect(loaded?.shoeSeed).toBe(state.shoeSeed);
  });

  it('also saves balance to ep:bj:balance', () => {
    const state = createInitialState(DEFAULT_OPTIONS, 750, 1);
    saveBlackjackGame(state);
    expect(loadBlackjackBalance()).toBe(750);
  });

  it('returns null for corrupted JSON', () => {
    mockStorage.getItem.mockReturnValueOnce('{bad json}');
    expect(loadBlackjackGame()).toBeNull();
  });
});

describe('clearBlackjackGame', () => {
  it('removes the game state', () => {
    const state = createInitialState(DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE, 1);
    saveBlackjackGame(state);
    clearBlackjackGame();
    expect(loadBlackjackGame()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

describe('loadBlackjackStats', () => {
  it('returns zero stats when nothing saved', () => {
    const stats = loadBlackjackStats();
    expect(stats.handsPlayed).toBe(0);
    expect(stats.handsWon).toBe(0);
    expect(stats.handsLost).toBe(0);
    expect(stats.handsPush).toBe(0);
    expect(stats.blackjacks).toBe(0);
  });
});

describe('recordBlackjackResult', () => {
  it('increments handsPlayed on every result', () => {
    recordBlackjackResult('win', 25, 525);
    recordBlackjackResult('loss', 25, 475);
    expect(loadBlackjackStats().handsPlayed).toBe(2);
  });

  it('increments handsWon for win', () => {
    recordBlackjackResult('win', 25, 525);
    expect(loadBlackjackStats().handsWon).toBe(1);
  });

  it('increments handsWon for blackjack', () => {
    recordBlackjackResult('blackjack', 25, 537);
    expect(loadBlackjackStats().handsWon).toBe(1);
    expect(loadBlackjackStats().blackjacks).toBe(1);
  });

  it('increments handsLost for loss', () => {
    recordBlackjackResult('loss', 25, 475);
    expect(loadBlackjackStats().handsLost).toBe(1);
  });

  it('increments handsPush for push', () => {
    recordBlackjackResult('push', 25, 500);
    expect(loadBlackjackStats().handsPush).toBe(1);
  });

  it('tracks biggestWin', () => {
    recordBlackjackResult('win', 100, 600);
    recordBlackjackResult('win', 50, 550);
    expect(loadBlackjackStats().biggestWin).toBe(100);
  });

  it('tracks biggestLoss', () => {
    recordBlackjackResult('loss', 100, 400);
    recordBlackjackResult('loss', 50, 450);
    expect(loadBlackjackStats().biggestLoss).toBe(-100);
  });

  it('tracks peakBalance', () => {
    recordBlackjackResult('win', 25, 600);
    recordBlackjackResult('loss', 25, 400);
    expect(loadBlackjackStats().peakBalance).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

describe('loadBlackjackSettings / saveBlackjackSettings', () => {
  it('returns null when nothing saved', () => {
    expect(loadBlackjackSettings()).toBeNull();
  });

  it('round-trips settings', () => {
    saveBlackjackSettings({ defaultBet: 50, options: { deckCount: 6 }, cardSize: 'large' });
    const loaded = loadBlackjackSettings();
    expect(loaded?.defaultBet).toBe(50);
    expect(loaded?.options.deckCount).toBe(6);
    expect(loaded?.cardSize).toBe('large');
  });
});

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

describe('loadBlackjackBalance', () => {
  it('returns null when nothing saved', () => {
    expect(loadBlackjackBalance()).toBeNull();
  });

  it('returns balance after game save', () => {
    const state = createInitialState(DEFAULT_OPTIONS, 999, 1);
    saveBlackjackGame(state);
    expect(loadBlackjackBalance()).toBe(999);
  });
});

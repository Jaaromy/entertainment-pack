import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  loadStats,
  recordResult,
  loadGame,
  saveGame,
  clearGame,
  loadVegasPot,
  saveVegasPot,
  VEGAS_INITIAL_POT,
} from '../storage';
import type { StoredSettings, ModeStats } from '../storage';
import type { GameState } from '../types';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

function makeMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { for (const k of Object.keys(store)) delete store[k]; },
    _store:     store,
  };
}

type MockStorage = ReturnType<typeof makeMockStorage>;
let mock: MockStorage;

beforeEach(() => {
  mock = makeMockStorage();
  vi.stubGlobal('localStorage', mock);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const settings: StoredSettings = { drawMode: 3, scoringMode: 'vegas' };

// Minimal GameState stub — only needs to be serialisable for round-trip tests
const gameStub = { seed: 42, moves: 5, status: 'playing', score: 10 } as unknown as GameState;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

describe('loadSettings', () => {
  it('returns null when key is absent', () => {
    expect(loadSettings()).toBeNull();
  });

  it('returns parsed value when key is present', () => {
    mock.setItem('ep:settings', JSON.stringify(settings));
    expect(loadSettings()).toEqual(settings);
  });
});

describe('saveSettings / loadSettings round-trip', () => {
  it('persists and restores settings', () => {
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });
});

// ---------------------------------------------------------------------------
// Stats – loadStats
// ---------------------------------------------------------------------------

describe('loadStats', () => {
  it('returns empty object when key is absent', () => {
    expect(loadStats()).toEqual({});
  });

  it('returns parsed stats when present', () => {
    const data = { '1-standard': { gamesPlayed: 3, gamesWon: 1, currentStreak: 1, bestStreak: 1, bestScore: 50 } };
    mock.setItem('ep:stats', JSON.stringify(data));
    expect(loadStats()).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// Stats – recordResult
// ---------------------------------------------------------------------------

describe('recordResult – win', () => {
  it('increments gamesPlayed and gamesWon', () => {
    recordResult(1, 'standard', true, 100);
    const stats = loadStats()['1-standard'] as ModeStats;
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
  });

  it('increments currentStreak', () => {
    recordResult(1, 'standard', true, 50);
    recordResult(1, 'standard', true, 60);
    expect(loadStats()['1-standard']!.currentStreak).toBe(2);
  });

  it('updates bestStreak when currentStreak exceeds it', () => {
    recordResult(1, 'standard', true, 50);
    recordResult(1, 'standard', true, 60);
    expect(loadStats()['1-standard']!.bestStreak).toBe(2);
  });

  it('does not lower bestStreak after streak resets', () => {
    recordResult(1, 'standard', true, 50);
    recordResult(1, 'standard', true, 60);
    recordResult(1, 'standard', false, 0);
    const stats = loadStats()['1-standard'] as ModeStats;
    expect(stats.bestStreak).toBe(2);
    expect(stats.currentStreak).toBe(0);
  });

  it('updates bestScore on win', () => {
    recordResult(1, 'standard', true, 200);
    expect(loadStats()['1-standard']!.bestScore).toBe(200);
  });

  it('does not lower bestScore on a worse win', () => {
    recordResult(1, 'standard', true, 200);
    recordResult(1, 'standard', true, 50);
    expect(loadStats()['1-standard']!.bestScore).toBe(200);
  });
});

describe('recordResult – loss', () => {
  it('increments gamesPlayed but not gamesWon', () => {
    recordResult(1, 'standard', false, 0);
    const stats = loadStats()['1-standard'] as ModeStats;
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(0);
  });

  it('resets currentStreak to 0', () => {
    recordResult(1, 'standard', true, 50);
    recordResult(1, 'standard', false, 0);
    expect(loadStats()['1-standard']!.currentStreak).toBe(0);
  });

  it('does not change bestScore', () => {
    recordResult(1, 'standard', true, 200);
    recordResult(1, 'standard', false, 0);
    expect(loadStats()['1-standard']!.bestScore).toBe(200);
  });
});

describe('recordResult – mode isolation', () => {
  it('tracks different draw/scoring combos independently', () => {
    recordResult(1, 'standard', true, 100);
    recordResult(3, 'vegas',    true, 200);
    expect(loadStats()['1-standard']!.gamesWon).toBe(1);
    expect(loadStats()['3-vegas']!.gamesWon).toBe(1);
    expect(loadStats()['3-vegas']!.bestScore).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Game – save / load / clear
// ---------------------------------------------------------------------------

describe('saveGame / loadGame round-trip', () => {
  it('persists and restores game state', () => {
    saveGame(gameStub);
    expect(loadGame()).toEqual(gameStub);
  });
});

describe('loadGame', () => {
  it('returns null when no game is saved', () => {
    expect(loadGame()).toBeNull();
  });
});

describe('clearGame', () => {
  it('returns null after clearing', () => {
    saveGame(gameStub);
    clearGame();
    expect(loadGame()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Vegas pot
// ---------------------------------------------------------------------------

describe('loadVegasPot', () => {
  it('returns VEGAS_INITIAL_POT (0) when key is absent', () => {
    expect(loadVegasPot()).toBe(VEGAS_INITIAL_POT);
    expect(loadVegasPot()).toBe(0);
  });

  it('returns the stored value when present', () => {
    mock.setItem('ep:vegas-pot', JSON.stringify(250));
    expect(loadVegasPot()).toBe(250);
  });
});

describe('saveVegasPot / loadVegasPot round-trip', () => {
  it('persists and restores the pot balance', () => {
    saveVegasPot(500);
    expect(loadVegasPot()).toBe(500);
  });

  it('overwrites previous value', () => {
    saveVegasPot(100);
    saveVegasPot(200);
    expect(loadVegasPot()).toBe(200);
  });

  it('persists negative balance', () => {
    saveVegasPot(-52);
    expect(loadVegasPot()).toBe(-52);
  });
});

// ---------------------------------------------------------------------------
// Corrupted data
// ---------------------------------------------------------------------------

describe('corrupted localStorage data', () => {
  it('loadSettings returns null for invalid JSON', () => {
    mock.setItem('ep:settings', 'not-json{{{');
    expect(loadSettings()).toBeNull();
  });

  it('loadStats returns empty object for invalid JSON', () => {
    mock.setItem('ep:stats', '!!bad');
    expect(loadStats()).toEqual({});
  });

  it('loadGame returns null for invalid JSON', () => {
    mock.setItem('ep:game', '<corrupt>');
    expect(loadGame()).toBeNull();
  });
});

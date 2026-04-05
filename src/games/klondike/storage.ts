import type { DrawMode, ScoringMode, GameState } from './types';

const KEY_SETTINGS  = 'ep:settings';
const KEY_STATS     = 'ep:stats';
const KEY_GAME      = 'ep:game';
const KEY_VEGAS_POT = 'ep:vegas-pot';

export const VEGAS_INITIAL_POT = 0;

export interface StoredSettings {
  drawMode: DrawMode;
  scoringMode: ScoringMode;
  cardSize?: 'normal' | 'large';
}

export interface ModeStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  bestScore: number | null; // null = no wins recorded yet
}

function modeKey(drawMode: DrawMode, scoringMode: ScoringMode): string {
  return `${drawMode}-${scoringMode}`;
}

function emptyModeStats(): ModeStats {
  return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, bestStreak: 0, bestScore: null };
}

function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable or quota exceeded — fail silently
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function loadSettings(): StoredSettings | null {
  return getItem<StoredSettings>(KEY_SETTINGS);
}

export function saveSettings(s: StoredSettings): void {
  setItem(KEY_SETTINGS, s);
}

// ---------------------------------------------------------------------------
// Vegas pot
// ---------------------------------------------------------------------------

export function loadVegasPot(): number {
  return getItem<number>(KEY_VEGAS_POT) ?? VEGAS_INITIAL_POT;
}

export function saveVegasPot(balance: number): void {
  setItem(KEY_VEGAS_POT, balance);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function loadStats(): Record<string, ModeStats> {
  return getItem<Record<string, ModeStats>>(KEY_STATS) ?? {};
}

export function recordResult(
  drawMode: DrawMode,
  scoringMode: ScoringMode,
  won: boolean,
  score: number,
): void {
  const all = loadStats();
  const key = modeKey(drawMode, scoringMode);
  const prev = all[key] ?? emptyModeStats();

  const newStreak = won ? prev.currentStreak + 1 : 0;

  function updatedBestScore(): number | null {
    if (!won) return prev.bestScore;
    if (prev.bestScore === null) return score;
    return Math.max(prev.bestScore, score);
  }

  const next: ModeStats = {
    gamesPlayed: prev.gamesPlayed + 1,
    gamesWon:       won ? prev.gamesWon + 1 : prev.gamesWon,
    currentStreak:  newStreak,
    bestStreak:     Math.max(prev.bestStreak, newStreak),
    bestScore:      updatedBestScore(),
  };

  setItem(KEY_STATS, { ...all, [key]: next });
}

// ---------------------------------------------------------------------------
// In-progress game
// ---------------------------------------------------------------------------

export function loadGame(): GameState | null {
  return getItem<GameState>(KEY_GAME);
}

export function saveGame(state: GameState): void {
  setItem(KEY_GAME, state);
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY_GAME);
  } catch {
    // ignore
  }
}

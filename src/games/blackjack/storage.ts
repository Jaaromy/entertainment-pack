import type { BlackjackState, BlackjackStats, BlackjackStoredSettings, HandResult } from './types';
import { BLACKJACK_INITIAL_BALANCE } from './constants';

const KEY_GAME     = 'ep:bj:game';
const KEY_STATS    = 'ep:bj:stats';
const KEY_SETTINGS = 'ep:bj:settings';
const KEY_BALANCE  = 'ep:bj:balance';

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

function emptyStats(): BlackjackStats {
  return {
    handsPlayed: 0,
    handsWon: 0,
    handsLost: 0,
    handsPush: 0,
    blackjacks: 0,
    biggestWin: 0,
    biggestLoss: 0,
    peakBalance: BLACKJACK_INITIAL_BALANCE,
    initialBalance: BLACKJACK_INITIAL_BALANCE,
  };
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export function loadBlackjackGame(): BlackjackState | null {
  return getItem<BlackjackState>(KEY_GAME);
}

export function saveBlackjackGame(state: BlackjackState): void {
  setItem(KEY_GAME, state);
  setItem(KEY_BALANCE, state.balance);
}

export function clearBlackjackGame(): void {
  try {
    localStorage.removeItem(KEY_GAME);
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function loadBlackjackStats(): BlackjackStats {
  return getItem<BlackjackStats>(KEY_STATS) ?? emptyStats();
}

export function recordBlackjackResult(
  result: HandResult,
  bet: number,
  balance: number,
): void {
  const stats = loadBlackjackStats();

  const won = result === 'win' || result === 'blackjack';
  const lost = result === 'loss';
  const push = result === 'push';

  let biggestWin = stats.biggestWin;
  let biggestLoss = stats.biggestLoss;

  if (won) {
    // Net profit: bet won (approximation — caller passes total bet)
    biggestWin = Math.max(biggestWin, bet);
  }
  if (lost) {
    biggestLoss = Math.min(biggestLoss, -bet);
  }

  const next: BlackjackStats = {
    handsPlayed: stats.handsPlayed + 1,
    handsWon: won ? stats.handsWon + 1 : stats.handsWon,
    handsLost: lost ? stats.handsLost + 1 : stats.handsLost,
    handsPush: push ? stats.handsPush + 1 : stats.handsPush,
    blackjacks: result === 'blackjack' ? stats.blackjacks + 1 : stats.blackjacks,
    biggestWin,
    biggestLoss,
    peakBalance: Math.max(stats.peakBalance, balance),
    initialBalance: stats.initialBalance,
  };

  setItem(KEY_STATS, next);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function loadBlackjackSettings(): BlackjackStoredSettings | null {
  return getItem<BlackjackStoredSettings>(KEY_SETTINGS);
}

export function saveBlackjackSettings(s: BlackjackStoredSettings): void {
  setItem(KEY_SETTINGS, s);
}

// ---------------------------------------------------------------------------
// Balance (quick read for landing page)
// ---------------------------------------------------------------------------

export function loadBlackjackBalance(): number | null {
  return getItem<number>(KEY_BALANCE);
}

import { describe, it, expect } from 'vitest';
import {
  createGame,
  currentState,
  canUndo,
  pushState,
  undo,
  newGame,
} from '../gameReducer';

describe('createGame', () => {
  it('produces a valid initial GameWithHistory', () => {
    const gwh = createGame(42, 1, 'standard');
    expect(gwh.states).toHaveLength(1);
    expect(gwh.index).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    const a = createGame(42, 1, 'standard');
    const b = createGame(42, 1, 'standard');
    expect(currentState(a).stock.map((c) => c.id)).toEqual(
      currentState(b).stock.map((c) => c.id),
    );
  });

  it('respects drawMode and scoringMode', () => {
    const gwh = createGame(1, 3, 'vegas');
    const s = currentState(gwh);
    expect(s.drawMode).toBe(3);
    expect(s.scoringMode).toBe('vegas');
    expect(s.score).toBe(-52); // Vegas initial bet
  });
});

describe('currentState', () => {
  it('returns the state at the current index', () => {
    const gwh = createGame(0, 1, 'standard');
    expect(currentState(gwh)).toBe(gwh.states[0]);
  });
});

describe('canUndo', () => {
  it('canUndo is false on fresh game', () => {
    expect(canUndo(createGame(0, 1, 'standard'))).toBe(false);
  });

  it('canUndo becomes true after pushState', () => {
    const gwh = createGame(0, 1, 'standard');
    const s = currentState(gwh);
    const gwh2 = pushState(gwh, { ...s, moves: 1 });
    expect(canUndo(gwh2)).toBe(true);
  });
});

describe('pushState', () => {
  it('adds a new state and advances index', () => {
    const gwh = createGame(0, 1, 'standard');
    const s = currentState(gwh);
    const gwh2 = pushState(gwh, { ...s, moves: 1 });
    expect(gwh2.states).toHaveLength(2);
    expect(gwh2.index).toBe(1);
    expect(currentState(gwh2).moves).toBe(1);
  });

  it('always keeps only two states (previous + new)', () => {
    const gwh0 = createGame(0, 1, 'standard');
    const s = currentState(gwh0);

    const gwh1 = pushState(gwh0, { ...s, moves: 1 });
    const gwh2 = pushState(gwh1, { ...s, moves: 2 });
    expect(gwh2.states).toHaveLength(2);
    expect(currentState(gwh2).moves).toBe(2);
    expect(gwh2.states[0]!.moves).toBe(1);
  });

  it('pushing after undo uses the undone state as previous', () => {
    const gwh0 = createGame(0, 1, 'standard');
    const s = currentState(gwh0);
    const gwh1 = pushState(gwh0, { ...s, moves: 1 });
    const gwh2 = undo(gwh1);
    const gwh3 = pushState(gwh2, { ...s, moves: 99 });

    expect(gwh3.states).toHaveLength(2);
    expect(gwh3.index).toBe(1);
    expect(currentState(gwh3).moves).toBe(99);
    expect(gwh3.states[0]!.moves).toBe(0);
  });

  it('does not mutate the original GameWithHistory', () => {
    const gwh = createGame(0, 1, 'standard');
    const s = currentState(gwh);
    pushState(gwh, { ...s, moves: 1 });
    expect(gwh.states).toHaveLength(1);
    expect(gwh.index).toBe(0);
  });
});

describe('undo', () => {
  it('decrements index', () => {
    const gwh = createGame(0, 1, 'standard');
    const s = currentState(gwh);
    const gwh2 = pushState(gwh, { ...s, moves: 1 });
    const gwh3 = undo(gwh2);
    expect(gwh3.index).toBe(0);
    expect(currentState(gwh3).moves).toBe(0);
  });

  it('is a no-op when already at the start', () => {
    const gwh = createGame(0, 1, 'standard');
    const result = undo(gwh);
    expect(result.index).toBe(0);
  });

  it('second undo is a no-op (only one level supported)', () => {
    let gwh = createGame(0, 1, 'standard');
    const s = currentState(gwh);
    gwh = pushState(gwh, { ...s, moves: 1 });
    gwh = pushState(gwh, { ...s, moves: 2 });

    const afterOneUndo = undo(gwh);
    expect(currentState(afterOneUndo).moves).toBe(1);

    const afterTwoUndos = undo(afterOneUndo);
    expect(afterTwoUndos.index).toBe(0);
    expect(currentState(afterTwoUndos).moves).toBe(1);
  });
});


describe('newGame', () => {
  it('resets history with fresh state', () => {
    let gwh = createGame(0, 1, 'standard');
    const s = currentState(gwh);
    gwh = pushState(gwh, { ...s, moves: 5 });
    gwh = pushState(gwh, { ...s, moves: 10 });

    const fresh = newGame(gwh, 999);
    expect(fresh.states).toHaveLength(1);
    expect(fresh.index).toBe(0);
    expect(currentState(fresh).moves).toBe(0);
  });

  it('preserves drawMode and scoringMode from previous game', () => {
    const gwh = createGame(1, 3, 'vegas');
    const fresh = newGame(gwh, 999);
    const s = currentState(fresh);
    expect(s.drawMode).toBe(3);
    expect(s.scoringMode).toBe('vegas');
  });

  it('uses the new seed', () => {
    const gwh = createGame(1, 1, 'standard');
    const fresh = newGame(gwh, 999);
    const s = currentState(fresh);
    expect(s.seed).toBe(999);
  });
});

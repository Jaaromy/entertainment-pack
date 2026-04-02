import { useState, useCallback } from 'react';
import type { BlackjackState, BlackjackWithHistory, BlackjackOptions } from '../types';
import {
  placeBet,
  deal,
  hit,
  stand,
  doubleDown,
  split,
  nextRound,
  canSplit,
  canDoubleDown,
  isPlayerTurn,
} from '../blackjackLogic';
import {
  createGame,
  currentState,
  canUndo,
  pushState,
  undo,
  newGame,
} from '../blackjackReducer';
import {
  loadBlackjackGame,
  saveBlackjackGame,
  loadBlackjackSettings,
  saveBlackjackSettings,
  loadBlackjackStats,
  recordBlackjackResult,
} from '../storage';
import { DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE, CHIP_VALUES } from '../constants';

export interface UseBlackjackReturn {
  state: BlackjackState;
  canUndoAction: boolean;
  chipValues: readonly number[];
  canSplitHand: boolean;
  canDoubleDownHand: boolean;
  isPlayerActive: boolean;
  cardSize: 'normal' | 'large';
  onPlaceBet: (amount: number) => void;
  onClearBet: () => void;
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDoubleDown: () => void;
  onSplit: () => void;
  onNextRound: () => void;
  onUndo: () => void;
  onNewGame: () => void;
  onSaveOptions: (options: Partial<BlackjackOptions>, size: 'normal' | 'large') => void;
}

export function useBlackjack(): UseBlackjackReturn {
  const [gwh, setGwh] = useState<BlackjackWithHistory>(() => {
    const saved = loadBlackjackGame();
    const settings = loadBlackjackSettings();
    const options: BlackjackOptions = { ...DEFAULT_OPTIONS, ...settings?.options };
    if (saved) {
      return { states: [saved], index: 0 };
    }
    return createGame(options, BLACKJACK_INITIAL_BALANCE, Date.now());
  });

  const [cardSize, setCardSize] = useState<'normal' | 'large'>(
    () => loadBlackjackSettings()?.cardSize ?? 'large'
  );

  const state = currentState(gwh);

  const commit = useCallback((newState: BlackjackState) => {
    setGwh(prev => pushState(prev, newState));
    saveBlackjackGame(newState);

    // Record stats when a round settles
    if (newState.phase === 'settlement') {
      for (const hand of newState.playerHands) {
        if (hand.result !== null) {
          recordBlackjackResult(hand.result, hand.bet + hand.doubleDownBet, newState.balance);
        }
      }
    }
  }, []);

  const onPlaceBet = useCallback((amount: number) => {
    const next = placeBet(state, amount);
    if (next) commit(next);
  }, [state, commit]);

  const onClearBet = useCallback(() => {
    if (state.phase !== 'betting') return;
    commit({ ...state, currentBet: 0 });
  }, [state, commit]);

  const onDeal = useCallback(() => {
    const next = deal(state);
    if (next) commit(next);
  }, [state, commit]);

  const onHit = useCallback(() => {
    const next = hit(state);
    if (next) commit(next);
  }, [state, commit]);

  const onStand = useCallback(() => {
    const next = stand(state);
    if (next) commit(next);
  }, [state, commit]);

  const onDoubleDown = useCallback(() => {
    const next = doubleDown(state);
    if (next) commit(next);
  }, [state, commit]);

  const onSplit = useCallback(() => {
    const next = split(state);
    if (next) commit(next);
  }, [state, commit]);

  const onNextRound = useCallback(() => {
    const next = nextRound(state);
    if (next) commit(next);
  }, [state, commit]);

  const onUndo = useCallback(() => {
    if (!canUndo(gwh)) return;
    const prev = undo(gwh);
    setGwh(prev);
    saveBlackjackGame(currentState(prev));
  }, [gwh]);

  const onNewGame = useCallback(() => {
    const ng = newGame(gwh, Date.now());
    setGwh(ng);
    saveBlackjackGame(currentState(ng));
  }, [gwh]);

  const onSaveOptions = useCallback((options: Partial<BlackjackOptions>, size: 'normal' | 'large') => {
    setCardSize(size);
    saveBlackjackSettings({
      defaultBet: state.currentBet || 25,
      options,
      cardSize: size,
    });
    // Apply options to current game state (takes effect next round)
    const next: BlackjackState = {
      ...state,
      options: { ...state.options, ...options },
    };
    commit(next);
  }, [state, commit]);

  return {
    state,
    canUndoAction: canUndo(gwh),
    chipValues: CHIP_VALUES,
    canSplitHand: canSplit(state),
    canDoubleDownHand: canDoubleDown(state),
    isPlayerActive: isPlayerTurn(state),
    cardSize,
    onPlaceBet,
    onClearBet,
    onDeal,
    onHit,
    onStand,
    onDoubleDown,
    onSplit,
    onNextRound,
    onUndo,
    onNewGame,
    onSaveOptions,
  };
}

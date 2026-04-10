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
  recordBlackjackResult,
} from '../storage';
import { DEFAULT_OPTIONS, BLACKJACK_INITIAL_BALANCE, CHIP_VALUES } from '../constants';
import { getBasicStrategyAction, type StrategyAction } from '../basicStrategy';

export interface StrategyFeedback {
  playerAction: StrategyAction;
  optimalAction: StrategyAction;
  correct: boolean;
}

export interface UseBlackjackReturn {
  state: BlackjackState;
  canUndoAction: boolean;
  chipValues: readonly number[];
  canSplitHand: boolean;
  canDoubleDownHand: boolean;
  isPlayerActive: boolean;
  cardSize: 'normal' | 'large';
  learningMode: boolean;
  strategyFeedback: StrategyFeedback | null;
  sessionStats: { correct: number; incorrect: number };
  countInfo: { runningCount: number; trueCount: number; decksRemaining: number };
  onPlaceBet: (amount: number) => void;
  onClearBet: () => void;
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDoubleDown: () => void;
  onSplit: () => void;
  onUndo: () => void;
  onNewGame: () => void;
  onSaveOptions: (options: Partial<BlackjackOptions>, size: 'normal' | 'large', lm: boolean) => void;
}

export function useBlackjack(): UseBlackjackReturn {
  const [gwh, setGwh] = useState<BlackjackWithHistory>(() => {
    const saved = loadBlackjackGame();
    const settings = loadBlackjackSettings();
    const options: BlackjackOptions = { ...DEFAULT_OPTIONS, ...settings?.options };
    if (saved) {
      // Backward compat: old saves may lack runningCount; default to 0
      const safeState: BlackjackState = {
        ...saved,
        runningCount: (saved.runningCount as number | undefined) ?? 0,
      };
      return { states: [safeState], index: 0 };
    }
    return createGame(options, BLACKJACK_INITIAL_BALANCE, Date.now());
  });

  const [cardSize, setCardSize] = useState<'normal' | 'large'>(
    () => loadBlackjackSettings()?.cardSize ?? 'large'
  );

  const [learningMode, setLearningMode] = useState<boolean>(
    () => loadBlackjackSettings()?.learningMode ?? false
  );

  const [strategyFeedback, setStrategyFeedback] = useState<StrategyFeedback | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });

  const state = currentState(gwh);

  // Compute count display values from game state
  const decksRemaining = Math.max(0.5, (state.shoeSize - state.dealtCount) / 52);
  const trueCount = Math.trunc(state.runningCount / decksRemaining);
  const countInfo = { runningCount: state.runningCount, trueCount, decksRemaining };

  const recordFeedback = useCallback((playerAction: StrategyAction, optimalAction: StrategyAction) => {
    const correct = playerAction === optimalAction;
    setStrategyFeedback({ playerAction, optimalAction, correct });
    setSessionStats(prev => correct
      ? { ...prev, correct: prev.correct + 1 }
      : { ...prev, incorrect: prev.incorrect + 1 }
    );
  }, []);

  // Compute optimal basic strategy action for the active hand
  function computeOptimal(s: BlackjackState): StrategyAction | null {
    const hand = s.playerHands[s.activeHandIndex];
    const dealerUp = s.dealerHand.cards[0];
    if (!hand || hand.status !== 'active' || !dealerUp) return null;
    return getBasicStrategyAction(hand.cards, dealerUp, canDoubleDown(s), canSplit(s));
  }

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
    if (state.phase === 'settlement') {
      if (amount <= 0 || amount > state.balance) return;
      commit({ ...state, currentBet: amount });
      return;
    }
    const next = placeBet(state, amount);
    if (next) commit(next);
  }, [state, commit]);

  const onClearBet = useCallback(() => {
    if (state.phase === 'settlement' || state.phase === 'betting') {
      commit({ ...state, currentBet: 0 });
    }
  }, [state, commit]);

  const onDeal = useCallback(() => {
    setStrategyFeedback(null);
    const base = state.phase === 'settlement' ? nextRound(state) : state;
    if (!base) return;
    const next = deal(base);
    if (next) commit(next);
  }, [state, commit]);

  const onHit = useCallback(() => {
    const optimal = learningMode ? computeOptimal(state) : null;
    const next = hit(state);
    if (next) {
      commit(next);
      if (optimal) recordFeedback('hit', optimal);
    }
  }, [state, commit, learningMode]);

  const onStand = useCallback(() => {
    const optimal = learningMode ? computeOptimal(state) : null;
    const next = stand(state);
    if (next) {
      commit(next);
      if (optimal) recordFeedback('stand', optimal);
    }
  }, [state, commit, learningMode]);

  const onDoubleDown = useCallback(() => {
    const optimal = learningMode ? computeOptimal(state) : null;
    const next = doubleDown(state);
    if (next) {
      commit(next);
      if (optimal) recordFeedback('double', optimal);
    }
  }, [state, commit, learningMode]);

  const onSplit = useCallback(() => {
    const optimal = learningMode ? computeOptimal(state) : null;
    const next = split(state);
    if (next) {
      commit(next);
      if (optimal) recordFeedback('split', optimal);
    }
  }, [state, commit, learningMode]);

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

  const onSaveOptions = useCallback((options: Partial<BlackjackOptions>, size: 'normal' | 'large', lm: boolean) => {
    setCardSize(size);
    setLearningMode(lm);
    const mergedOptions = { ...state.options, ...options };
    saveBlackjackSettings({
      defaultBet: state.currentBet || 25,
      options: mergedOptions,
      cardSize: size,
      learningMode: lm,
    });
    if (options.deckCount !== undefined && options.deckCount !== state.options.deckCount) {
      // Shoe size changed — start fresh with current balance
      const ng = createGame(mergedOptions, state.balance > 0 ? state.balance : BLACKJACK_INITIAL_BALANCE, Date.now());
      setGwh(ng);
      saveBlackjackGame(currentState(ng));
    } else {
      const next: BlackjackState = { ...state, options: mergedOptions };
      commit(next);
    }
  }, [state, commit]);

  return {
    state,
    canUndoAction: canUndo(gwh),
    chipValues: CHIP_VALUES,
    canSplitHand: canSplit(state),
    canDoubleDownHand: canDoubleDown(state),
    isPlayerActive: isPlayerTurn(state),
    cardSize,
    learningMode,
    strategyFeedback,
    sessionStats,
    countInfo,
    onPlaceBet,
    onClearBet,
    onDeal,
    onHit,
    onStand,
    onDoubleDown,
    onSplit,
    onUndo,
    onNewGame,
    onSaveOptions,
  };
}

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Card, CardLocation, DrawMode, GameState, ScoringMode, Selection } from '../types';
import {
  drawFromStock,
  recycleWaste,
  moveWasteToFoundation,
  moveWasteToTableau,
  moveTableauToFoundation,
  moveTableauToTableau,
  moveFoundationToTableau,
  flipTableauCard,
  findFoundationTarget,
  autoMoveToFoundation,
} from '../gameLogic';
import {
  createGame,
  currentState,
  canUndo as gwCanUndo,
  pushState,
  undo as gwUndo,
} from '../gameReducer';
import { VEGAS_MAX_RECYCLES_DRAW1, VEGAS_MAX_RECYCLES_DRAW3, VEGAS_INITIAL_BET } from '../constants';
import { loadSettings, saveSettings, loadGame, saveGame, clearGame, recordResult, loadVegasPot, saveVegasPot } from '../storage';
import type { GameWithHistory } from '../gameReducer';

interface DragSource {
  loc: CardLocation;
  cards: Card[];
  offsetX: number;
  offsetY: number;
}

interface UseKlondikeReturn {
  state: GameState;
  canUndo: boolean;
  canRecycleStock: boolean;
  forceWin: (() => void) | null;
  selection: Selection | null;
  dragSource: DragSource | null;
  dragOverTarget: { area: string; pile: number } | null;
  onStockClick: () => void;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onEmptyPileClick: (area: 'foundation' | 'tableau', pile: number) => void;
  onDragStart: (loc: CardLocation, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (area: string, pile: number) => void;
  onDrop: (area: 'foundation' | 'tableau', pile: number) => void;
  doUndo: () => void;
  startNewGame: (seed: number, drawMode: DrawMode, scoringMode: ScoringMode, overridePot?: number) => void;
  canAutoComplete: boolean;
  doAutoComplete: () => void;
}

function getCardsAtLocation(state: GameState, loc: CardLocation): Card[] {
  if (loc.area === 'waste') {
    const top = state.waste[state.waste.length - 1];
    return top ? [top] : [];
  }
  if (loc.area === 'foundation') {
    const top = state.foundations[loc.pile]?.[state.foundations[loc.pile]!.length - 1];
    return top ? [top] : [];
  }
  if (loc.area === 'tableau') {
    return state.tableau[loc.pile]?.slice(loc.cardIndex) ?? [];
  }
  return [];
}

function locationsEqual(a: CardLocation, b: CardLocation): boolean {
  if (a.area !== b.area) return false;
  if (a.area === 'stock' || a.area === 'waste') return true;
  if (a.area === 'foundation' && b.area === 'foundation') return a.pile === b.pile;
  if (a.area === 'tableau' && b.area === 'tableau') {
    return a.pile === b.pile && a.cardIndex === b.cardIndex;
  }
  return false;
}

function checkCanRecycleStock(state: GameState): boolean {
  if (state.stock.length > 0) return false;
  if (state.waste.length === 0) return false;
  if (state.scoringMode === 'vegas') {
    const max = state.drawMode === 1 ? VEGAS_MAX_RECYCLES_DRAW1 : VEGAS_MAX_RECYCLES_DRAW3;
    if (state.stockRecycles >= max) return false;
  }
  return true;
}

function checkCanAutoComplete(state: GameState): boolean {
  if (state.status !== 'playing') return false;
  if (state.stock.length > 0) return false;
  if (state.waste.length > 0) return false;
  for (const pile of state.tableau) {
    for (const card of pile) {
      if (!card.faceUp) return false;
    }
  }
  return true;
}

export function useKlondike(): UseKlondikeReturn {
  const [gwh, setGwh] = useState<GameWithHistory>(() => {
    const saved = loadGame();
    if (saved?.status === 'playing') {
      const state = { ...saved, wasteBatchSize: saved.wasteBatchSize ?? 0 };
      return { states: [state], index: 0 };
    }
    const settings = loadSettings();
    const drawMode = settings?.drawMode ?? 3;
    const scoringMode = settings?.scoringMode ?? 'vegas';
    const initialScore = scoringMode === 'vegas'
      ? loadVegasPot() + VEGAS_INITIAL_BET
      : undefined;
    return createGame(Date.now(), drawMode, scoringMode, initialScore);
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ area: string; pile: number } | null>(null);

  const state = currentState(gwh);
  // Always-current ref so callbacks without state in deps can read latest state
  const stateRef = useRef(state);
  stateRef.current = state;
  // Guard against recording the same win twice (React StrictMode double-invoke)
  const winRecordedRef = useRef(false);

  const commit = useCallback((newState: GameState | null) => {
    if (!newState) return false;
    setGwh(prev => pushState(prev, newState));
    saveGame(newState);
    if (newState.scoringMode === 'vegas') saveVegasPot(newState.score);
    setSelection(null);
    return true;
  }, []);

  const onStockClick = useCallback(() => {
    setSelection(null);
    const drawn = drawFromStock(state);
    if (drawn) {
      commit(drawn);
    } else {
      commit(recycleWaste(state));
    }
  }, [state, commit]);

  const tryMoveSelectionTo = useCallback((
    sel: Selection,
    area: 'foundation' | 'tableau',
    pile: number
  ): boolean => {
    const src = sel.location;

    if (area === 'foundation') {
      // Move to foundation
      if (src.area === 'waste') {
        return commit(moveWasteToFoundation(state, pile));
      }
      if (src.area === 'tableau') {
        return commit(moveTableauToFoundation(state, src.pile, pile));
      }
      if (src.area === 'foundation') {
        return false;
      }
    }

    if (area === 'tableau') {
      if (src.area === 'waste') {
        return commit(moveWasteToTableau(state, pile));
      }
      if (src.area === 'tableau') {
        return commit(moveTableauToTableau(state, src.pile, src.cardIndex, pile));
      }
      if (src.area === 'foundation') {
        return commit(moveFoundationToTableau(state, src.pile, pile));
      }
    }

    return false;
  }, [state, commit]);

  const onCardClick = useCallback((loc: CardLocation) => {
    // Face-down tableau card: only the top card can be flipped by clicking
    if (loc.area === 'tableau') {
      const pile = state.tableau[loc.pile];
      const card = pile?.[loc.cardIndex];
      if (!card?.faceUp) {
        if (loc.cardIndex === (pile?.length ?? 0) - 1) {
          commit(flipTableauCard(state, loc.pile));
        }
        return;
      }
    }

    if (!selection) {
      // Start a selection
      const cards = getCardsAtLocation(state, loc);
      if (cards.length > 0) {
        setSelection({ location: loc, cards });
      }
      return;
    }

    // Deselect if same card clicked
    if (locationsEqual(selection.location, loc)) {
      setSelection(null);
      return;
    }

    // Try to move selection to clicked destination
    const destArea = loc.area;
    if (destArea === 'foundation' || destArea === 'tableau') {
      // Clicking a card in a pile — treat the pile as the destination
      let destPile = 0;
      if (destArea === 'foundation' && loc.area === 'foundation') {
        destPile = loc.pile;
      } else if (destArea === 'tableau' && loc.area === 'tableau') {
        destPile = loc.pile;
      }

      const moved = tryMoveSelectionTo(selection, destArea as 'foundation' | 'tableau', destPile);
      if (!moved) {
        // Re-select the clicked card
        const cards = getCardsAtLocation(state, loc);
        if (cards.length > 0) {
          setSelection({ location: loc, cards });
        } else {
          setSelection(null);
        }
      }
    } else if (destArea === 'waste') {
      // Clicking waste while something selected — re-select waste top
      const cards = getCardsAtLocation(state, loc);
      if (cards.length > 0) {
        setSelection({ location: loc, cards });
      } else {
        setSelection(null);
      }
    } else {
      setSelection(null);
    }
  }, [selection, state, tryMoveSelectionTo]);

  const onCardDoubleClick = useCallback((loc: CardLocation) => {
    setSelection(null);
    let card: Card | undefined;
    if (loc.area === 'waste') {
      card = state.waste[state.waste.length - 1];
    } else if (loc.area === 'tableau') {
      const pile = state.tableau[loc.pile];
      card = pile?.[loc.cardIndex];
      // Only auto-move the top card of the pile
      if (loc.cardIndex !== (pile?.length ?? 0) - 1) return;
    } else if (loc.area === 'foundation') {
      return; // already on foundation
    }

    if (!card?.faceUp) return;

    const fi = findFoundationTarget(state, card);
    if (fi < 0) return;

    if (loc.area === 'waste') {
      commit(moveWasteToFoundation(state, fi));
    } else if (loc.area === 'tableau') {
      commit(moveTableauToFoundation(state, loc.pile, fi));
    }
  }, [state, commit]);

  const onEmptyPileClick = useCallback((area: 'foundation' | 'tableau', pile: number) => {
    if (!selection) return;
    tryMoveSelectionTo(selection, area, pile);
  }, [selection, tryMoveSelectionTo]);

  const onDragStart = useCallback((loc: CardLocation, e: React.DragEvent) => {
    const cards = getCardsAtLocation(state, loc);
    if (cards.length === 0) return;

    // Don't allow dragging face-down cards
    if (loc.area === 'tableau') {
      const card = state.tableau[loc.pile]?.[loc.cardIndex];
      if (!card?.faceUp) return;
    }

    setDragSource({ loc, cards, offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY });
    e.dataTransfer.effectAllowed = 'move';
    // Set some drag data so the drag works
    e.dataTransfer.setData('text/plain', loc.area);
  }, [state]);

  const onDragEnd = useCallback(() => {
    setDragSource(null);
    setDragOverTarget(null);
  }, []);

  const onDragOver = useCallback((area: string, pile: number) => {
    setDragOverTarget({ area, pile });
  }, []);

  const onDrop = useCallback((area: 'foundation' | 'tableau', pile: number) => {
    setDragOverTarget(null);
    if (!dragSource) return;

    const src = dragSource.loc;

    if (area === 'foundation') {
      if (src.area === 'waste') {
        commit(moveWasteToFoundation(state, pile));
      } else if (src.area === 'tableau') {
        commit(moveTableauToFoundation(state, src.pile, pile));
      } else if (src.area === 'foundation') {
        // no-op
      }
    } else if (area === 'tableau') {
      if (src.area === 'waste') {
        commit(moveWasteToTableau(state, pile));
      } else if (src.area === 'tableau') {
        commit(moveTableauToTableau(state, src.pile, src.cardIndex, pile));
      } else if (src.area === 'foundation') {
        commit(moveFoundationToTableau(state, src.pile, pile));
      }
    }

    setDragSource(null);
  }, [dragSource, state, commit]);

  const doUndo = useCallback(() => {
    setSelection(null);
    setGwh(prev => {
      const next = gwUndo(prev);
      saveGame(currentState(next));
      return next;
    });
  }, []);

  // Record win and clear persisted game when the game is completed
  useEffect(() => {
    if (state.status === 'won' && !winRecordedRef.current) {
      winRecordedRef.current = true;
      recordResult(state.drawMode, state.scoringMode, true, state.score);
      clearGame();
    }
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewGame = useCallback((seed: number, drawMode: DrawMode, scoringMode: ScoringMode, overridePot?: number) => {
    const prev = stateRef.current;
    if (prev.status === 'playing' && prev.moves > 0) {
      recordResult(prev.drawMode, prev.scoringMode, false, prev.score);
    }
    let initialScore: number | undefined;
    if (scoringMode === 'vegas') {
      // Use overridePot if provided (e.g. Reset Winnings), otherwise carry
      // prev.score forward if already in Vegas (always current, even with no
      // moves), or fall back to storage when switching from Standard.
      const pot = overridePot ?? (prev.scoringMode === 'vegas' ? prev.score : loadVegasPot());
      saveVegasPot(pot);
      initialScore = pot + VEGAS_INITIAL_BET;
    }
    saveSettings({ drawMode, scoringMode });
    clearGame();
    winRecordedRef.current = false;
    setSelection(null);
    setDragSource(null);
    setDragOverTarget(null);
    setGwh(createGame(seed, drawMode, scoringMode, initialScore));
  }, []);

  const forceWin = import.meta.env.DEV
    ? () => commit({ ...stateRef.current, status: 'won' })
    : null;

  const doAutoComplete = useCallback(() => {
    setSelection(null);
    const newState = autoMoveToFoundation(state);
    if (newState !== state) {
      commit(newState);
    }
  }, [state, commit]);

  return {
    state,
    canUndo: gwCanUndo(gwh),
    canRecycleStock: checkCanRecycleStock(state),
    selection,
    dragSource,
    dragOverTarget,
    onStockClick,
    onCardClick,
    onCardDoubleClick,
    onEmptyPileClick,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    forceWin,
    doUndo,
    startNewGame,
    canAutoComplete: checkCanAutoComplete(state),
    doAutoComplete,
  };
}

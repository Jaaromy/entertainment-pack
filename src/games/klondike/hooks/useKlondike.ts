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
}

interface UseKlondikeReturn {
  state: GameState;
  canUndo: boolean;
  canRecycleStock: boolean;
  selection: Selection | null;
  dragSource: DragSource | null;
  ghostPos: { x: number; y: number } | null;
  ghostCards: Card[] | null;
  onStockClick: () => void;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onEmptyPileClick: (area: 'foundation' | 'tableau', pile: number) => void;
  onPointerDown: (loc: CardLocation, e: React.PointerEvent<HTMLDivElement>) => void;
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

/**
 * Dispatch a card move from `src` to (`destArea`, `destPile`).
 * Returns the new GameState, or null if the move is illegal.
 */
function attemptMove(
  state: GameState,
  src: CardLocation,
  destArea: 'foundation' | 'tableau',
  destPile: number,
): GameState | null {
  if (destArea === 'foundation') {
    if (src.area === 'waste')   return moveWasteToFoundation(state, destPile);
    if (src.area === 'tableau') return moveTableauToFoundation(state, src.pile, destPile);
    return null; // foundation → foundation: no-op
  }
  // destArea === 'tableau'
  if (src.area === 'waste')      return moveWasteToTableau(state, destPile);
  if (src.area === 'tableau')    return moveTableauToTableau(state, src.pile, src.cardIndex, destPile);
  if (src.area === 'foundation') return moveFoundationToTableau(state, src.pile, destPile);
  return null;
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
    const newGwh = createGame(Date.now(), drawMode, scoringMode, initialScore);
    saveGame(currentState(newGwh));
    return newGwh;
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [ghostCards, setGhostCards] = useState<Card[] | null>(null);

  const state = currentState(gwh);
  // Always-current refs so callbacks without these in deps can read latest values
  const stateRef = useRef(state);
  stateRef.current = state;
  // Guard against recording the same win twice (React StrictMode double-invoke)
  const winRecordedRef = useRef(false);

  // Ref so the global pointer handlers can call commit without stale closure
  const commitFnRef = useRef<(s: GameState | null) => boolean>(() => false);

  // Pointer drag tracking (mutable, not React state — avoids re-render overhead)
  const pointerDragRef = useRef<{
    loc: CardLocation;
    cards: Card[];
    startX: number;
    startY: number;
    isDragging: boolean;
    dragOver: { area: string; pile: number } | null;
  } | null>(null);

  // Suppresses the click event that fires after a completed pointer drag
  const suppressNextClickRef = useRef(false);

  const commit = useCallback((newState: GameState | null) => {
    if (!newState) return false;
    setGwh(prev => pushState(prev, newState));
    saveGame(newState);
    if (newState.scoringMode === 'vegas') saveVegasPot(newState.score);
    setSelection(null);
    return true;
  }, []);

  // Keep commitFnRef in sync so the useEffect handlers always call the latest version
  commitFnRef.current = commit;

  // ── Global pointer-event handlers (registered once on mount) ──────────────
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (!drag.isDragging && Math.hypot(dx, dy) > 6) {
        drag.isDragging = true;
        setDragSource({ loc: drag.loc, cards: drag.cards });
        setGhostCards(drag.cards);
      }

      if (drag.isDragging) {
        setGhostPos({ x: e.clientX, y: e.clientY });

        // Ghost has pointer-events:none so elementFromPoint sees through it
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const dropEl = (el as HTMLElement | null)?.closest('[data-drop-area]') as HTMLElement | null;
        if (dropEl) {
          const area = dropEl.dataset.dropArea!;
          const pile = parseInt(dropEl.dataset.dropPile ?? '0', 10);
          drag.dragOver = { area, pile };
        } else {
          drag.dragOver = null;
        }
      }
    };

    const handleUp = () => {
      const drag = pointerDragRef.current;
      if (!drag) return;

      if (drag.isDragging) {
        suppressNextClickRef.current = true;

        if (drag.dragOver) {
          const { area, pile } = drag.dragOver;
          const st = stateRef.current;
          const src = drag.loc;

          if (area === 'foundation') {
            if (src.area === 'waste') commitFnRef.current(moveWasteToFoundation(st, pile));
            else if (src.area === 'tableau') commitFnRef.current(moveTableauToFoundation(st, src.pile, pile));
          } else if (area === 'tableau') {
            if (src.area === 'waste') commitFnRef.current(moveWasteToTableau(st, pile));
            else if (src.area === 'tableau') commitFnRef.current(moveTableauToTableau(st, src.pile, src.cardIndex, pile));
            else if (src.area === 'foundation') commitFnRef.current(moveFoundationToTableau(st, src.pile, pile));
          }
        }
      }

      pointerDragRef.current = null;
      setDragSource(null);
      setGhostPos(null);
      setGhostCards(null);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onStockClick = useCallback(() => {
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
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
    pile: number,
  ): boolean => {
    return commit(attemptMove(state, sel.location, area, pile));
  }, [state, commit]);

  const onCardClick = useCallback((loc: CardLocation) => {
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
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
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
    if (!selection) return;
    tryMoveSelectionTo(selection, area, pile);
  }, [selection, tryMoveSelectionTo]);

  const onPointerDown = useCallback((loc: CardLocation, e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button; ignore right-click on desktop
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const st = stateRef.current;
    const cards = getCardsAtLocation(st, loc);
    if (cards.length === 0) return;
    if (loc.area === 'tableau') {
      const card = st.tableau[loc.pile]?.[loc.cardIndex];
      if (!card?.faceUp) return;
    }

    pointerDragRef.current = {
      loc, cards,
      startX: e.clientX, startY: e.clientY,
      isDragging: false,
      dragOver: null,
    };
  }, []);

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
    winRecordedRef.current = false;
    setSelection(null);
    setDragSource(null);
    setGhostPos(null);
    setGhostCards(null);
    const newGwh = createGame(seed, drawMode, scoringMode, initialScore);
    saveGame(currentState(newGwh));
    setGwh(newGwh);
  }, []);

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
    ghostPos,
    ghostCards,
    onStockClick,
    onCardClick,
    onCardDoubleClick,
    onEmptyPileClick,
    onPointerDown,
    doUndo,
    startNewGame,
    canAutoComplete: checkCanAutoComplete(state),
    doAutoComplete,
  };
}

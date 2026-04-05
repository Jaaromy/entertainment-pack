import { useState, useRef, useCallback } from 'react';
import type { DrawMode, ScoringMode, CardLocation } from '../types';
import { useKlondike } from '../hooks/useKlondike';
import { loadSettings, saveSettings } from '../storage';
import {
  DRAG_START_THRESHOLD_SQ,
  DRAG_CLICK_SUPPRESS_RADIUS_SQ,
  DRAG_CLICK_SUPPRESS_TIMEOUT_MS,
} from '../constants';
import StockPile from './StockPile';
import WastePile from './WastePile';
import FoundationPile from './FoundationPile';
import TableauPile from './TableauPile';
import OptionsDialog from './OptionsDialog';
import MenuBar from './MenuBar';
import CardView from './CardView';
import '../klondike.css';

interface KlondikeGameProps {
  onNavigate: (view: 'stats' | 'gallery') => void;
  onHome?: () => void;
}

// Set or clear inline opacity on drag source cards before/after React re-renders.
// For tableau: hiding applies only from the grabbed card onward; restoring clears all
// cards in the pile (safe, since only the dragged subset was set).
function setDragSourceOpacity(
  sourceEl: HTMLElement,
  loc: CardLocation,
  opacity: '' | '0',
): void {
  if (loc.area === 'tableau') {
    const pileEl = sourceEl.closest('.tableau-pile');
    if (pileEl) {
      if (opacity === '0') {
        const cardEls = Array.from(pileEl.querySelectorAll<HTMLElement>('.card'));
        const idx = cardEls.indexOf(sourceEl);
        if (idx >= 0) cardEls.slice(idx).forEach(el => { el.style.opacity = opacity; });
      } else {
        pileEl.querySelectorAll<HTMLElement>('.card').forEach(el => { el.style.opacity = opacity; });
      }
    }
  } else {
    sourceEl.style.opacity = opacity;
  }
}

export default function KlondikeGame({ onNavigate, onHome }: KlondikeGameProps) {
  const {
    state,
    canUndo,
    canRecycleStock,
    dragSource,
    onStockClick,
    onCardClick,
    onCardDoubleClick,
    onEmptyPileClick,
    onPointerDragStart,
    onDragEnd,
    onDrop,
    doUndo,
    startNewGame,
    canAutoComplete,
    doAutoComplete,
  } = useKlondike();

  const [showOptions, setShowOptions] = useState(false);
  const [cardSize, setCardSize] = useState<'normal' | 'large'>(
    () => loadSettings()?.cardSize ?? 'large'
  );

  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const handleCardPointerDown = useCallback((
    loc: CardLocation,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const sourceEl = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = e.nativeEvent.offsetX;
    const offsetY = e.nativeEvent.offsetY;
    const { width: CARD_W, height: CARD_H } = sourceEl.getBoundingClientRect();
    let dragging = false;

    const handleMove = (me: PointerEvent) => {
      if (!dragging) {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        if (dx * dx + dy * dy < DRAG_START_THRESHOLD_SQ) return;
        dragging = true;
        setDragSourceOpacity(sourceEl, loc, '0');
        onPointerDragStart(loc);
      }
      const el = dragPreviewRef.current;
      if (el) {
        el.style.transform = `translate(${me.clientX - offsetX}px, ${me.clientY - offsetY}px)`;
        el.style.display = 'block';
      }
    };

    const handleUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);

      if (!dragging) return;

      const releaseX = ue.clientX;
      const releaseY = ue.clientY;
      const suppressDragClick = (ce: MouseEvent) => {
        document.removeEventListener('click', suppressDragClick, { capture: true });
        const dx = ce.clientX - releaseX;
        const dy = ce.clientY - releaseY;
        if (dx * dx + dy * dy < DRAG_CLICK_SUPPRESS_RADIUS_SQ) ce.stopImmediatePropagation();
      };
      document.addEventListener('click', suppressDragClick, { capture: true });
      setTimeout(() => document.removeEventListener('click', suppressDragClick, { capture: true }), DRAG_CLICK_SUPPRESS_TIMEOUT_MS);

      if (dragPreviewRef.current) dragPreviewRef.current.style.display = 'none';
      setDragSourceOpacity(sourceEl, loc, '');

      const cardLeft  = ue.clientX - offsetX;
      const cardTop   = ue.clientY - offsetY;
      const cardRight  = cardLeft + CARD_W;
      const cardBottom = cardTop  + CARD_H;

      let bestArea: 'tableau' | 'foundation' | null = null;
      let bestPile = -1;
      let bestOverlap = 0;

      const pileElements = document.querySelectorAll<HTMLElement>('[data-drop-area]');
      for (const el of pileElements) {
        const rect = el.getBoundingClientRect();
        const overlapX = Math.min(cardRight, rect.right)  - Math.max(cardLeft, rect.left);
        const overlapY = Math.min(cardBottom, rect.bottom) - Math.max(cardTop,  rect.top);
        if (overlapX > 0 && overlapY > 0) {
          const overlap = overlapX * overlapY;
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestArea = el.dataset.dropArea as 'tableau' | 'foundation';
            bestPile = parseInt(el.dataset.dropPile!);
          }
        }
      }

      if (bestArea !== null) onDrop(bestArea, bestPile);
      onDragEnd();
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [onPointerDragStart, onDrop, onDragEnd]);

  const handleDeal = () => {
    startNewGame(Date.now(), state.drawMode, state.scoringMode);
  };

  const handleConfirmOptions = (drawMode: DrawMode, scoringMode: ScoringMode, size: 'normal' | 'large') => {
    setCardSize(size);
    startNewGame(Date.now(), drawMode, scoringMode);
    saveSettings({ drawMode, scoringMode, cardSize: size });
    setShowOptions(false);
  };

  const scoreDisplay =
    state.scoringMode === 'vegas'
      ? `$${state.score}`
      : `${state.score}`;

  const handleFoundationCardClick = (loc: CardLocation) => onCardClick(loc);
  const handleFoundationDoubleClick = (loc: CardLocation) => onCardDoubleClick(loc);
  const handleFoundationEmptyClick = (area: 'foundation', pile: number) =>
    onEmptyPileClick(area, pile);

  const handleBoardDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.card') || target.closest('button')) return;
    doAutoComplete();
  };

  return (
    <div className="klondike-game" onDoubleClick={handleBoardDoubleClick}>
      <div
        className={`klondike-board${cardSize === 'large' ? ' klondike-board--large' : ''}`}
      >

        <MenuBar
          canUndo={canUndo}
          score={scoreDisplay}
          onDeal={handleDeal}
          onUndo={doUndo}
          onOptions={() => setShowOptions(true)}
          onStats={() => onNavigate('stats')}
          onGallery={() => onNavigate('gallery')}
          onHome={onHome}
        />

        {canAutoComplete && (
          <div className="klondike-header">
            <button className="klondike-btn klondike-btn--autocomplete" onClick={doAutoComplete}>
              Auto-Complete
            </button>
          </div>
        )}

        {/* Top row */}
        <div className="klondike-top-row" style={{ position: 'relative' }}>
          <StockPile cards={state.stock} canRecycle={canRecycleStock} onStockClick={onStockClick} />

          {state.status === 'won'
            ? <span className="win-inline">You Win!</span>
            : <WastePile
                cards={state.waste}
                drawMode={state.drawMode}
                wasteBatchSize={state.wasteBatchSize}
                dragSource={dragSource}
                onCardClick={onCardClick}
                onCardDoubleClick={onCardDoubleClick}
                onPointerDown={handleCardPointerDown}
              />
          }

          <div className="klondike-top-spacer" />

          <div className="klondike-foundations">
            {state.foundations.map((pile, i) => (
              <FoundationPile
                key={i}
                index={i}
                cards={pile}
                dragSource={dragSource}
                onCardClick={handleFoundationCardClick}
                onCardDoubleClick={handleFoundationDoubleClick}
                onEmptyPileClick={handleFoundationEmptyClick}
                onPointerDown={handleCardPointerDown}
              />
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className="klondike-tableau">
          {state.tableau.map((pile, i) => (
            <TableauPile
              key={i}
              pileIndex={i}
              cards={pile}
              dragSource={dragSource}
              onCardClick={onCardClick}
              onCardDoubleClick={onCardDoubleClick}
              onEmptyPileClick={onEmptyPileClick}
              onPointerDown={handleCardPointerDown}
            />
          ))}
        </div>

        {/* Drag preview — position updated via ref, zero re-renders on pointermove */}
        {dragSource && (
          <div
            ref={dragPreviewRef}
            style={{
              display: 'none',
              position: 'fixed',
              left: 0,
              top: 0,
              pointerEvents: 'none',
              zIndex: 9999,
              willChange: 'transform',
            }}
          >
            {dragSource.cards.map((card, i) => (
              <CardView
                key={card.id}
                card={card}
                isDragSource={false}
                style={{ position: 'absolute', top: i * 22, left: 0 }}
              />
            ))}
          </div>
        )}

      </div>{/* end .klondike-board */}

      {showOptions && (
        <OptionsDialog
          drawMode={state.drawMode}
          scoringMode={state.scoringMode}
          cardSize={cardSize}
          onConfirm={handleConfirmOptions}
          onResetWinnings={(drawMode, scoringMode) => {
            startNewGame(Date.now(), drawMode, scoringMode, 0);
            saveSettings({ drawMode, scoringMode, cardSize });
            setShowOptions(false);
          }}
          onClose={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import type { DrawMode, ScoringMode, CardLocation } from '../types'; // DrawMode/ScoringMode used in useState initialisers
import { useKlondike } from '../hooks/useKlondike';
import { loadSettings, saveSettings } from '../storage';
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
}

export default function KlondikeGame({ onNavigate }: KlondikeGameProps) {
  const {
    state,
    canUndo,
    canRecycleStock,
    forceWin,
    selection,
    dragSource,
    onStockClick,
    onCardClick,
    onCardDoubleClick,
    onEmptyPileClick,
    onDragStart,
    onDragEnd,
    onDrop,
    doUndo,
    startNewGame,
    canAutoComplete,
    doAutoComplete,
  } = useKlondike();

  const [showOptions, setShowOptions] = useState(false);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // pointerup fires immediately on mouse release — hide the preview at once
  // rather than waiting for the OS-delayed dragend event.
  useEffect(() => {
    if (!dragSource) return;
    const hide = () => {
      const el = dragPreviewRef.current;
      if (el) el.style.display = 'none';
    };
    document.addEventListener('pointerup', hide);
    return () => document.removeEventListener('pointerup', hide);
  }, [dragSource]);
  const [cardSize, setCardSize] = useState<'normal' | 'large'>(
    () => loadSettings()?.cardSize ?? 'large'
  );

  // Pending settings — used on next Deal, independent of current game state
  const [pendingDrawMode, setPendingDrawMode] = useState<DrawMode>(
    () => loadSettings()?.drawMode ?? state.drawMode
  );
  const [pendingScoringMode, setPendingScoringMode] = useState<ScoringMode>(
    () => loadSettings()?.scoringMode ?? state.scoringMode
  );

  const handleDeal = () => {
    startNewGame(Date.now(), pendingDrawMode, pendingScoringMode);
  };

  const handleConfirmOptions = (drawMode: DrawMode, scoringMode: ScoringMode, size: 'normal' | 'large') => {
    setPendingDrawMode(drawMode);
    setPendingScoringMode(scoringMode);
    setCardSize(size);
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

  const handleDragEnd = () => {
    onDragEnd();
  };

  const handleBoardDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.card') || target.closest('button')) return;
    doAutoComplete();
  };

  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const el = dragPreviewRef.current;
    if (!el || !dragSource) return;
    el.style.transform = `translate(${e.clientX - dragSource.offsetX}px, ${e.clientY - dragSource.offsetY}px)`;
    el.style.display = 'block';
  };

  const handleBoardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragSource) return;

    const CARD_W = cardSize === 'large' ? 96 : 72;
    const CARD_H = cardSize === 'large' ? 134 : 100;

    const cardLeft = e.clientX - dragSource.offsetX;
    const cardTop = e.clientY - dragSource.offsetY;
    const cardRight = cardLeft + CARD_W;
    const cardBottom = cardTop + CARD_H;

    let bestArea: 'tableau' | 'foundation' | null = null;
    let bestPile = -1;
    let bestOverlap = 0;

    const pileElements = document.querySelectorAll<HTMLElement>('[data-drop-area]');
    for (const el of pileElements) {
      const rect = el.getBoundingClientRect();
      const overlapX = Math.min(cardRight, rect.right) - Math.max(cardLeft, rect.left);
      const overlapY = Math.min(cardBottom, rect.bottom) - Math.max(cardTop, rect.top);
      if (overlapX > 0 && overlapY > 0) {
        const overlap = overlapX * overlapY;
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestArea = el.dataset.dropArea as 'tableau' | 'foundation';
          bestPile = parseInt(el.dataset.dropPile!);
        }
      }
    }

    if (bestArea !== null) {
      onDrop(bestArea, bestPile);
    }
  };

  return (
    <div className="klondike-game" onDoubleClick={handleBoardDoubleClick} onDragOver={handleBoardDragOver} onDrop={handleBoardDrop}>
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
        />

        {/* Header */}
        <div className="klondike-header">
          <div className="klondike-header-left">
            <span className="klondike-title">Solitaire</span>
            {canAutoComplete && (
              <button className="klondike-btn klondike-btn--autocomplete" onClick={doAutoComplete}>
                Auto-Complete
              </button>
            )}
            {forceWin && (
              <button className="klondike-btn" onClick={forceWin} style={{ opacity: 0.5 }}>
                Force Win
              </button>
            )}
          </div>
        </div>

        {/* Top row */}
        <div className="klondike-top-row" style={{ position: 'relative' }}>
          <StockPile cards={state.stock} canRecycle={canRecycleStock} onStockClick={onStockClick} />

          {state.status === 'won'
            ? <span className="win-inline">You Win</span>
            : <WastePile
                cards={state.waste}
                drawMode={state.drawMode}
                wasteBatchSize={state.wasteBatchSize}
                dragSource={dragSource}
                onCardClick={onCardClick}
                onCardDoubleClick={onCardDoubleClick}
                onDragStart={onDragStart}
                onDragEnd={handleDragEnd}
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
                onDragStart={onDragStart}
                onDragEnd={handleDragEnd}
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
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>

        {/* Drag preview — fully opaque floating card(s) that follow the cursor */}
        {/* Position is updated directly via ref to avoid re-renders on every mousemove */}
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
          drawMode={pendingDrawMode}
          scoringMode={pendingScoringMode}
          cardSize={cardSize}
          onConfirm={handleConfirmOptions}
          onResetWinnings={() => {
            startNewGame(Date.now(), pendingDrawMode, pendingScoringMode, 0);
            setShowOptions(false);
          }}
          onClose={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}

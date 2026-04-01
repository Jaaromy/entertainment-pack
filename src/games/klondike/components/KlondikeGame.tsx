import { useState, useRef } from 'react';
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

  const handleBoardDragOver = (e: React.DragEvent) => {
    const el = dragPreviewRef.current;
    if (!el || !dragSource) return;
    el.style.left = `${e.clientX - dragSource.offsetX}px`;
    el.style.top = `${e.clientY - dragSource.offsetY}px`;
    el.style.display = 'block';
  };

  return (
    <div className="klondike-game">
      <div
        className={`klondike-board${cardSize === 'large' ? ' klondike-board--large' : ''}`}
        onDragOver={handleBoardDragOver}
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
                onDrop={onDrop}
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
              onDrop={onDrop}
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
              pointerEvents: 'none',
              zIndex: 9999,
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

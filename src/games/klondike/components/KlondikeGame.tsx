import { useState } from 'react';
import type { DrawMode, ScoringMode, CardLocation, Card } from '../types'; // DrawMode/ScoringMode used in useState initialisers
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
    dragOverTarget,
    onStockClick,
    onCardClick,
    onCardDoubleClick,
    onEmptyPileClick,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    doUndo,
    startNewGame,
    canAutoComplete,
    doAutoComplete,
  } = useKlondike();

  const [showOptions, setShowOptions] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
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

  const isFoundationDragOver = (pile: number) =>
    dragOverTarget?.area === 'foundation' && dragOverTarget.pile === pile;

  const isTableauDragOver = (pile: number) =>
    dragOverTarget?.area === 'tableau' && dragOverTarget.pile === pile;

  const makeFoundationDragOverHandler = (pile: number) => (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver('foundation', pile);
  };

  const makeTableauDragOverHandler = (pile: number) => (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver('tableau', pile);
  };

  const handleFoundationCardClick = (loc: CardLocation) => onCardClick(loc);
  const handleFoundationDoubleClick = (loc: CardLocation) => onCardDoubleClick(loc);
  const handleFoundationEmptyClick = (area: 'foundation', pile: number) =>
    onEmptyPileClick(area, pile);

  const handleDragEnd = () => {
    setDragPos(null);
    onDragEnd();
  };

  const handleBoardDragOver = (e: React.DragEvent) => {
    if (dragSource) setDragPos({ x: e.clientX, y: e.clientY });
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
                selection={selection}
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
                selection={selection}
                dragSource={dragSource}
                isDragOver={isFoundationDragOver(i)}
                onCardClick={handleFoundationCardClick}
                onCardDoubleClick={handleFoundationDoubleClick}
                onEmptyPileClick={handleFoundationEmptyClick}
                onDragStart={onDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={makeFoundationDragOverHandler(i)}
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
              selection={selection}
              dragSource={dragSource}
              isDragOver={isTableauDragOver(i)}
              onCardClick={onCardClick}
              onCardDoubleClick={onCardDoubleClick}
              onEmptyPileClick={onEmptyPileClick}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={makeTableauDragOverHandler(i)}
              onDrop={onDrop}
            />
          ))}
        </div>

        {/* Drag preview — fully opaque floating card(s) that follow the cursor */}
        {dragSource && dragPos && (() => {
          const FACE_UP_OFFSET = 22;
          const cards: Card[] = dragSource.cards;
          const ox = dragSource.offsetX;
          const oy = dragSource.offsetY;
          return (
            <div
              style={{
                position: 'fixed',
                left: dragPos.x - ox,
                top: dragPos.y - oy,
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            >
              {cards.map((card, i) => (
                <CardView
                  key={card.id}
                  card={card}
                  isSelected={false}
                  isDragSource={false}
                  style={{ position: 'absolute', top: i * FACE_UP_OFFSET, left: 0 }}
                />
              ))}
            </div>
          );
        })()}

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

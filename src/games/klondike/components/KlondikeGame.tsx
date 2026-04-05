import { useState } from 'react';
import type { DrawMode, ScoringMode, CardLocation } from '../types'; // DrawMode/ScoringMode used in useState initialisers
import { useKlondike } from '../hooks/useKlondike';
import { loadSettings, saveSettings } from '../storage';
import StockPile from './StockPile';
import WastePile from './WastePile';
import FoundationPile from './FoundationPile';
import TableauPile from './TableauPile';
import CardView from './CardView';
import OptionsDialog from './OptionsDialog';
import MenuBar from './MenuBar';
import '../klondike.css';

interface KlondikeGameProps {
  onNavigate: (view: 'stats' | 'gallery') => void;
  onHome?: () => void;
}

export default function KlondikeGame({ onNavigate, onHome }: KlondikeGameProps) {
  const {
    state,
    canUndo,
    canRecycleStock,
    selection,
    dragSource,
    dragOverTarget,
    ghostPos,
    ghostCards,
    onStockClick,
    onCardClick,
    onCardDoubleClick,
    onEmptyPileClick,
    onPointerDown,
    doUndo,
    startNewGame,
    canAutoComplete,
    doAutoComplete,
  } = useKlondike();

  const [showOptions, setShowOptions] = useState(false);
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

  const handleFoundationCardClick = (loc: CardLocation) => onCardClick(loc);
  const handleFoundationDoubleClick = (loc: CardLocation) => onCardDoubleClick(loc);
  const handleFoundationEmptyClick = (area: 'foundation', pile: number) =>
    onEmptyPileClick(area, pile);

  return (
    <div className="klondike-game">
      <div className={`klondike-board${cardSize === 'large' ? ' klondike-board--large' : ''}`}>

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

        {/* Header */}
        <div className="klondike-header">
          <div className="klondike-header-left">
            <span className="klondike-title">Solitaire</span>
            {canAutoComplete && (
              <button className="klondike-btn klondike-btn--autocomplete" onClick={doAutoComplete}>
                Auto-Complete
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
                selection={selection}
                dragSource={dragSource}
                onCardClick={onCardClick}
                onCardDoubleClick={onCardDoubleClick}
                onPointerDown={onPointerDown}
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
                onPointerDown={onPointerDown}
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
              onPointerDown={onPointerDown}
            />
          ))}
        </div>

      </div>{/* end .klondike-board */}

      {ghostPos && ghostCards && ghostCards.length > 0 && (
        <div className="drag-ghost" style={{ left: ghostPos.x, top: ghostPos.y }}>
          {ghostCards.map((card, i) => (
            <CardView
              key={card.id}
              card={card}
              isSelected={false}
              isDragSource={false}
              style={{
                position: i === 0 ? 'relative' : 'absolute',
                top: i === 0 ? 0 : i * 22,
                left: 0,
                zIndex: i,
              }}
            />
          ))}
        </div>
      )}

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

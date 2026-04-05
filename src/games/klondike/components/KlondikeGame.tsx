import { useState } from 'react';
import type { DrawMode, ScoringMode, CardLocation } from '../types';
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
  onHome?: () => void;
}

export default function KlondikeGame({ onNavigate, onHome }: KlondikeGameProps) {
  const {
    state,
    canUndo,
    canRecycleStock,
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
    canAutoComplete,
    doAutoComplete,
  } = useKlondike();

  const [showOptions, setShowOptions] = useState(false);
  const [cardSize, setCardSize] = useState<'normal' | 'large'>(
    () => loadSettings()?.cardSize ?? 'large'
  );

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
                dragSource={dragSource}
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
              dragSource={dragSource}
              onCardClick={onCardClick}
              onCardDoubleClick={onCardDoubleClick}
              onEmptyPileClick={onEmptyPileClick}
              onPointerDown={onPointerDown}
            />
          ))}
        </div>

      {ghostPos && ghostCards && ghostCards.length > 0 && (
        <div className="drag-ghost" style={{ left: ghostPos.x, top: ghostPos.y }}>
          {ghostCards.map((card, i) => (
            <CardView
              key={card.id}
              card={card}
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

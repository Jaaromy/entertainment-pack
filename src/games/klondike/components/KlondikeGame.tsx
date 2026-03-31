import { useState } from 'react';
import type { DrawMode, ScoringMode, CardLocation } from '../types';
import { useKlondike } from '../hooks/useKlondike';
import StockPile from './StockPile';
import WastePile from './WastePile';
import FoundationPile from './FoundationPile';
import TableauPile from './TableauPile';
import NewGameDialog from './NewGameDialog';
import '../klondike.css';

export default function KlondikeGame() {
  const {
    state,
    canUndo,
    canRecycleStock,
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

  const [showDialog, setShowDialog] = useState(false);

  const handleNewGame = () => setShowDialog(true);

  const handleConfirmNewGame = (seed: number, drawMode: DrawMode, scoringMode: ScoringMode) => {
    startNewGame(seed, drawMode, scoringMode);
    setShowDialog(false);
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

  return (
    <div className="klondike-game">
      {/* Header */}
      <div className="klondike-header">
        <span className="klondike-title">Solitaire</span>
        <span className="klondike-score">
          Score: {scoreDisplay} &nbsp;|&nbsp; Moves: {state.moves}
        </span>
        <button className="klondike-btn" onClick={doUndo} disabled={!canUndo}>
          Undo
        </button>
        {canAutoComplete && (
          <button className="klondike-btn klondike-btn--autocomplete" onClick={doAutoComplete}>
            Auto-Complete
          </button>
        )}
        <button className="klondike-btn" onClick={handleNewGame} style={{ marginLeft: 'auto' }}>
          New Game
        </button>
      </div>

      {/* Top row */}
      <div className="klondike-top-row">
        <StockPile cards={state.stock} canRecycle={canRecycleStock} onStockClick={onStockClick} />

        <WastePile
          cards={state.waste}
          drawMode={state.drawMode}
          selection={selection}
          dragSource={dragSource}
          onCardClick={onCardClick}
          onCardDoubleClick={onCardDoubleClick}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />

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
              onDragEnd={onDragEnd}
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

      {/* Win overlay */}
      {state.status === 'won' && (
        <div className="win-overlay">
          <div className="win-modal">
            <h2>You Won! 🎉</h2>
            <p>Final Score: {scoreDisplay}</p>
            <p style={{ marginBottom: 24, fontSize: '0.95rem', opacity: 0.8 }}>
              Moves: {state.moves}
            </p>
            <button className="klondike-btn klondike-btn--primary" onClick={handleNewGame}>
              New Game
            </button>
          </div>
        </div>
      )}

      {/* New game dialog */}
      {showDialog && (
        <NewGameDialog
          defaultDrawMode={state.drawMode}
          defaultScoringMode={state.scoringMode}
          onConfirm={handleConfirmNewGame}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}

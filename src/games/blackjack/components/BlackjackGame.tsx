import { useState } from 'react';
import { useBlackjack } from '../hooks/useBlackjack';
import BettingPanel from './BettingPanel';
import DealerHand from './DealerHand';
import PlayerHand from './PlayerHand';
import ActionBar from './ActionBar';
import BlackjackStatsScreen from './BlackjackStatsScreen';
import BlackjackOptionsDialog from './BlackjackOptionsDialog';
import '../blackjack.css';

interface BlackjackGameProps {
  onHome?: () => void;
}

export default function BlackjackGame({ onHome }: BlackjackGameProps) {
  const {
    state,
    canUndoAction,
    chipValues,
    canSplitHand,
    canDoubleDownHand,
    isPlayerActive,
    cardSize,
    onPlaceBet,
    onClearBet,
    onDeal,
    onHit,
    onStand,
    onDoubleDown,
    onSplit,
    onNextRound,
    onUndo,
    onNewGame,
    onSaveOptions,
  } = useBlackjack();

  const [view, setView] = useState<'game' | 'stats'>('game');
  const [showOptions, setShowOptions] = useState(false);

  if (view === 'stats') {
    return (
      <div className="bj-game">
        <BlackjackStatsScreen onBack={() => setView('game')} />
      </div>
    );
  }

  const showDealerTotal = state.phase === 'settlement' || state.phase === 'dealer';
  const isSettled = state.phase === 'settlement';
  const isBetting = state.phase === 'betting';

  const scoreDisplay = `$${state.balance}`;

  return (
    <div className={`bj-game${cardSize === 'large' ? ' bj-game--large' : ''}`}>
      {/* Menu bar */}
      <div className="menu-bar">
        <div className="menu-bar-left">
          <button className="menu-deal-button" onClick={onUndo} disabled={!canUndoAction}>Undo</button>
          <button className="menu-deal-button" onClick={() => setShowOptions(true)}>Options</button>
          <button className="menu-deal-button" onClick={() => setView('stats')}>Stats</button>
          {onHome && <button className="menu-deal-button" onClick={onHome}>All Games</button>}
        </div>
        <span className="menu-score">{scoreDisplay}</span>
      </div>

      {/* Table */}
      <div className="bj-table">
        {/* Dealer zone */}
        {state.dealerHand.cards.length > 0 && (
          <DealerHand
            dealerHand={state.dealerHand}
            showTotal={showDealerTotal}
          />
        )}

        {/* Player hands */}
        {state.playerHands.length > 0 && (
          <div className="bj-player-zone">
            {state.playerHands.map((hand, i) => (
              <PlayerHand
                key={i}
                hand={hand}
                isActive={state.phase === 'playing' && i === state.activeHandIndex}
                index={i}
                totalHands={state.playerHands.length}
              />
            ))}
          </div>
        )}

        {/* Betting panel (shown only in betting phase) */}
        {isBetting && (
          <BettingPanel
            balance={state.balance}
            currentBet={state.currentBet}
            chipValues={chipValues}
            onChipClick={onPlaceBet}
            onClear={onClearBet}
            onDeal={onDeal}
          />
        )}

        {/* Player action buttons */}
        <ActionBar
          isPlayerActive={isPlayerActive}
          canSplit={canSplitHand}
          canDoubleDown={canDoubleDownHand}
          onHit={onHit}
          onStand={onStand}
          onDoubleDown={onDoubleDown}
          onSplit={onSplit}
        />

        {/* Post-round controls */}
        {isSettled && (
          <div className="bj-round-end">
            <button className="bj-btn bj-btn--primary" onClick={onNextRound}>
              {state.balance > 0 ? 'Next Hand' : 'New Game'}
            </button>
            {state.balance <= 0 && (
              <button className="bj-btn bj-btn--secondary" onClick={onNewGame}>
                Reset Balance
              </button>
            )}
          </div>
        )}

        {/* Balance warning */}
        {state.balance === 0 && isSettled && (
          <div style={{ color: '#ff5a5a', textAlign: 'center', marginTop: 12, fontSize: '1rem' }}>
            Out of chips!
          </div>
        )}
      </div>

      {showOptions && (
        <BlackjackOptionsDialog
          options={state.options}
          cardSize={cardSize}
          onConfirm={(opts, size) => { onSaveOptions(opts, size); setShowOptions(false); }}
          onCancel={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}

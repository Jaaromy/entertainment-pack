import { useState } from 'react';
import { useBlackjack } from '../hooks/useBlackjack';
import BettingPanel from './BettingPanel';
import DealerHand from './DealerHand';
import PlayerHand from './PlayerHand';
import ActionBar from './ActionBar';
import BlackjackStatsScreen from './BlackjackStatsScreen';
import BlackjackOptionsDialog from './BlackjackOptionsDialog';
import HelpModal from '@/shared/components/HelpModal';
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
    learningMode,
    strategyFeedback,
    sessionStats,
    countInfo,
    onPlaceBet,
    onClearBet,
    onDeal,
    onHit,
    onStand,
    onDoubleDown,
    onSplit,
    onUndo,
    onNewGame,
    onSaveOptions,
  } = useBlackjack();

  const [view, setView] = useState<'game' | 'stats'>('game');
  const [showOptions, setShowOptions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
  const canDeal = (isBetting || isSettled) && state.currentBet > 0 && state.currentBet <= state.balance;

  const scoreDisplay = `$${state.balance}`;

  return (
    <div className={`bj-game${cardSize === 'large' ? ' bj-game--large' : ''}`}>
      {/* Menu bar */}
      <div className="menu-bar">
        <div className="menu-bar-left">
          <button className="menu-deal-button" onClick={onUndo} disabled={!canUndoAction}>Undo</button>
          <button className="menu-deal-button" onClick={() => setShowOptions(true)}>Options</button>
          <button className="menu-deal-button" onClick={() => setView('stats')}>Stats</button>
          <button className="menu-deal-button" onClick={() => setShowHelp(true)}>Help</button>
          {onHome && <button className="menu-deal-button" onClick={onHome}>All Games</button>}
        </div>
        <div className="bj-shoe-tracker">
          <div
            className="bj-shoe-tracker__fill"
            style={{ width: `${100 - (state.dealtCount / state.shoeSize) * 100}%` }}
          />
        </div>
        {import.meta.env.DEV && (
          <span className="menu-score" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            {state.shoeSize - state.dealtCount} cards
          </span>
        )}
        <span className="menu-score">{scoreDisplay}</span>
      </div>

      {/* Table */}
      <div className="bj-table">
        {/* Card area — grows to fill available space */}
        <div className="bj-cards-area">
          <DealerHand
            dealerHand={state.dealerHand}
            showTotal={showDealerTotal}
          />

          {/* Strategy feedback banner (learning mode, after each player action) */}
          {learningMode && strategyFeedback && (
            <div className={`bj-strategy-feedback bj-strategy-feedback--${strategyFeedback.correct ? 'correct' : 'incorrect'}`}>
              {strategyFeedback.correct
                ? `✓ Correct — Basic Strategy: ${strategyFeedback.optimalAction.toUpperCase()}`
                : `✗ You chose ${strategyFeedback.playerAction.toUpperCase()} — Basic Strategy: ${strategyFeedback.optimalAction.toUpperCase()}`
              }
            </div>
          )}

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
        </div>

        {/* Controls footer */}
        <div className="bj-controls">
          {/* Card count panel (learning mode) */}
          {learningMode && (
            <div className="bj-count-panel">
              <span>Running: {countInfo.runningCount > 0 ? '+' : ''}{countInfo.runningCount}</span>
              <span>True: {countInfo.trueCount > 0 ? '+' : ''}{countInfo.trueCount}</span>
              <span>Decks: {countInfo.decksRemaining.toFixed(1)}</span>
              <span className="bj-count-panel__divider" />
              <span>Strategy: {sessionStats.correct}/{sessionStats.correct + sessionStats.incorrect}</span>
            </div>
          )}
          <BettingPanel
            isActive={isBetting || isSettled}
            canDeal={canDeal}
            balance={state.balance}
            currentBet={state.currentBet}
            chipValues={chipValues}
            onChipClick={onPlaceBet}
            onClear={onClearBet}
            onDeal={onDeal}
          />
          <ActionBar
            isPlayerActive={isPlayerActive}
            canSplit={canSplitHand}
            canDoubleDown={canDoubleDownHand}
            onHit={onHit}
            onStand={onStand}
            onDoubleDown={onDoubleDown}
            onSplit={onSplit}
          />
          {state.balance === 0 && isSettled && (
            <div className="bj-out-of-chips">
              <span>Out of chips!</span>
              <button className="bj-btn bj-btn--secondary" onClick={onNewGame}>Reset Balance</button>
            </div>
          )}
        </div>
      </div>

      {showOptions && (
        <BlackjackOptionsDialog
          options={state.options}
          cardSize={cardSize}
          learningMode={learningMode}
          onConfirm={(opts, size, lm) => { onSaveOptions(opts, size, lm); setShowOptions(false); }}
          onCancel={() => setShowOptions(false)}
        />
      )}

      {showHelp && (
        <HelpModal
          title="Blackjack Controls"
          sections={[
            {
              title: 'Betting',
              controls: [
                { action: 'Click chip', description: 'Add that chip value to your bet' },
                { action: 'Clear', description: 'Remove your current bet' },
                { action: 'Deal', description: 'Deal cards and start the round' },
              ],
            },
            {
              title: 'Playing',
              controls: [
                { action: 'Hit', description: 'Draw another card' },
                { action: 'Stand', description: 'End your turn' },
                { action: 'Double Down', description: 'Double your bet and draw exactly one more card' },
                { action: 'Split', description: 'Split a matching pair into two hands' },
                { action: 'Undo', description: 'Undo your last action' },
              ],
            },
          ]}
          onClose={() => setShowHelp(false)}
        />
      )}
    </div>
  );
}

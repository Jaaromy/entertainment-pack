import { memo } from 'react';

interface BettingPanelProps {
  isActive: boolean;
  canDeal: boolean;
  balance: number;
  currentBet: number;
  chipValues: readonly number[];
  onChipClick: (amount: number) => void;
  onClear: () => void;
  onDeal: () => void;
}

function BettingPanel({ isActive, canDeal, balance, currentBet, chipValues, onChipClick, onClear, onDeal }: BettingPanelProps) {

  return (
    <div className="bj-betting-panel">
      <div className="bj-bet-display">
        <span className="bj-bet-label">Bet</span>
        <span className="bj-bet-amount">${currentBet}</span>
      </div>
      <div className="bj-chips">
        {chipValues.map(value => (
          <button
            key={value}
            className="bj-chip"
            onClick={() => onChipClick(value)}
            disabled={!isActive || currentBet + value > balance}
            title={`Add $${value}`}
          >
            ${value}
          </button>
        ))}
      </div>
      <div className="bj-bet-actions">
        <button
          className="bj-btn bj-btn--secondary"
          onClick={onClear}
          disabled={!isActive || currentBet === 0}
        >
          Clear
        </button>
        <button
          className="bj-btn bj-btn--primary"
          onClick={onDeal}
          disabled={!canDeal}
        >
          Deal
        </button>
      </div>
    </div>
  );
}

export default memo(BettingPanel);

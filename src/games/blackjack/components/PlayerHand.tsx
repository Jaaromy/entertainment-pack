import { memo } from 'react';
import CardView from '../../../shared/components/CardView';
import { handValue } from '../blackjackLogic';
import type { Hand } from '../types';

interface PlayerHandProps {
  hand: Hand;
  isActive: boolean;
  index: number;
  totalHands: number;
}

const RESULT_LABEL: Record<string, string> = {
  win: 'Win',
  blackjack: 'Blackjack!',
  push: 'Push',
  loss: 'Lose',
};

const RESULT_COLOR: Record<string, string> = {
  win: '#4cde6a',
  blackjack: '#ffd600',
  push: '#aaa',
  loss: '#ff5a5a',
};

function PlayerHand({ hand, isActive, index, totalHands }: PlayerHandProps) {
  const hv = handValue(hand.cards);
  const totalDisplay = hv.isBust ? 'Bust' : `${hv.value}${hv.isSoft ? ' soft' : ''}`;

  const totalBet = hand.bet + hand.doubleDownBet;
  const betDisplay = hand.doubleDownBet > 0 ? `$${totalBet} (doubled)` : `$${hand.bet}`;

  return (
    <div className={`bj-player-hand${isActive ? ' bj-player-hand--active' : ''}`}>
      {totalHands > 1 && (
        <div className="bj-hand-index">Hand {index + 1}</div>
      )}
      <div className="bj-cards-row">
        {hand.cards.map((card, i) => (
          <div key={card.id} className="bj-card-wrapper" style={{ zIndex: i }}>
            <CardView card={card} isDragSource={false} />
          </div>
        ))}
      </div>
      <div className="bj-hand-info">
        <span className="bj-hand-total">{totalDisplay}</span>
        <span className="bj-hand-bet">{betDisplay}</span>
      </div>
      {hand.result !== null && (
        <div
          className="bj-hand-result"
          style={{ color: RESULT_COLOR[hand.result] ?? '#fff' }}
        >
          {RESULT_LABEL[hand.result] ?? hand.result}
        </div>
      )}
    </div>
  );
}

export default memo(PlayerHand);

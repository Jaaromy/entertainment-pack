import { memo } from 'react';
import CardView from '../../../shared/components/CardView';
import { handValue } from '../blackjackLogic';
import type { DealerHand as DealerHandType } from '../types';

interface DealerHandProps {
  dealerHand: DealerHandType;
  /** Show total only once hole card is revealed */
  showTotal: boolean;
}

function DealerHand({ dealerHand, showTotal }: DealerHandProps) {
  const visibleCards = showTotal
    ? dealerHand.cards
    : dealerHand.cards.map((c, i) => (i === 1 ? { ...c, faceUp: false } : c));

  const total = showTotal
    ? handValue(dealerHand.cards.map(c => ({ ...c, faceUp: true }))).value
    : null;

  return (
    <div className="bj-hand-zone">
      {dealerHand.cards.length > 0 && (
        <div className="bj-hand-label">Dealer{total !== null ? ` — ${total}` : ''}</div>
      )}
      <div className="bj-cards-row">
        {visibleCards.map((card, i) => (
          <div key={card.id} className="bj-card-wrapper" style={{ zIndex: i }}>
            <CardView card={card} isDragSource={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(DealerHand);

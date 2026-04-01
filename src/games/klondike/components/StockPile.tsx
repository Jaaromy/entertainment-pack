import type { Card } from '../types';
import { shuffleSlotStyle, noShuffleSlotStyle } from '../spriteSheet';
import CardView from './CardView';

interface StockPileProps {
  cards: Card[];
  canRecycle: boolean;
  onStockClick: () => void;
}

export default function StockPile({ cards, canRecycle, onStockClick }: StockPileProps) {
  if (cards.length === 0) {
    return (
      <div className="stock-pile">
        <div
          className="stock-recycle"
          style={canRecycle ? shuffleSlotStyle : noShuffleSlotStyle}
          onClick={onStockClick}
          title={canRecycle ? 'Recycle waste pile' : 'No more recycles'}
        />
      </div>
    );
  }

  const topCard: Card = { ...cards[cards.length - 1]!, faceUp: false };

  return (
    <div className="stock-pile" onClick={onStockClick} title={`${cards.length} cards remaining`}>
      <CardView
        card={topCard}
        isDragSource={false}
        draggable={false}
        style={{ position: 'relative' }}
      />
      <span className="stock-count">{cards.length}</span>
    </div>
  );
}

import type { Card } from '../types';
import CardView from './CardView';

interface StockPileProps {
  cards: Card[];
  onStockClick: () => void;
}

export default function StockPile({ cards, onStockClick }: StockPileProps) {
  if (cards.length === 0) {
    return (
      <div className="stock-pile">
        <div
          className="stock-recycle"
          onClick={onStockClick}
          title="Recycle waste pile"
        >
          ↺
        </div>
      </div>
    );
  }

  const topCard: Card = { ...cards[cards.length - 1]!, faceUp: false };

  return (
    <div className="stock-pile" onClick={onStockClick} title={`${cards.length} cards remaining`}>
      <CardView
        card={topCard}
        isSelected={false}
        isDragSource={false}
        draggable={false}
        style={{ position: 'relative' }}
      />
      <span className="stock-count">{cards.length}</span>
    </div>
  );
}

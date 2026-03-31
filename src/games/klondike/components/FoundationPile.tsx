import type { Card, CardLocation, Selection } from '../types';
import CardView from './CardView';

const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];

interface FoundationPileProps {
  index: number;
  cards: Card[];
  selection: Selection | null;
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  isDragOver: boolean;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onEmptyPileClick: (area: 'foundation', pile: number) => void;
  onDragStart: (loc: CardLocation, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (area: 'foundation', pile: number) => void;
}

export default function FoundationPile({
  index,
  cards,
  selection,
  dragSource,
  isDragOver,
  onCardClick,
  onCardDoubleClick,
  onEmptyPileClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: FoundationPileProps) {
  const loc: CardLocation = { area: 'foundation', pile: index };
  const isSelected = selection?.location.area === 'foundation' && selection.location.pile === index;
  const isDragSrc = dragSource?.loc.area === 'foundation' && dragSource.loc.pile === index;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop('foundation', index);
  };

  if (cards.length === 0) {
    return (
      <div
        className={`foundation-pile pile-slot${isDragOver ? ' pile-slot--drag-over' : ''}`}
        onClick={() => onEmptyPileClick('foundation', index)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {SUIT_SYMBOLS[index]}
      </div>
    );
  }

  const top = cards[cards.length - 1]!;

  return (
    <div
      className={`foundation-pile${isDragOver ? ' pile-slot--drag-over' : ''}`}
      style={{ borderRadius: 7, border: isDragOver ? '2px solid #ffd600' : undefined }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CardView
        card={top}
        isSelected={isSelected}
        isDragSource={isDragSrc}
        draggable
        style={{ position: 'relative' }}
        onClick={() => onCardClick(loc)}
        onDoubleClick={() => onCardDoubleClick(loc)}
        onDragStart={e => onDragStart(loc, e)}
        onDragEnd={onDragEnd}
      />
    </div>
  );
}

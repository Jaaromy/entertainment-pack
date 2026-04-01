import { memo } from 'react';
import type { Card, CardLocation } from '../types';
import { emptySlotStyle } from '../spriteSheet';
import CardView from './CardView';

interface FoundationPileProps {
  index: number;
  cards: Card[];
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onEmptyPileClick: (area: 'foundation', pile: number) => void;
  onDragStart: (loc: CardLocation, e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function FoundationPile({
  index,
  cards,
  dragSource,
  onCardClick,
  onCardDoubleClick,
  onEmptyPileClick,
  onDragStart,
  onDragEnd,
}: FoundationPileProps) {
  const loc: CardLocation = { area: 'foundation', pile: index };
  const isDragSrc = dragSource?.loc.area === 'foundation' && dragSource.loc.pile === index;

  if (cards.length === 0) {
    return (
      <div
        className="foundation-pile pile-slot"
        style={emptySlotStyle}
        data-drop-area="foundation"
        data-drop-pile={index}
        onClick={() => onEmptyPileClick('foundation', index)}
        onDragOver={e => e.preventDefault()}
      />
    );
  }

  const top = cards[cards.length - 1]!;

  return (
    <div
      className="foundation-pile"
      style={{ borderRadius: 7 }}
      data-drop-area="foundation"
      data-drop-pile={index}
      onDragOver={e => e.preventDefault()}
    >
      <CardView
        card={top}
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

export default memo(FoundationPile);

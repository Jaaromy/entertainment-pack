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
  onPointerDown: (loc: CardLocation, e: React.PointerEvent<HTMLDivElement>) => void;
}

function FoundationPile({
  index,
  cards,
  dragSource,
  onCardClick,
  onCardDoubleClick,
  onEmptyPileClick,
  onPointerDown,
}: FoundationPileProps) {
  const loc: CardLocation = { area: 'foundation', pile: index };
  const isDragSrc = dragSource?.loc.area === 'foundation' && dragSource.loc.pile === index;

  if (cards.length === 0 || (isDragSrc && cards.length === 1)) {
    return (
      <div
        className="foundation-pile pile-slot"
        style={emptySlotStyle}
        data-drop-area="foundation"
        data-drop-pile={index}
        onClick={() => onEmptyPileClick('foundation', index)}
      />
    );
  }

  const top = cards[cards.length - 1]!;
  const under = isDragSrc && cards.length >= 2 ? cards[cards.length - 2] : null;

  return (
    <div
      className="foundation-pile"
      style={{ borderRadius: 7, position: 'relative' }}
      data-drop-area="foundation"
      data-drop-pile={index}
    >
      {under && (
        <CardView
          card={under}
          isDragSource={false}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      <CardView
        card={top}
        isDragSource={isDragSrc}
        style={{ position: 'relative' }}
        onClick={() => onCardClick(loc)}
        onDoubleClick={() => onCardDoubleClick(loc)}
        onPointerDown={e => onPointerDown(loc, e)}
      />
    </div>
  );
}

export default memo(FoundationPile);

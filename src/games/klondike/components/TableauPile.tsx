import { memo } from 'react';
import type { Card, CardLocation } from '../types';
import { emptySlotStyle } from '../spriteSheet';
import CardView from './CardView';

interface TableauPileProps {
  pileIndex: number;
  cards: Card[];
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onEmptyPileClick: (area: 'tableau', pile: number) => void;
  onDragStart: (loc: CardLocation, e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function isCardDragSource(
  cardIndex: number,
  pileIndex: number,
  dragSource: { loc: CardLocation; cards: Card[] } | null
): boolean {
  if (!dragSource) return false;
  const loc = dragSource.loc;
  if (loc.area !== 'tableau') return false;
  if (loc.pile !== pileIndex) return false;
  return cardIndex >= loc.cardIndex;
}

function TableauPile({
  pileIndex,
  cards,
  dragSource,
  onCardClick,
  onCardDoubleClick,
  onEmptyPileClick,
  onDragStart,
  onDragEnd,
}: TableauPileProps) {
  // Calculate heights
  let totalOffset = 0;
  const offsets: number[] = [];
  for (let i = 0; i < cards.length; i++) {
    offsets.push(totalOffset);
    if (i < cards.length - 1) {
      const card = cards[i]!;
      totalOffset += card.faceUp ? 22 : 4;
    }
  }
  const containerHeight = cards.length === 0 ? 100 : totalOffset + 100;

  if (cards.length === 0) {
    return (
      <div
        className="tableau-pile pile-slot"
        style={emptySlotStyle}
        data-drop-area="tableau"
        data-drop-pile={pileIndex}
        onClick={() => onEmptyPileClick('tableau', pileIndex)}
        onDragOver={e => e.preventDefault()}
      />
    );
  }

  return (
    <div
      className="tableau-pile"
      style={{ height: containerHeight }}
      data-drop-area="tableau"
      data-drop-pile={pileIndex}
      onDragOver={e => e.preventDefault()}
    >
      {cards.map((card, i) => {
        const loc: CardLocation = { area: 'tableau', pile: pileIndex, cardIndex: i };
        const isDragSrc = isCardDragSource(i, pileIndex, dragSource);

        return (
          <CardView
            key={card.id}
            card={card}
            isDragSource={isDragSrc}
            draggable={card.faceUp}
            style={{
              position: 'absolute',
              top: offsets[i],
              left: 0,
              zIndex: i + 1,
            }}
            onClick={() => onCardClick(loc)}
            onDoubleClick={() => onCardDoubleClick(loc)}
            onDragStart={e => onDragStart(loc, e)}
            onDragEnd={onDragEnd}
          />
        );
      })}
    </div>
  );
}

export default memo(TableauPile);

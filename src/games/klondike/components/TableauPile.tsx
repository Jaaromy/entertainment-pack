import type { Card, CardLocation, Selection } from '../types';
import { emptySlotStyle } from '../spriteSheet';
import CardView from './CardView';

interface TableauPileProps {
  pileIndex: number;
  cards: Card[];
  selection: Selection | null;
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  isDragOver: boolean;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onEmptyPileClick: (area: 'tableau', pile: number) => void;
  onDragStart: (loc: CardLocation, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (area: 'tableau', pile: number) => void;
}

function isCardSelected(
  cardIndex: number,
  pileIndex: number,
  selection: Selection | null
): boolean {
  if (!selection) return false;
  const loc = selection.location;
  if (loc.area !== 'tableau') return false;
  if (loc.pile !== pileIndex) return false;
  return cardIndex >= loc.cardIndex;
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

export default function TableauPile({
  pileIndex,
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop('tableau', pileIndex);
  };

  if (cards.length === 0) {
    return (
      <div
        className={`tableau-pile pile-slot${isDragOver ? ' pile-slot--drag-over' : ''}`}
        style={emptySlotStyle}
        onClick={() => onEmptyPileClick('tableau', pileIndex)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    );
  }

  return (
    <div
      className="tableau-pile"
      style={{ height: containerHeight }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay at the bottom for empty-pile drops when dragging over a pile */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 7,
            border: '2px solid #ffd600',
            zIndex: 200,
            pointerEvents: 'none',
          }}
        />
      )}
      {cards.map((card, i) => {
        const loc: CardLocation = { area: 'tableau', pile: pileIndex, cardIndex: i };
        const sel = isCardSelected(i, pileIndex, selection);
        const isDragSrc = isCardDragSource(i, pileIndex, dragSource);

        return (
          <CardView
            key={card.id}
            card={card}
            isSelected={sel}
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

import type { Card, CardLocation, DrawMode } from '../types';
import CardView from './CardView';

interface WastePileProps {
  cards: Card[];
  drawMode: DrawMode;
  wasteBatchSize: number;
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onDragStart: (loc: CardLocation, e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const WASTE_LOC: CardLocation = { area: 'waste' };

export default function WastePile({
  cards,
  drawMode,
  wasteBatchSize,
  dragSource,
  onCardClick,
  onCardDoubleClick,
  onDragStart,
  onDragEnd,
}: WastePileProps) {
  const isDragSrc = dragSource?.loc.area === 'waste';

  if (cards.length === 0) {
    return (
      <div className="waste-pile">
        <div className="pile-slot" style={{ cursor: 'default' }} />
      </div>
    );
  }

  if (drawMode === 1) {
    const top = cards[cards.length - 1]!;
    return (
      <div className="waste-pile">
        <div className="waste-pile-inner">
          <CardView
            card={top}
            isDragSource={isDragSrc}
            draggable
            style={{ position: 'absolute', top: 0, left: 0 }}
            onClick={() => onCardClick(WASTE_LOC)}
            onDoubleClick={() => onCardDoubleClick(WASTE_LOC)}
            onDragStart={e => onDragStart(WASTE_LOC, e)}
            onDragEnd={onDragEnd}
          />
        </div>
      </div>
    );
  }

  // Draw-3: show only cards from the current draw batch
  const visibleCount = Math.min(wasteBatchSize, cards.length);
  if (visibleCount === 0) {
    return (
      <div className="waste-pile waste-pile--draw3">
        <div className="pile-slot" style={{ cursor: 'default' }} />
      </div>
    );
  }
  const visibleCards = cards.slice(cards.length - visibleCount);
  const offsets = ['0px', 'var(--waste-offset)', 'calc(var(--waste-offset) * 2)'];

  return (
    <div className="waste-pile waste-pile--draw3">
      <div className="waste-pile-inner">
        {visibleCards.map((card, i) => {
          const isTop = i === visibleCards.length - 1;
          const left = offsets[i] ?? '0px';
          return (
            <CardView
              key={card.id}
              card={card}
              isDragSource={isDragSrc && isTop}
              draggable={isTop}
              style={{ position: 'absolute', top: 0, left }}
              onClick={isTop ? () => onCardClick(WASTE_LOC) : undefined}
              onDoubleClick={isTop ? () => onCardDoubleClick(WASTE_LOC) : undefined}
              onDragStart={isTop ? e => onDragStart(WASTE_LOC, e) : undefined}
              onDragEnd={isTop ? onDragEnd : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

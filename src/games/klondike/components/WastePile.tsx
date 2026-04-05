import type { Card, CardLocation, DrawMode } from '../types';
import CardView from './CardView';

interface WastePileProps {
  cards: Card[];
  drawMode: DrawMode;
  selection: { location: CardLocation; cards: Card[] } | null;
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onPointerDown: (loc: CardLocation, e: React.PointerEvent) => void;
}

const WASTE_LOC: CardLocation = { area: 'waste' };

export default function WastePile({
  cards,
  drawMode,
  selection,
  dragSource,
  onCardClick,
  onCardDoubleClick,
  onPointerDown,
}: WastePileProps) {
  const isSelected =
    selection?.location.area === 'waste';
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
            isSelected={isSelected}
            isDragSource={isDragSrc}
            style={{ position: 'absolute', top: 0, left: 0 }}
            onClick={() => onCardClick(WASTE_LOC)}
            onDoubleClick={() => onCardDoubleClick(WASTE_LOC)}
            onPointerDown={e => onPointerDown(WASTE_LOC, e)}
          />
        </div>
      </div>
    );
  }

  // Draw-3: show up to last 3 cards as a fan
  const visibleCount = Math.min(3, cards.length);
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
              isSelected={isSelected && isTop}
              isDragSource={isDragSrc && isTop}
              style={{ position: 'absolute', top: 0, left }}
              onClick={isTop ? () => onCardClick(WASTE_LOC) : undefined}
              onDoubleClick={isTop ? () => onCardDoubleClick(WASTE_LOC) : undefined}
              onPointerDown={isTop ? e => onPointerDown(WASTE_LOC, e) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

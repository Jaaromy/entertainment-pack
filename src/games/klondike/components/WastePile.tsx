import { memo } from 'react';
import type { Card, CardLocation, DrawMode } from '../types';
import CardView from './CardView';

interface WastePileProps {
  cards: Card[];
  drawMode: DrawMode;
  wasteBatchSize: number;
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onPointerDown: (loc: CardLocation, e: React.PointerEvent<HTMLDivElement>) => void;
}

const WASTE_LOC: CardLocation = { area: 'waste' };

function WastePile({
  cards,
  drawMode,
  wasteBatchSize,
  dragSource,
  onCardClick,
  onCardDoubleClick,
  onPointerDown,
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
    const under = isDragSrc ? cards[cards.length - 2] : undefined;
    return (
      <div className="waste-pile">
        <div className="waste-pile-inner">
          {under && (
            <CardView
              key={under.id}
              card={under}
              isDragSource={false}
              style={{ position: 'absolute', top: 0, left: 0, cursor: 'default' }}
            />
          )}
          <CardView
            key={top.id}
            card={top}
            isDragSource={isDragSrc}
            data-card-loc={JSON.stringify(WASTE_LOC)}
            style={{ position: 'absolute', top: 0, left: 0 }}
            onClick={() => onCardClick(WASTE_LOC)}
            onDoubleClick={() => onCardDoubleClick(WASTE_LOC)}
            onPointerDown={e => onPointerDown(WASTE_LOC, e)}
          />
        </div>
      </div>
    );
  }

  // Draw-3: show cards from the current batch, but always at least 1 if waste is non-empty
  const visibleCount = Math.max(1, Math.min(wasteBatchSize, cards.length));
  const visibleCards = cards.slice(cards.length - visibleCount);
  // When dragging the only visible card, peek at the card underneath it
  const underDraw3 = isDragSrc && visibleCount === 1 ? cards[cards.length - 2] : undefined;
  const offsets = ['0px', 'var(--waste-offset)', 'calc(var(--waste-offset) * 2)'];

  return (
    <div className="waste-pile waste-pile--draw3">
      <div className="waste-pile-inner">
        {underDraw3 && (
          <CardView
            key={underDraw3.id}
            card={underDraw3}
            isDragSource={false}
            style={{ position: 'absolute', top: 0, left: '0px', cursor: 'default' }}
          />
        )}
        {visibleCards.map((card, i) => {
          const isTop = i === visibleCards.length - 1;
          const left = offsets[i] ?? '0px';
          return (
            <CardView
              key={card.id}
              card={card}
              isDragSource={isDragSrc && isTop}
              style={{ position: 'absolute', top: 0, left, ...(!isTop ? { cursor: 'default' } : {}) }}
              data-card-loc={isTop ? JSON.stringify(WASTE_LOC) : undefined}
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

export default memo(WastePile);

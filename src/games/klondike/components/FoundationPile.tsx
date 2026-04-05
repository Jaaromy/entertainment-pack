import type { Card, CardLocation, Selection } from '../types';
import { emptySlotStyle } from '../spriteSheet';
import CardView from './CardView';

interface FoundationPileProps {
  index: number;
  cards: Card[];
  selection: Selection | null;
  dragSource: { loc: CardLocation; cards: Card[] } | null;
  isDragOver: boolean;
  onCardClick: (loc: CardLocation) => void;
  onCardDoubleClick: (loc: CardLocation) => void;
  onEmptyPileClick: (area: 'foundation', pile: number) => void;
  onPointerDown: (loc: CardLocation, e: React.PointerEvent) => void;
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
  onPointerDown,
}: FoundationPileProps) {
  const loc: CardLocation = { area: 'foundation', pile: index };
  const isSelected = selection?.location.area === 'foundation' && selection.location.pile === index;
  const isDragSrc = dragSource?.loc.area === 'foundation' && dragSource.loc.pile === index;

  if (cards.length === 0) {
    return (
      <div
        className={`foundation-pile pile-slot${isDragOver ? ' pile-slot--drag-over' : ''}`}
        data-drop-area="foundation"
        data-drop-pile={index}
        style={emptySlotStyle}
        onClick={() => onEmptyPileClick('foundation', index)}
      />
    );
  }

  const top = cards[cards.length - 1]!;

  return (
    <div
      className={`foundation-pile${isDragOver ? ' pile-slot--drag-over' : ''}`}
      data-drop-area="foundation"
      data-drop-pile={index}
      style={{ borderRadius: 7, border: isDragOver ? '2px solid #ffd600' : undefined }}
    >
      <CardView
        card={top}
        isSelected={isSelected}
        isDragSource={isDragSrc}
        style={{ position: 'relative' }}
        onClick={() => onCardClick(loc)}
        onDoubleClick={() => onCardDoubleClick(loc)}
        onPointerDown={e => onPointerDown(loc, e)}
      />
    </div>
  );
}

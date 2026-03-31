import type { Card } from '../types';
import { SUIT_SYMBOL, RANK_LABEL, RED_SUITS } from '../constants';

interface CardViewProps {
  card: Card;
  isSelected: boolean;
  isDragSource: boolean;
  draggable?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export default function CardView({
  card,
  isSelected,
  isDragSource,
  draggable = false,
  style,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
}: CardViewProps) {
  const isRed = RED_SUITS.includes(card.suit);
  const symbol = SUIT_SYMBOL[card.suit];
  const rankLabel = RANK_LABEL[card.rank];

  const classes = [
    'card',
    card.faceUp ? 'card--face-up' : 'card--face-down',
    card.faceUp ? (isRed ? 'card--red' : 'card--black') : '',
    isSelected ? 'card--selected' : '',
    isDragSource ? 'card--drag-source' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={style}
      draggable={draggable && card.faceUp}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {card.faceUp ? (
        <>
          <div className="card-corner card-corner--top">
            <span className="card-corner-rank">{rankLabel}</span>
            <span className="card-corner-suit">{symbol}</span>
          </div>
          <div className="card-center-suit">{symbol}</div>
          <div className="card-corner card-corner--bottom">
            <span className="card-corner-rank">{rankLabel}</span>
            <span className="card-corner-suit">{symbol}</span>
          </div>
        </>
      ) : (
        <div className="card-back-inner" />
      )}
    </div>
  );
}

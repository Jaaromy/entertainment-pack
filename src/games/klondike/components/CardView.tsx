import { memo } from 'react';
import type { Card } from '../types';
import { cardFaceStyle } from '../spriteSheet';

interface CardViewProps {
  card: Card;
  isDragSource: boolean;
  draggable?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function CardView({
  card,
  isDragSource,
  draggable,
  style,
  onClick,
  onDoubleClick,
  onPointerDown,
}: CardViewProps) {
  const classes = [
    'card',
    card.faceUp ? 'card--face-up' : 'card--face-down',
    isDragSource  ? 'card--drag-source' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const faceStyle = card.faceUp ? cardFaceStyle(card.suit, card.rank) : undefined;

  return (
    <div
      className={classes}
      style={faceStyle ? { ...faceStyle, ...style } : style}
      draggable={draggable}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
    />
  );
}

export default memo(CardView);

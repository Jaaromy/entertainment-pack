import { memo } from 'react';
import type { Card } from '../types';
import { cardFaceStyle } from '../spriteSheet';

interface CardViewProps {
  card: Card;
  isDragSource: boolean;
  draggable?: boolean;
  style?: React.CSSProperties;
  'data-card-loc'?: string;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function CardView({
  card,
  isDragSource,
  draggable,
  style,
  'data-card-loc': dataCardLoc,
  onClick,
  onDoubleClick,
  onPointerDown,
  onContextMenu,
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
      data-card-loc={dataCardLoc}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    />
  );
}

export default memo(CardView);

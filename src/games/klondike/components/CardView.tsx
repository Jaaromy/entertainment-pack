import type { Card } from '../types';
import { cardFaceStyle } from '../spriteSheet';

interface CardViewProps {
  card: Card;
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
  isDragSource,
  draggable = false,
  style,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
}: CardViewProps) {
  const classes = [
    'card',
    card.faceUp ? 'card--face-up' : 'card--face-down',
    isDragSource  ? 'card--drag-source' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const faceStyle = card.faceUp ? cardFaceStyle(card.suit, card.rank) : undefined;

  const handleDragStart = (e: React.DragEvent) => {
    if (!onDragStart) return;
    // Suppress the browser's semi-transparent ghost; KlondikeGame renders its own opaque preview.
    const ghost = new Image();
    e.dataTransfer.setDragImage(ghost, 0, 0);
    onDragStart(e);
  };

  return (
    <div
      className={classes}
      style={faceStyle ? { ...faceStyle, ...style } : style}
      draggable={draggable && card.faceUp}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    />
  );
}

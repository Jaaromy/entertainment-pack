import { memo } from 'react';

interface ActionBarProps {
  isPlayerActive: boolean;
  canSplit: boolean;
  canDoubleDown: boolean;
  onHit: () => void;
  onStand: () => void;
  onDoubleDown: () => void;
  onSplit: () => void;
}

function ActionBar({ isPlayerActive, canSplit, canDoubleDown, onHit, onStand, onDoubleDown, onSplit }: ActionBarProps) {
  if (!isPlayerActive) return null;

  return (
    <div className="bj-action-bar">
      <button className="bj-btn bj-btn--action" onClick={onHit}>Hit</button>
      <button className="bj-btn bj-btn--action" onClick={onStand}>Stand</button>
      <button
        className="bj-btn bj-btn--action"
        onClick={onDoubleDown}
        disabled={!canDoubleDown}
      >
        Double
      </button>
      <button
        className="bj-btn bj-btn--action"
        onClick={onSplit}
        disabled={!canSplit}
      >
        Split
      </button>
    </div>
  );
}

export default memo(ActionBar);

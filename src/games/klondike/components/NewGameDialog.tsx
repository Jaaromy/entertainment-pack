import { useState } from 'react';
import type { DrawMode, ScoringMode } from '../types';

interface NewGameDialogProps {
  onConfirm: (seed: number, drawMode: DrawMode, scoringMode: ScoringMode) => void;
  onCancel: () => void;
  defaultDrawMode?: DrawMode;
  defaultScoringMode?: ScoringMode;
}

export default function NewGameDialog({ onConfirm, onCancel, defaultDrawMode, defaultScoringMode }: NewGameDialogProps) {
  const [drawMode, setDrawMode] = useState<DrawMode>(defaultDrawMode ?? 1);
  const [scoringMode, setScoringMode] = useState<ScoringMode>(defaultScoringMode ?? 'standard');

  const handleConfirm = () => {
    onConfirm(Date.now(), drawMode, scoringMode);
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={e => e.stopPropagation()}>
        <h3>New Game</h3>

        <div className="dialog-field">
          <label>Draw Mode</label>
          <div className="dialog-radio-group">
            <label>
              <input
                type="radio"
                name="drawMode"
                value="1"
                checked={drawMode === 1}
                onChange={() => setDrawMode(1)}
              />
              Draw 1
            </label>
            <label>
              <input
                type="radio"
                name="drawMode"
                value="3"
                checked={drawMode === 3}
                onChange={() => setDrawMode(3)}
              />
              Draw 3
            </label>
          </div>
        </div>

        <div className="dialog-field">
          <label>Scoring</label>
          <div className="dialog-radio-group">
            <label>
              <input
                type="radio"
                name="scoringMode"
                value="standard"
                checked={scoringMode === 'standard'}
                onChange={() => setScoringMode('standard')}
              />
              Standard
            </label>
            <label>
              <input
                type="radio"
                name="scoringMode"
                value="vegas"
                checked={scoringMode === 'vegas'}
                onChange={() => setScoringMode('vegas')}
              />
              Vegas
            </label>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="klondike-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="klondike-btn klondike-btn--primary" onClick={handleConfirm}>
            Deal
          </button>
        </div>
      </div>
    </div>
  );
}

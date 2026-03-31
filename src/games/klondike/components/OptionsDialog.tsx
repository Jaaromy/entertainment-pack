import { useState } from 'react';
import type { DrawMode, ScoringMode } from '../types';

interface OptionsDialogProps {
  drawMode: DrawMode;
  scoringMode: ScoringMode;
  cardSize: 'normal' | 'large';
  onConfirm: (drawMode: DrawMode, scoringMode: ScoringMode, cardSize: 'normal' | 'large') => void;
  onResetWinnings: () => void;
  onClose: () => void;
}

export default function OptionsDialog({ drawMode, scoringMode, cardSize, onConfirm, onResetWinnings, onClose }: OptionsDialogProps) {
  const [dm, setDm] = useState<DrawMode>(drawMode);
  const [sm, setSm] = useState<ScoringMode>(scoringMode);
  const [cs, setCs] = useState<'normal' | 'large'>(cardSize);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={e => e.stopPropagation()}>
        <h3>Options</h3>

        <div className="dialog-field">
          <label>Draw Mode</label>
          <div className="dialog-radio-group">
            <label>
              <input type="radio" name="drawMode" checked={dm === 1} onChange={() => setDm(1)} />
              Draw 1
            </label>
            <label>
              <input type="radio" name="drawMode" checked={dm === 3} onChange={() => setDm(3)} />
              Draw 3
            </label>
          </div>
        </div>

        <div className="dialog-field">
          <label>Scoring</label>
          <div className="dialog-radio-group">
            <label>
              <input type="radio" name="scoringMode" checked={sm === 'standard'} onChange={() => setSm('standard')} />
              Standard
            </label>
            <label>
              <input type="radio" name="scoringMode" checked={sm === 'vegas'} onChange={() => setSm('vegas')} />
              Vegas
            </label>
          </div>
        </div>

        <div className="dialog-field">
          <label>Card Size</label>
          <div className="dialog-radio-group">
            <label>
              <input type="radio" name="cardSize" checked={cs === 'normal'} onChange={() => setCs('normal')} />
              Normal
            </label>
            <label>
              <input type="radio" name="cardSize" checked={cs === 'large'} onChange={() => setCs('large')} />
              Large
            </label>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="klondike-btn" onClick={onResetWinnings}>Reset Winnings</button>
          <button className="klondike-btn" onClick={onClose}>Cancel</button>
          <button className="klondike-btn klondike-btn--primary" onClick={() => onConfirm(dm, sm, cs)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

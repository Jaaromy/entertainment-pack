import { useState } from 'react';
import type { DrawMode, ScoringMode } from '../types';

interface OptionsDialogProps {
  drawMode: DrawMode;
  scoringMode: ScoringMode;
  cardSize: 'normal' | 'large';
  onConfirm: (drawMode: DrawMode, scoringMode: ScoringMode, cardSize: 'normal' | 'large') => void;
  onResetWinnings: (drawMode: DrawMode, scoringMode: ScoringMode) => void;
  onClose: () => void;
}

function RadioGroup<T extends string | number>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="dialog-radio-group">
      {options.map((opt) => (
        <label key={String(opt.value)}>
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
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
          <RadioGroup<DrawMode>
            name="drawMode"
            value={dm}
            onChange={setDm}
            options={[
              { value: 1, label: 'Draw 1' },
              { value: 3, label: 'Draw 3' },
            ]}
          />
        </div>

        <div className="dialog-field">
          <label>Scoring</label>
          <RadioGroup<ScoringMode>
            name="scoringMode"
            value={sm}
            onChange={setSm}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'vegas', label: 'Vegas' },
            ]}
          />
        </div>

        <div className="dialog-field">
          <label>Card Size</label>
          <RadioGroup<'normal' | 'large'>
            name="cardSize"
            value={cs}
            onChange={setCs}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'large', label: 'Large' },
            ]}
          />
        </div>

        <div className="dialog-actions">
          <button className="klondike-btn" onClick={() => onResetWinnings(dm, sm)}>Reset Winnings</button>
          <button className="klondike-btn" onClick={onClose}>Cancel</button>
          <button className="klondike-btn klondike-btn--primary" onClick={() => onConfirm(dm, sm, cs)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { BlackjackOptions } from '../types';

interface BlackjackOptionsDialogProps {
  options: BlackjackOptions;
  cardSize: 'normal' | 'large';
  onConfirm: (options: Partial<BlackjackOptions>, cardSize: 'normal' | 'large') => void;
  onCancel: () => void;
}

export default function BlackjackOptionsDialog({
  options,
  cardSize,
  onConfirm,
  onCancel,
}: BlackjackOptionsDialogProps) {
  const [deckCount, setDeckCount] = useState<number>(options.deckCount);
  const [size, setSize] = useState(cardSize);

  const handleConfirm = () => {
    onConfirm({ deckCount }, size);
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={e => e.stopPropagation()}>
        <h3>Options</h3>

        <div className="dialog-field">
          <label>Deck count</label>
          <div className="dialog-radio-group">
            {[1, 2, 4, 6, 8].map(n => (
              <label key={n}>
                <input
                  type="radio"
                  name="deckCount"
                  value={n}
                  checked={deckCount === n}
                  onChange={() => setDeckCount(n)}
                />
                {n}
              </label>
            ))}
          </div>
        </div>

        <div className="dialog-field">
          <label>Card size</label>
          <div className="dialog-radio-group">
            <label>
              <input type="radio" name="cardSize" value="normal" checked={size === 'normal'} onChange={() => setSize('normal')} />
              Normal
            </label>
            <label>
              <input type="radio" name="cardSize" value="large" checked={size === 'large'} onChange={() => setSize('large')} />
              Large
            </label>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="bj-btn bj-btn--secondary" onClick={onCancel}>Cancel</button>
          <button className="bj-btn bj-btn--primary klondike-btn--primary" onClick={handleConfirm}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

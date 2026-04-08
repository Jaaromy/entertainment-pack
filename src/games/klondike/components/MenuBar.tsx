import { useState, useEffect, useRef } from 'react';

interface MenuBarProps {
  canUndo: boolean;
  score: string;
  onDeal: () => void;
  onUndo: () => void;
  onOptions: () => void;
  onStats: () => void;
  onGallery: () => void;
  onHome?: () => void;
}

export default function MenuBar({ canUndo, score, onDeal, onUndo, onOptions, onStats, onGallery, onHome }: MenuBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div className="menu-bar">
      <div className="menu-bar-left">
      <div className="menu-bar-inner" ref={ref}>
        <button
          className={`menu-deal-button${open ? ' menu-deal-button--open' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          Game
        </button>
        {open && (
          <div className="menu-dropdown">
            <button className="menu-option" onClick={() => pick(onDeal)}>Deal</button>
            <div className="menu-divider" />
            <button className="menu-option" onClick={() => pick(onOptions)}>Options</button>
            <div className="menu-divider" />
            <button className="menu-option" onClick={() => pick(onStats)}>Stats</button>
            <button className="menu-option" onClick={() => pick(onGallery)}>Card Gallery</button>
            {onHome && <>
              <div className="menu-divider" />
              <button className="menu-option" onClick={() => pick(onHome)}>All Games</button>
            </>}
          </div>
        )}
      </div>
      <button className="menu-deal-button" onClick={onUndo} disabled={!canUndo}>Undo</button>
      </div>
      <span className="menu-score">{score}</span>
    </div>
  );
}

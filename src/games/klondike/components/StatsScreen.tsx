import { loadStats } from '../storage';
import type { ModeStats } from '../storage';
import type { DrawMode, ScoringMode } from '../types';

interface ModeConfig {
  drawMode: DrawMode;
  scoringMode: ScoringMode;
  label: string;
}

const MODES: ModeConfig[] = [
  { drawMode: 1, scoringMode: 'standard', label: 'Draw 1 – Standard' },
  { drawMode: 1, scoringMode: 'vegas',    label: 'Draw 1 – Vegas'    },
  { drawMode: 3, scoringMode: 'standard', label: 'Draw 3 – Standard' },
  { drawMode: 3, scoringMode: 'vegas',    label: 'Draw 3 – Vegas'    },
];

const EMPTY: ModeStats = { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, bestStreak: 0, bestScore: 0 };

function winRate(s: ModeStats): string {
  if (s.gamesPlayed === 0) return '—';
  return `${Math.round((s.gamesWon / s.gamesPlayed) * 100)}%`;
}

export default function StatsScreen() {
  const all = loadStats();

  return (
    <div className="stats-screen">
      <h2 className="stats-title">Statistics</h2>
      <div className="stats-grid">
        {MODES.map(({ drawMode, scoringMode, label }) => {
          const key = `${drawMode}-${scoringMode}`;
          const s: ModeStats = all[key] ?? EMPTY;
          return (
            <div key={key} className="stats-card">
              <div className="stats-card-title">{label}</div>
              <div className="stats-rows">
                <StatRow label="Played"         value={s.gamesPlayed === 0 ? '—' : String(s.gamesPlayed)} />
                <StatRow label="Won"            value={s.gamesWon === 0 && s.gamesPlayed === 0 ? '—' : String(s.gamesWon)} />
                <StatRow label="Win rate"       value={winRate(s)} />
                <StatRow label="Best score"     value={s.gamesWon === 0 ? '—' : String(s.bestScore)} />
                <StatRow label="Best streak"    value={s.bestStreak === 0 ? '—' : String(s.bestStreak)} />
                <StatRow label="Current streak" value={s.currentStreak === 0 ? '—' : String(s.currentStreak)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

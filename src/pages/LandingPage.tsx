import type { Route } from '../router/useHashRoute';

interface LandingPageProps {
  onSelect: (route: Route) => void;
}

interface GameCardProps {
  title: string;
  description: string;
  badge?: string;
  onPlay: () => void;
}

function GameCard({ title, description, badge, onPlay }: GameCardProps) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 16,
      padding: '28px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 240,
      flex: '1 1 240px',
      maxWidth: 320,
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{title}</div>
      <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, flex: 1 }}>
        {description}
      </div>
      {badge && (
        <div style={{ fontSize: '0.8rem', color: '#ffd600', fontWeight: 600 }}>{badge}</div>
      )}
      <button
        onClick={onPlay}
        style={{
          marginTop: 8,
          background: 'rgba(255,214,0,0.2)',
          border: '1px solid #ffd600',
          color: '#ffd600',
          borderRadius: 8,
          padding: '8px 20px',
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Play
      </button>
    </div>
  );
}

export default function LandingPage({ onSelect }: LandingPageProps) {
  // Read balance/stats from localStorage for display — no parsing of full game state
  let bjBalance: number | null = null;
  try {
    const raw = localStorage.getItem('ep:bj:balance');
    if (raw !== null) bjBalance = JSON.parse(raw) as number;
  } catch { /* ignore */ }

  let klondikeBestScore: number | null = null;
  try {
    const raw = localStorage.getItem('ep:stats');
    if (raw) {
      const stats = JSON.parse(raw) as Record<string, { bestScore: number | null }>;
      const scores = Object.values(stats).map(m => m.bestScore).filter((s): s is number => s !== null);
      if (scores.length > 0) klondikeBestScore = Math.max(...scores);
    }
  } catch { /* ignore */ }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#007800',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      gap: 32,
      touchAction: 'manipulation',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '2.2rem',
          fontWeight: 800,
          color: '#fff',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          letterSpacing: '-0.02em',
        }}>
          Entertainment Pack
        </div>
        <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
          Choose a game
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
        <GameCard
          title="Klondike Solitaire"
          description="Classic solitaire. Draw 1 or 3, Standard or Vegas scoring."
          badge={klondikeBestScore !== null ? `Best score: ${klondikeBestScore}` : undefined}
          onPlay={() => onSelect('/klondike')}
        />
        <GameCard
          title="Blackjack"
          description="Vegas-style blackjack. 4-deck shoe, 3:2 natural. Hit, stand, double, split."
          badge={bjBalance !== null ? `Balance: $${bjBalance}` : undefined}
          onPlay={() => onSelect('/blackjack')}
        />
      </div>
    </div>
  );
}

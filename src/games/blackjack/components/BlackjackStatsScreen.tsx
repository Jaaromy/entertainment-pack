import { loadBlackjackStats } from '../storage';
import { BLACKJACK_INITIAL_BALANCE } from '../constants';

interface BlackjackStatsScreenProps {
  onBack: () => void;
}

export default function BlackjackStatsScreen({ onBack }: BlackjackStatsScreenProps) {
  const stats = loadBlackjackStats();
  const netProfit = stats.peakBalance - stats.initialBalance;
  const winPct = stats.handsPlayed > 0
    ? Math.round((stats.handsWon / stats.handsPlayed) * 100)
    : 0;

  return (
    <div className="stats-screen">
      <button className="menu-back-btn" onClick={onBack}>← Back</button>
      <div className="stats-title">Blackjack Stats</div>
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-card-title">Hands</div>
          <div className="stats-rows">
            <div className="stat-row">
              <span className="stat-label">Played</span>
              <span className="stat-value">{stats.handsPlayed}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Won</span>
              <span className="stat-value">{stats.handsWon}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Lost</span>
              <span className="stat-value">{stats.handsLost}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Push</span>
              <span className="stat-value">{stats.handsPush}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Win %</span>
              <span className="stat-value">{winPct}%</span>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-title">Money</div>
          <div className="stats-rows">
            <div className="stat-row">
              <span className="stat-label">Peak Balance</span>
              <span className="stat-value">${stats.peakBalance}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Net Profit</span>
              <span className="stat-value" style={{ color: netProfit >= 0 ? '#4cde6a' : '#ff5a5a' }}>
                {netProfit >= 0 ? '+' : ''}${netProfit}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Biggest Win</span>
              <span className="stat-value">${stats.biggestWin}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Biggest Loss</span>
              <span className="stat-value">${Math.abs(stats.biggestLoss)}</span>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-title">Special</div>
          <div className="stats-rows">
            <div className="stat-row">
              <span className="stat-label">Blackjacks</span>
              <span className="stat-value">{stats.blackjacks}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Starting Balance</span>
              <span className="stat-value">${BLACKJACK_INITIAL_BALANCE}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

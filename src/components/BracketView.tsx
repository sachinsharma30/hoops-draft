import { useDraft } from '../state/DraftContext';

export function BracketView() {
  const { bracket, dispatch } = useDraft();
  if (!bracket) return null;

  return (
    <div className="card">
      <div className="draft-header">
        <h2>Bracket Results</h2>
        <button className="secondary-btn" onClick={() => dispatch({ type: 'RESET' })}>
          Start Over
        </button>
      </div>

      <div className="champion-banner">
        🏆 Champion: <strong>{bracket.champion.name}</strong>
      </div>

      <div className="bracket-rounds">
        {bracket.rounds.map((round, i) => (
          <div key={i} className="bracket-round">
            <h3>{roundName(i, bracket.rounds.length)}</h3>
            {round.map((series, j) => (
              <div key={j} className={`series-card ${series.teamA.isUser || series.teamB.isUser ? 'user-series' : ''}`}>
                <div className={`series-team ${series.winner.id === series.teamA.id ? 'winner' : ''}`}>
                  <span>{series.teamA.name}</span>
                  <span className="series-wins">{series.teamAWins}</span>
                </div>
                <div className={`series-team ${series.winner.id === series.teamB.id ? 'winner' : ''}`}>
                  <span>{series.teamB.name}</span>
                  <span className="series-wins">{series.teamBWins}</span>
                </div>
                <div className="game-scores">
                  {series.games.map((g) => (
                    <span key={g.gameNumber} className="game-score">
                      {g.teamAScore}-{g.teamBScore}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function roundName(index: number, total: number): string {
  const fromEnd = total - index;
  if (fromEnd === 1) return 'Finals';
  if (fromEnd === 2) return 'Semifinals';
  if (fromEnd === 3) return 'Quarterfinals';
  return `Round ${index + 1}`;
}

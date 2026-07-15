import { teamRating } from '../lib/rating';
import { useDraft } from '../state/DraftContext';

export function TeamsOverview() {
  const { teams, dispatch } = useDraft();

  const ranked = [...teams]
    .map((team) => ({ team, breakdown: teamRating(team) }))
    .sort((a, b) => b.breakdown.overall - a.breakdown.overall);

  return (
    <div className="card">
      <div className="draft-header">
        <h2>Draft Complete — Teams</h2>
        <button className="primary-btn" onClick={() => dispatch({ type: 'SIMULATE_BRACKET' })}>
          Simulate Bracket
        </button>
      </div>

      <div className="teams-grid">
        {ranked.map(({ team, breakdown }, i) => (
          <div key={team.id} className={`team-card ${team.isUser ? 'user-team' : ''}`}>
            <div className="team-card-header">
              <span className="rank">#{i + 1}</span>
              <h3>{team.name}</h3>
              <span className="rating-pill">{breakdown.overall.toFixed(0)} pwr</span>
            </div>
            <div className="fit-breakdown">
              <span>Talent {breakdown.coreTalent.toFixed(0)}</span>
              <span>Pos Fit {(breakdown.positionFit * 100).toFixed(0)}%</span>
              <span>Balance {(breakdown.balanceFit * 100).toFixed(0)}%</span>
              <span>Depth +{breakdown.depth.toFixed(0)}</span>
            </div>
            <ol className="roster-list compact">
              {team.players.map((p) => (
                <li key={p.id}>
                  {p.name} <span className="dim">({p.pos}, {p.ppg.toFixed(1)} ppg)</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

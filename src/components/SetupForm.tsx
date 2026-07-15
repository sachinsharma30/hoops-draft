import { useState } from 'react';
import playersData from '../data/players.json';
import { useDraft } from '../state/DraftContext';

export function SetupForm() {
  const { dispatch } = useDraft();
  const [numTeams, setNumTeams] = useState(8);
  const [playersPerTeam, setPlayersPerTeam] = useState(8);
  const [userTeamIndex, setUserTeamIndex] = useState(0);

  const poolSize = (playersData as unknown[]).length;
  const maxPossible = Math.floor(poolSize / numTeams);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({
      type: 'START_DRAFT',
      settings: { numTeams, playersPerTeam, userTeamIndex },
    });
  }

  return (
    <div className="card setup-card">
      <h1>🏀 Hoops Draft Sim</h1>
      <p className="subtitle">
        Draft from a live pool of {poolSize} current NBA players, then simulate a best-of-7
        bracket to crown a champion.
      </p>
      <form onSubmit={handleSubmit} className="setup-form">
        <label>
          Number of teams
          <input
            type="number"
            min={2}
            max={30}
            value={numTeams}
            onChange={(e) => setNumTeams(Number(e.target.value))}
          />
        </label>

        <label>
          Players per team
          <input
            type="number"
            min={5}
            max={Math.max(5, maxPossible)}
            value={playersPerTeam}
            onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
          />
        </label>

        <label>
          Your team
          <select value={userTeamIndex} onChange={(e) => setUserTeamIndex(Number(e.target.value))}>
            {Array.from({ length: numTeams }, (_, i) => (
              <option key={i} value={i}>
                Team {i + 1}
              </option>
            ))}
          </select>
        </label>

        <label>
          Player pool
          <select disabled value="current">
            <option value="current">All current NBA players ({poolSize})</option>
          </select>
        </label>

        <button type="submit" className="primary-btn">
          Start Draft
        </button>
      </form>
    </div>
  );
}

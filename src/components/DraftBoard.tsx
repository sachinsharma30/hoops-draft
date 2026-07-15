import { useMemo, useState } from 'react';
import { sortPoolByRating } from '../lib/draft';
import { playerRating } from '../lib/rating';
import type { Player } from '../lib/types';
import { useDraft } from '../state/DraftContext';

export function DraftBoard() {
  const draft = useDraft();
  const { teams, pool, dispatch, isUserTurn, pickNumber, totalPicks, currentTeamId, lastPick, settings } =
    draft;
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');

  const ranked = useMemo(() => sortPoolByRating(pool), [pool]);
  const filtered = useMemo(() => {
    return ranked.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesPos = posFilter === 'ALL' || p.pos === posFilter;
      return matchesSearch && matchesPos;
    });
  }, [ranked, search, posFilter]);

  const userTeam = teams.find((t) => t.id === settings.userTeamIndex)!;
  const currentTeam = teams.find((t) => t.id === currentTeamId);

  function draftPlayer(p: Player) {
    if (!isUserTurn) return;
    dispatch({ type: 'USER_PICK', player: p });
  }

  return (
    <div className="draft-layout">
      <div className="card">
        <div className="draft-header">
          <h2>Draft Board</h2>
          <div className="pick-status">
            Pick {Math.min(pickNumber, totalPicks)} of {totalPicks} —{' '}
            {isUserTurn ? (
              <span className="your-turn">Your pick!</span>
            ) : (
              <span>{currentTeam?.name} is picking…</span>
            )}
          </div>
          <button className="secondary-btn" onClick={() => dispatch({ type: 'AUTO_DRAFT_REST' })}>
            Auto-draft rest
          </button>
        </div>

        {lastPick && (
          <div className="last-pick">
            Last pick: <strong>{lastPick.player.name}</strong> ({lastPick.player.pos},{' '}
            {lastPick.player.team}) → {teams.find((t) => t.id === lastPick.teamId)?.name}
          </div>
        )}

        <div className="filters">
          <input
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
            <option value="ALL">All positions</option>
            <option value="PG">PG</option>
            <option value="SG">SG</option>
            <option value="SF">SF</option>
            <option value="PF">PF</option>
            <option value="C">C</option>
          </select>
        </div>

        <div className="player-table-wrap">
          <table className="player-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Pos</th>
                <th>Team</th>
                <th>PPG</th>
                <th>RPG</th>
                <th>APG</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.pos}</td>
                  <td>{p.team}</td>
                  <td>{p.ppg.toFixed(1)}</td>
                  <td>{p.rpg.toFixed(1)}</td>
                  <td>{p.apg.toFixed(1)}</td>
                  <td>{playerRating(p).toFixed(1)}</td>
                  <td>
                    <button
                      className="draft-btn"
                      disabled={!isUserTurn}
                      onClick={() => draftPlayer(p)}
                    >
                      Draft
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card roster-card">
        <h3>{userTeam.name}</h3>
        <ol className="roster-list">
          {userTeam.players.map((p) => (
            <li key={p.id}>
              {p.name} <span className="dim">({p.pos})</span>
            </li>
          ))}
          {Array.from({ length: settings.playersPerTeam - userTeam.players.length }).map((_, i) => (
            <li key={`empty-${i}`} className="empty-slot">
              —
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

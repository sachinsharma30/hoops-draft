import { useMemo, useState } from 'react';
import { sortPoolByRating } from '../lib/draft';
import { playerRating } from '../lib/rating';
import type { Player } from '../lib/types';
import { useDraft } from '../state/DraftContext';

type SortKey = 'name' | 'pos' | 'team' | 'ppg' | 'rpg' | 'apg' | 'rating';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Player' },
  { key: 'pos', label: 'Pos' },
  { key: 'team', label: 'Team' },
  { key: 'ppg', label: 'PPG' },
  { key: 'rpg', label: 'RPG' },
  { key: 'apg', label: 'APG' },
  { key: 'rating', label: 'Rating' },
];

function sortValue(p: Player, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return p.name;
    case 'pos':
      return p.pos;
    case 'team':
      return p.team;
    case 'ppg':
      return p.ppg;
    case 'rpg':
      return p.rpg;
    case 'apg':
      return p.apg;
    case 'rating':
      return playerRating(p);
  }
}

export function DraftBoard() {
  const draft = useDraft();
  const { teams, pool, dispatch, isUserTurn, pickNumber, totalPicks, currentTeamId, picks, settings } = draft;
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'pos' || key === 'team' ? 'asc' : 'desc');
    }
  }

  const ranked = useMemo(() => sortPoolByRating(pool), [pool]);
  const filtered = useMemo(() => {
    const rows = ranked.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesPos = posFilter === 'ALL' || p.pos === posFilter;
      return matchesSearch && matchesPos;
    });
    const sorted = [...rows].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [ranked, search, posFilter, sortKey, sortDir]);

  const userTeam = teams.find((t) => t.id === settings.userTeamIndex)!;
  const currentTeam = teams.find((t) => t.id === currentTeamId);

  function draftPlayer(p: Player) {
    if (!isUserTurn) return;
    dispatch({ type: 'USER_PICK', player: p });
  }

  return (
    <div className="draft-page">
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
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="sortable-th"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                      )}
                    </th>
                  ))}
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

        <div className="draft-sidebar">
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

          <div className="card history-card">
            <h3>Draft History</h3>
            <div className="history-list">
              {picks.length === 0 && <p className="dim">No picks yet.</p>}
              {[...picks].reverse().map((pick) => (
                <div key={pick.overallPick} className="history-row">
                  <span className="history-pick-num">
                    R{pick.round}.{String(pick.pickInRound).padStart(2, '0')}
                  </span>
                  <span className="history-player">{pick.player.name}</span>
                  <span className="dim history-team">
                    → {teams.find((t) => t.id === pick.teamId)?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>All Teams</h3>
        <div className="teams-grid draft-teams-grid">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`team-card compact ${team.isUser ? 'user-team' : ''} ${
                team.id === currentTeamId ? 'on-clock' : ''
              }`}
            >
              <div className="team-card-header">
                <h3>{team.name}</h3>
                {team.id === currentTeamId && <span className="on-clock-pill">On the clock</span>}
              </div>
              <ol className="roster-list compact">
                {team.players.map((p) => (
                  <li key={p.id}>
                    {p.name} <span className="dim">({p.pos})</span>
                  </li>
                ))}
                {Array.from({ length: settings.playersPerTeam - team.players.length }).map((_, i) => (
                  <li key={`empty-${i}`} className="empty-slot">
                    —
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

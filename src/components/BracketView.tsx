import { useMemo, useState } from 'react';
import type { Matchup } from '../lib/types';
import { useDraft } from '../state/DraftContext';

const ROW_UNIT = 60;
const COL_WIDTH = 210;
const COL_GAP = 64;
const CARD_HEIGHT = 68;

interface PositionedMatch {
  roundIdx: number;
  matchIdx: number;
  match: Matchup;
  top: number;
  centerY: number;
}

function roundName(index: number, total: number): string {
  const fromEnd = total - index;
  if (fromEnd === 1) return 'Finals';
  if (fromEnd === 2) return 'Semifinals';
  if (fromEnd === 3) return 'Quarterfinals';
  return `Round ${index + 1}`;
}

export function BracketView() {
  const { bracket, dispatch } = useDraft();
  const [selected, setSelected] = useState<{ r: number; i: number } | null>(null);

  const layout = useMemo(() => {
    if (!bracket) return null;
    const rounds = bracket.rounds;
    const totalRows = rounds[0].length * 2;
    const positioned: PositionedMatch[][] = rounds.map((round, r) => {
      const rowSpan = 2 ** (r + 1);
      return round.map((match, i) => {
        const rowStart = i * rowSpan;
        const centerY = (rowStart + rowSpan / 2) * ROW_UNIT;
        return { roundIdx: r, matchIdx: i, match, top: centerY - CARD_HEIGHT / 2, centerY };
      });
    });

    const connectors: { key: string; points: string }[] = [];
    for (let r = 0; r < rounds.length - 1; r++) {
      for (let i = 0; i < positioned[r].length; i += 2) {
        const a = positioned[r][i];
        const b = positioned[r][i + 1];
        const x1 = r * (COL_WIDTH + COL_GAP) + COL_WIDTH;
        const xMid = x1 + COL_GAP / 2;
        const yMid = (a.centerY + b.centerY) / 2;
        connectors.push({ key: `${r}-${i}-a`, points: `${x1},${a.centerY} ${xMid},${a.centerY}` });
        connectors.push({ key: `${r}-${i}-b`, points: `${x1},${b.centerY} ${xMid},${b.centerY}` });
        connectors.push({ key: `${r}-${i}-v`, points: `${xMid},${a.centerY} ${xMid},${b.centerY}` });
        connectors.push({
          key: `${r}-${i}-out`,
          points: `${xMid},${yMid} ${x1 + COL_GAP},${yMid}`,
        });
      }
    }

    return {
      totalRows,
      width: rounds.length * COL_WIDTH + (rounds.length - 1) * COL_GAP,
      height: totalRows * ROW_UNIT,
      positioned,
      connectors,
    };
  }, [bracket]);

  if (!bracket || !layout) return null;

  const activeRoundIdx = bracket.rounds.findIndex((round) => round.some((m) => !m.result));
  const selectedMatch =
    selected != null ? bracket.rounds[selected.r]?.[selected.i] ?? null : null;

  return (
    <div className="card">
      <div className="draft-header">
        <h2>Bracket</h2>
        {!bracket.champion && activeRoundIdx >= 0 && (
          <>
            <button className="secondary-btn" onClick={() => dispatch({ type: 'SIM_NEXT_SERIES' })}>
              Simulate Next Series
            </button>
            <button
              className="secondary-btn"
              onClick={() => dispatch({ type: 'SIM_ROUND', roundIdx: activeRoundIdx })}
            >
              Simulate Rest of {roundName(activeRoundIdx, bracket.rounds.length)}
            </button>
            <button className="primary-btn" onClick={() => dispatch({ type: 'SIM_ALL' })}>
              Simulate Entire Bracket
            </button>
          </>
        )}
        <button className="secondary-btn" onClick={() => dispatch({ type: 'RESET' })}>
          Start Over
        </button>
      </div>

      {bracket.champion && (
        <div className="champion-banner">
          🏆 Champion: <strong>{bracket.champion.name}</strong>
        </div>
      )}

      <div className="bracket-scroll">
        <div className="bracket-canvas" style={{ width: layout.width, height: layout.height }}>
          <svg className="bracket-lines" width={layout.width} height={layout.height}>
            {layout.connectors.map((c) => (
              <polyline key={c.key} points={c.points} className="bracket-line" />
            ))}
          </svg>

          {bracket.rounds.map((_, r) => (
            <div
              key={r}
              className="bracket-round-label"
              style={{ left: r * (COL_WIDTH + COL_GAP), width: COL_WIDTH }}
            >
              {roundName(r, bracket.rounds.length)}
            </div>
          ))}

          {layout.positioned.map((round) =>
            round.map(({ roundIdx, matchIdx, match, top }) => {
              const playable = !!(match.teamA && match.teamB && !match.result);
              const isSelected = selected?.r === roundIdx && selected?.i === matchIdx;
              return (
                <div
                  key={`${roundIdx}-${matchIdx}`}
                  className={`bracket-match ${match.result || match.isBye ? 'resolved' : ''} ${
                    isSelected ? 'selected' : ''
                  }`}
                  style={{ left: roundIdx * (COL_WIDTH + COL_GAP), top, width: COL_WIDTH, height: CARD_HEIGHT }}
                  role={match.result ? 'button' : undefined}
                  aria-label={
                    match.result
                      ? `${match.teamA?.name} vs ${match.teamB?.name}, view series detail`
                      : undefined
                  }
                  onClick={() => (match.result ? setSelected({ r: roundIdx, i: matchIdx }) : undefined)}
                >
                  <div className={`bracket-slot ${match.winner && match.winner === match.teamA ? 'winner' : ''}`}>
                    <span className="bracket-team-name">{match.teamA?.name ?? 'TBD'}</span>
                    {match.result && <span className="bracket-wins">{match.result.teamAWins}</span>}
                  </div>
                  <div className={`bracket-slot ${match.winner && match.winner === match.teamB ? 'winner' : ''}`}>
                    <span className="bracket-team-name">
                      {match.isBye ? 'BYE' : match.teamB?.name ?? 'TBD'}
                    </span>
                    {match.result && <span className="bracket-wins">{match.result.teamBWins}</span>}
                  </div>
                  {playable && <div className="bracket-ready-dot" title="Ready to simulate" />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedMatch?.result && (
        <div className="series-detail">
          <h3>
            {selectedMatch.result.teamA.name} vs {selectedMatch.result.teamB.name} —{' '}
            {selectedMatch.result.teamAWins}-{selectedMatch.result.teamBWins}
          </h3>
          <div className="game-scores">
            {selectedMatch.result.games.map((g) => (
              <span key={g.gameNumber} className="game-score">
                G{g.gameNumber}: {g.teamAScore}-{g.teamBScore}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

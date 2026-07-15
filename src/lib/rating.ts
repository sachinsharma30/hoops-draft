import type { FantasyTeam, Player, Position } from './types';

/**
 * Single-number value score for a player, used for draft-board ranking
 * and as the raw talent input to team rating. Weights approximate
 * standard categories-league value (scoring, playmaking, D, efficiency).
 */
export function playerRating(p: Player): number {
  const efficiency =
    (p.fgPct - 0.45) * 100 * 0.6 +
    (p.fg3Pct - 0.35) * 100 * 0.35 +
    (p.ftPct - 0.75) * 100 * 0.2;

  return (
    p.ppg * 1.0 +
    p.rpg * 1.15 +
    p.apg * 1.5 +
    p.spg * 3.0 +
    p.bpg * 3.0 -
    p.topg * 1.0 +
    p.mpg * 0.4 +
    efficiency
  );
}

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export interface TeamRatingBreakdown {
  overall: number;
  coreTalent: number;
  positionFit: number;
  balanceFit: number;
  depth: number;
  distinctPositions: number;
}

/**
 * Team strength blends raw talent of the starting unit with roster "fit":
 * positional coverage, scoring balance, and bench depth (rotation matters
 * over a 7-game series, not just a single closer).
 */
export function teamRating(team: FantasyTeam): TeamRatingBreakdown {
  const ranked = [...team.players].sort((a, b) => playerRating(b) - playerRating(a));
  const starterCount = Math.min(5, ranked.length);
  const starters = ranked.slice(0, starterCount);
  const bench = ranked.slice(starterCount);

  const coreTalent = starters.reduce((sum, p) => sum + playerRating(p), 0);

  const distinctPositions = new Set(
    starters.map((p) => (POSITIONS.includes(p.pos as Position) ? p.pos : 'SF'))
  ).size;
  const positionFit = 0.9 + 0.02 * distinctPositions;

  const meanPpg = starters.reduce((s, p) => s + p.ppg, 0) / (starterCount || 1);
  const variance =
    starters.reduce((s, p) => s + (p.ppg - meanPpg) ** 2, 0) / (starterCount || 1);
  const cv = meanPpg > 0 ? Math.sqrt(variance) / meanPpg : 0;
  const balanceFit = 1.06 - Math.min(cv, 0.6) * 0.1;

  const depth =
    bench.length > 0
      ? (bench.reduce((s, p) => s + playerRating(p), 0) / bench.length) * 0.4 * Math.min(bench.length, 6)
      : 0;

  const overall = coreTalent * positionFit * balanceFit + depth;

  return { overall, coreTalent, positionFit, balanceFit, depth, distinctPositions };
}

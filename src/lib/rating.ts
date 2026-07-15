import type { FantasyTeam, Player, Position } from './types';

// 2025-26 NBA league-average shooting splits, used as the baseline for
// efficiency value below. Sourced from the same per-game stats table as
// the player pool.
const LEAGUE_AVG_FG2_PCT = 0.55;
const LEAGUE_AVG_FG3_PCT = 0.36;
const LEAGUE_AVG_FT_PCT = 0.783;

// A player needs to have appeared in roughly this many games before their
// rate stats are trusted at full weight. Below that, the rating regresses
// toward a replacement-level baseline so a hot 5-game stretch (or a
// 0-for-0 shooting split that scores as "100%") can't outrank a full
// season of production.
const RELIABLE_GAMES = 25;
const REPLACEMENT_LEVEL = 20;

/**
 * Single-number value score for a player, used for draft-board ranking
 * and as the raw talent input to team rating. Weights approximate
 * standard categories-league value (scoring, playmaking, D, efficiency).
 */
export function playerRating(p: Player): number {
  // Points scored above/below what a league-average shooter would produce
  // on the same shot volume — weighting by attempts means a small number
  // of makes (or a 0-attempt "100%" split) can't swing the score the way
  // a raw percentage bonus would.
  const efficiency =
    (p.fg2Pct - LEAGUE_AVG_FG2_PCT) * p.fg2aPg * 2 +
    (p.fg3Pct - LEAGUE_AVG_FG3_PCT) * p.fg3aPg * 3 +
    (p.ftPct - LEAGUE_AVG_FT_PCT) * p.ftaPg;

  const raw =
    p.ppg * 1.0 +
    p.rpg * 1.15 +
    p.apg * 1.5 +
    p.spg * 3.0 +
    p.bpg * 3.0 -
    p.topg * 1.0 +
    p.mpg * 0.4 +
    efficiency;

  const reliability = Math.min(1, p.gp / RELIABLE_GAMES);
  return raw * reliability + REPLACEMENT_LEVEL * (1 - reliability);
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

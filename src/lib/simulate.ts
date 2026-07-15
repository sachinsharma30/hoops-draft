import { teamRating } from './rating';
import type { BracketState, FantasyTeam, Matchup, SeriesGameResult, SeriesResult } from './types';

function gaussianRandom(mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * std;
}

const BASELINE_SCORE = 104;
const RATING_TO_POINTS = 0.15;
const NOISE_STD = 10;

function simulateGame(
  gameNumber: number,
  teamA: FantasyTeam,
  teamB: FantasyTeam,
  ratingA: number,
  ratingB: number
): SeriesGameResult {
  let scoreA = Math.round(BASELINE_SCORE + ratingA * RATING_TO_POINTS + gaussianRandom(0, NOISE_STD));
  let scoreB = Math.round(BASELINE_SCORE + ratingB * RATING_TO_POINTS + gaussianRandom(0, NOISE_STD));
  if (scoreA === scoreB) scoreA += 1; // no ties in basketball
  return {
    gameNumber,
    teamAScore: scoreA,
    teamBScore: scoreB,
    winnerTeamId: scoreA > scoreB ? teamA.id : teamB.id,
  };
}

export function simulateSeries(teamA: FantasyTeam, teamB: FantasyTeam, round: number): SeriesResult {
  const ratingA = teamRating(teamA).overall;
  const ratingB = teamRating(teamB).overall;

  const games: SeriesGameResult[] = [];
  let winsA = 0;
  let winsB = 0;
  let gameNumber = 0;

  while (winsA < 4 && winsB < 4) {
    gameNumber++;
    const game = simulateGame(gameNumber, teamA, teamB, ratingA, ratingB);
    games.push(game);
    if (game.winnerTeamId === teamA.id) winsA++;
    else winsB++;
  }

  return {
    round,
    teamA,
    teamB,
    games,
    winner: winsA > winsB ? teamA : teamB,
    teamAWins: winsA,
    teamBWins: winsB,
  };
}

/** Standard single-elimination seeding order for a bracket of size `size` (a power of 2). */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const doubled = order.length * 2 + 1;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, doubled - seed);
    }
    order = next;
  }
  return order;
}

function emptyMatchup(): Matchup {
  return { teamA: null, teamB: null, result: null, winner: null, isBye: false };
}

function advanceWinner(state: BracketState, roundIdx: number, matchIdx: number, winner: FantasyTeam) {
  if (roundIdx + 1 < state.rounds.length) {
    const nextMatch = state.rounds[roundIdx + 1][Math.floor(matchIdx / 2)];
    if (matchIdx % 2 === 0) nextMatch.teamA = winner;
    else nextMatch.teamB = winner;
  } else {
    state.champion = winner;
  }
}

function resolveByes(state: BracketState) {
  state.rounds[0].forEach((m, i) => {
    if (m.teamA && !m.teamB) {
      m.winner = m.teamA;
      m.isBye = true;
      advanceWinner(state, 0, i, m.teamA);
    } else if (m.teamB && !m.teamA) {
      m.winner = m.teamB;
      m.isBye = true;
      advanceWinner(state, 0, i, m.teamB);
    }
  });
}

/** Builds the full bracket skeleton (seeded first round, empty placeholders after) and auto-resolves byes. */
export function createBracket(teamsInput: FantasyTeam[]): BracketState {
  const seeded = [...teamsInput].sort((a, b) => teamRating(b).overall - teamRating(a).overall);
  const bracketSize = 2 ** Math.ceil(Math.log2(seeded.length));
  const order = seedOrder(bracketSize);
  const slots: (FantasyTeam | null)[] = order.map((seed) => seeded[seed - 1] ?? null);

  const rounds: Matchup[][] = [];
  let roundSize = bracketSize;
  while (roundSize >= 2) {
    rounds.push(Array.from({ length: roundSize / 2 }, emptyMatchup));
    roundSize /= 2;
  }

  for (let i = 0; i < rounds[0].length; i++) {
    rounds[0][i].teamA = slots[i * 2];
    rounds[0][i].teamB = slots[i * 2 + 1];
  }

  const state: BracketState = { rounds, champion: null };
  resolveByes(state);
  return state;
}

function cloneBracket(state: BracketState): BracketState {
  return {
    champion: state.champion,
    rounds: state.rounds.map((round) => round.map((m) => ({ ...m }))),
  };
}

function findNextPlayable(state: BracketState): { roundIdx: number; matchIdx: number } | null {
  for (let r = 0; r < state.rounds.length; r++) {
    for (let m = 0; m < state.rounds[r].length; m++) {
      const match = state.rounds[r][m];
      if (match.teamA && match.teamB && !match.result) {
        return { roundIdx: r, matchIdx: m };
      }
    }
  }
  return null;
}

/** Simulates the single next undecided series across the bracket (in round order). */
export function simulateNextSeries(state: BracketState): BracketState {
  const next = cloneBracket(state);
  const loc = findNextPlayable(next);
  if (!loc) return next;
  const match = next.rounds[loc.roundIdx][loc.matchIdx];
  const result = simulateSeries(match.teamA!, match.teamB!, loc.roundIdx + 1);
  match.result = result;
  match.winner = result.winner;
  advanceWinner(next, loc.roundIdx, loc.matchIdx, result.winner);
  return next;
}

/** Simulates every remaining series within a single round. */
export function simulateRound(state: BracketState, roundIdx: number): BracketState {
  const next = cloneBracket(state);
  for (;;) {
    const match = next.rounds[roundIdx]?.find((m) => m.teamA && m.teamB && !m.result);
    if (!match) break;
    const idx = next.rounds[roundIdx].indexOf(match);
    const result = simulateSeries(match.teamA!, match.teamB!, roundIdx + 1);
    match.result = result;
    match.winner = result.winner;
    advanceWinner(next, roundIdx, idx, result.winner);
  }
  return next;
}

/** Simulates every remaining series in the bracket through to a champion. */
export function simulateAllRemaining(state: BracketState): BracketState {
  let current = cloneBracket(state);
  while (!current.champion) {
    const loc = findNextPlayable(current);
    if (!loc) break;
    current = simulateNextSeries(current);
  }
  return current;
}
